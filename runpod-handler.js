const runpod = require("runpod");
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// Storage handler pentru S3/local
const { uploadToStorage, downloadFromStorage } = require("./storage-handler");

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
      input.audioUrl,
      `${workDir}/audio.mp3`,
    );

    // Download images
    const imagePaths = [];
    for (let i = 0; i < input.images.length; i++) {
      const imgPath = await downloadFromStorage(
        input.images[i].url,
        `${workDir}/img${i}.jpg`,
      );
      imagePaths.push(imgPath);
    }

    // Create concat list for FFmpeg
    const listContent = input.images
      .map(
        (img, i) =>
          `file '${workDir}/img${i}.jpg'\nduration ${img.duration || 5}`,
      )
      .join("\n");
    await fs.writeFile(`${workDir}/list.txt`, listContent);

    // Build FFmpeg command
    const outputPath = `${workDir}/output.mp4`;
    const useGPU = process.env.USE_GPU === "true";

    const ffmpegCmd = useGPU
      ? // GPU version with NVENC
        `ffmpeg -f concat -safe 0 -i ${workDir}/list.txt -i ${audioPath} ` +
        `-c:v h264_nvenc -preset p5 -cq 23 -b:v 5M -maxrate 8M -bufsize 10M ` +
        `-c:a aac -b:a 128k -shortest -y ${outputPath}`
      : // CPU version
        `ffmpeg -f concat -safe 0 -i ${workDir}/list.txt -i ${audioPath} ` +
        `-c:v libx264 -preset medium -crf 23 ` +
        `-c:a aac -b:a 128k -shortest -y ${outputPath}`;

    console.log("Executing FFmpeg:", ffmpegCmd);
    const startTime = Date.now();
    await execAsync(ffmpegCmd);
    const processingTime = (Date.now() - startTime) / 1000;

    // Get file stats
    const stats = await fs.stat(outputPath);

    // Upload to storage
    const outputUrl = await uploadToStorage(
      outputPath,
      `outputs/${input.outputFilename || `video-${jobId}.mp4`}`,
    );

    // Cleanup
    await fs.rm(workDir, { recursive: true });

    return {
      output: {
        videoUrl: outputUrl,
        duration: processingTime,
        size: stats.size,
        processingTime: processingTime,
        encoder: useGPU ? "h264_nvenc" : "libx264",
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

// RunPod serverless wrapper
runpod.serverless({
  handler: handler,
});
