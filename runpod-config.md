# RunPod Deployment Configuration for Editly Video Editor

## Environment Variables pentru RunPod UI:

### Core Settings

RUNPOD_ENDPOINT=true
USE_GPU=true
VIDEO_ENCODER=h264_nvenc
NVENC_PRESET=p5
NVENC_CQ=23

### External Access

EXTERNAL_DOMAIN=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID

### Storage Configuration (choose one)

STORAGE_TYPE=local

# Pentru S3:

# STORAGE_TYPE=s3

# S3_BUCKET=your-bucket-name

# AWS_REGION=us-east-1

# AWS_ACCESS_KEY_ID=your-access-key

# AWS_SECRET_ACCESS_KEY=your-secret-key

# Pentru Cloudflare R2:

# STORAGE_TYPE=r2

# S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# S3_BUCKET=your-r2-bucket

# AWS_ACCESS_KEY_ID=your-r2-access-key

# AWS_SECRET_ACCESS_KEY=your-r2-secret-key

# R2_PUBLIC_URL=https://your-r2-domain.com

### Processing Settings

FFMPEG_THREADS=8
AUTO_CLEANUP_ENABLED=true
CLEANUP_AFTER_HOURS=0.5

## RunPod UI Configuration:

### GitHub Repository

Repository: CioravaBogdan/EDITLY_VIDEO_EDITOR
Branch: master
Dockerfile Path: Dockerfile.runpod
Build Context: .

### Container Settings

Container Disk: 10 GB
Expose HTTP Ports: 3001

### Instance Configuration

For CPU (development/testing):

- CPU Configuration: 16 vCPUs, 32 GB RAM
- Cost: ~$0.000186/second

For GPU (production):

- GPU Configuration: RTX 4090 or Tesla T4
- Cost: ~$0.34/hour (RTX 4090) or ~$0.526/hour (Tesla T4)

## API Usage:

### Input Format (compatible cu Editly existent):

```json
{
  "input": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "outputFilename": "carte_digitala_2025.mp4",
    "audioUrl": "https://your-storage.com/audio.mp3",
    "images": [
      {
        "url": "https://your-storage.com/img1.jpg",
        "duration": 5
      }
    ]
  }
}
```

### Alternative Editly Format:

```json
{
  "input": {
    "editSpec": {
      "width": 1080,
      "height": 1920,
      "fps": 30,
      "audioFilePath": "https://your-storage.com/audio.mp3",
      "clips": [
        {
          "duration": 5,
          "layers": [
            {
              "type": "image",
              "path": "https://your-storage.com/img1.jpg",
              "resizeMode": "contain"
            }
          ]
        }
      ]
    }
  }
}
```

### Output Format:

```json
{
  "output": {
    "videoUrl": "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/download/video-123.mp4",
    "downloadUrl": "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/download/video-123.mp4",
    "duration": 120.5,
    "size": 15728640,
    "processingTime": 45.2,
    "method": "editly",
    "encoder": "h264_nvenc"
  }
}
```

## Testing:

### Local Test

```bash
curl -X POST http://localhost:3001/test \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

### RunPod Test

```bash
curl -X POST https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```
