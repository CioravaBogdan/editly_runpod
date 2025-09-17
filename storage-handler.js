const fs = require("fs").promises;
const path = require("path");
const https = require("https");
const http = require("http");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

// Configure storage based on environment
const STORAGE_TYPE = process.env.STORAGE_TYPE || "local"; // 'local', 's3', 'r2'
const EXTERNAL_DOMAIN =
  process.env.EXTERNAL_DOMAIN || "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID";

// S3/R2 client configuration
const s3Client =
  STORAGE_TYPE !== "local"
    ? new S3Client({
        region: process.env.AWS_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT, // For R2: https://ACCOUNT_ID.r2.cloudflarestorage.com
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

async function downloadFromStorage(sourceUrl, destPath) {
  if (sourceUrl.startsWith("http")) {
    // Download from URL
    return new Promise((resolve, reject) => {
      const client = sourceUrl.startsWith("https") ? https : http;
      const file = require("fs").createWriteStream(destPath);

      client
        .get(sourceUrl, (response) => {
          // Handle redirects
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            return downloadFromStorage(response.headers.location, destPath)
              .then(resolve)
              .catch(reject);
          }

          if (response.statusCode !== 200) {
            reject(
              new Error(
                `HTTP ${response.statusCode}: ${response.statusMessage}`,
              ),
            );
            return;
          }

          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve(destPath);
          });

          file.on("error", (err) => {
            file.close();
            reject(err);
          });
        })
        .on("error", reject);
    });
  } else if (sourceUrl.startsWith("s3://") || sourceUrl.startsWith("r2://")) {
    // Download from S3/R2
    const [bucket, ...keyParts] = sourceUrl
      .replace(/^(s3|r2):\/\//, "")
      .split("/");
    const key = keyParts.join("/");

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    await fs.writeFile(destPath, buffer);
    return destPath;
  } else {
    // Local file path
    const sourcePath = sourceUrl.startsWith("/")
      ? sourceUrl
      : path.resolve(sourceUrl);
    await fs.copyFile(sourcePath, destPath);
    return destPath;
  }
}

async function uploadToStorage(sourcePath, destKey) {
  if (STORAGE_TYPE === "s3" || STORAGE_TYPE === "r2") {
    // Upload to S3/R2
    const fileContent = await fs.readFile(sourcePath);
    const bucket = process.env.S3_BUCKET;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: destKey,
      Body: fileContent,
      ContentType: "video/mp4",
    });

    await s3Client.send(command);

    // Return public URL
    if (STORAGE_TYPE === "r2") {
      return `${process.env.R2_PUBLIC_URL}/${destKey}`;
    } else {
      return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${destKey}`;
    }
  } else {
    // Local storage - copy to outputs folder
    const outputDir = "/outputs";
    const outputPath = `${outputDir}/${path.basename(destKey)}`;

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    await fs.copyFile(sourcePath, outputPath);

    // Return URL through RunPod endpoint or external domain
    return `${EXTERNAL_DOMAIN}/download/${path.basename(destKey)}`;
  }
}

module.exports = {
  downloadFromStorage,
  uploadToStorage,
};
