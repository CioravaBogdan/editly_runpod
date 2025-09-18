const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// Import existing Editly functionality with better error handling
let editly;
try {
  // Try to import compiled version first
  editly = require("./dist/index.js");
  console.log("✓ Loaded Editly from dist/index.js");
} catch (error) {
  try {
    // Fallback to source
    editly = require("./src/index.ts");
    console.log("✓ Loaded Editly from src/index.ts");
  } catch (fallbackError) {
    console.warn("⚠ Could not import Editly module, using FFmpeg fallback");
    console.warn("Error details:", error.message, fallbackError.message);
  }
}

// Storage handler pentru S3/local with error handling
let storageHandler;
try {
  storageHandler = require("./storage-handler.cjs");
} catch (error) {
  console.warn("⚠ Storage handler not found, using local file system");
  storageHandler = {
    uploadToStorage: async (localPath, key) => {
      console.log(`Local file: ${localPath}`);
      return `file://${localPath}`;
    },
    downloadFromStorage: async (url, localPath) => {
      if (url.startsWith("http")) {
        // Download from URL
        const response = await fetch(url);
        const buffer = await response.buffer();
        await fs.writeFile(localPath, buffer);
      } else {
        // Copy local file
        await fs.copyFile(url, localPath);
      }
      return localPath;
    },
  };
}

const { uploadToStorage, downloadFromStorage } = storageHandler;

async function processWithEditly(editSpec, outputPath) {
  if (!editly) {
    throw new Error("Editly module not available, use FFmpeg fallback");
  }

  try {
    await editly(editSpec);
    return outputPath;
  } catch (error) {
    console.error("Editly processing failed:", error);
    throw error;
  }
}

async function processWithFFmpeg(input, outputPath) {
  const workDir = path.dirname(outputPath);

  // Create concat list for FFmpeg
  const listContent = input.images
    .map((img, i) => {
      const imagePath = img.localPath || `${workDir}/img${i}.jpg`;
      return `file '${imagePath}'\nduration ${img.duration || 5}`;
    })
    .join("\n");

  const listPath = `${workDir}/list.txt`;
  await fs.writeFile(listPath, listContent);

  // Build FFmpeg command
  const useGPU = process.env.USE_GPU === "true";
  const audioPath = input.audioPath || `${workDir}/audio.mp3`;

  const ffmpegCmd = useGPU
    ? // GPU version with NVENC
      `ffmpeg -f concat -safe 0 -i ${listPath} -i ${audioPath} ` +
      `-c:v h264_nvenc -preset p5 -cq 23 -b:v 5M -maxrate 8M -bufsize 10M ` +
      `-c:a aac -b:a 128k -shortest -y ${outputPath}`
    : // CPU version
      `ffmpeg -f concat -safe 0 -i ${listPath} -i ${audioPath} ` +
      `-c:v libx264 -preset medium -crf 23 ` +
      `-c:a aac -b:a 128k -shortest -y ${outputPath}`;

  console.log("Executing FFmpeg:", ffmpegCmd);
  await execAsync(ffmpegCmd);

  return outputPath;
}

async function handler(event) {
  console.log("RunPod Job received:", event);

  try {
    const { input } = event;
    const jobId = Date.now().toString();
    const workDir = `/tmp/job-${jobId}`;

    // Create work directory
    await fs.mkdir(workDir, { recursive: true });

    // Download assets
    console.log("Downloading assets...");
    const audioPath = await downloadFromStorage(
      input.audioUrl || input.audioFilePath,
      `${workDir}/audio.mp3`,
    );

    // Download images
    const imagePaths = [];
    const images =
      input.images ||
      input.clips?.map((clip) => ({
        url: clip.layers?.[0]?.path || clip.path,
        duration: clip.duration,
      })) ||
      [];

    for (let i = 0; i < images.length; i++) {
      const imgPath = await downloadFromStorage(
        images[i].url,
        `${workDir}/img${i}.jpg`,
      );
      imagePaths.push(imgPath);
      images[i].localPath = imgPath;
    }

    // Choose processing method
    const outputPath = `${workDir}/output.mp4`;
    const startTime = Date.now();

    let processingMethod = "ffmpeg";

    // Try Editly format first if available
    if (editly && (input.clips || input.editSpec)) {
      try {
        const editSpec = input.editSpec || {
          outPath: outputPath,
          width: input.width || 1080,
          height: input.height || 1920,
          fps: input.fps || 30,
          audioFilePath: audioPath,
          clips:
            input.clips ||
            images.map((img) => ({
              duration: img.duration || 5,
              layers: [
                {
                  type: "image",
                  path: img.localPath,
                  resizeMode: "contain",
                },
              ],
            })),
        };

        await processWithEditly(editSpec, outputPath);
        processingMethod = "editly";
      } catch (editlyError) {
        console.warn(
          "Editly failed, falling back to FFmpeg:",
          editlyError.message,
        );
        await processWithFFmpeg({ images, audioPath }, outputPath);
      }
    } else {
      // Use FFmpeg directly
      await processWithFFmpeg({ images, audioPath }, outputPath);
    }

    const processingTime = (Date.now() - startTime) / 1000;

    // Get file stats
    const stats = await fs.stat(outputPath);

    // Upload to storage
    const outputUrl = await uploadToStorage(
      outputPath,
      `outputs/${input.outputFilename || `video-${jobId}.mp4`}`,
    );

    // Cleanup
    await fs.rm(workDir, { recursive: true }).catch(console.warn);

    return {
      output: {
        videoUrl: outputUrl,
        downloadUrl: outputUrl,
        duration: processingTime,
        size: stats.size,
        processingTime: processingTime,
        method: processingMethod,
        encoder: process.env.USE_GPU === "true" ? "h264_nvenc" : "libx264",
      },
    };
  } catch (error) {
    console.error("Processing error:", error);
    return {
      error: error.message,
      stack: error.stack,
    };
  }
}

// Export handler for both RunPod and direct usage
module.exports = { handler };

// If running directly (not as module), start processing
if (require.main === module) {
  console.log("🚀 Starting Editly RunPod handler...");

  // For RunPod, we need to handle HTTP requests
  const http = require("http");

  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        try {
          const event = JSON.parse(body);
          const result = await handler(event);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("Request processing error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } else if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
        }),
      );
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });

  const port = process.env.PORT || 8000;
  server.listen(port, () => {
    console.log(`✓ Editly handler listening on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
  });
}
