# AI Copilot Instructions for Editly RunPod Serverless

This document guides AI coding agents working with the **Editly RunPod Serverless** video processing system. This is a production-ready, GPU-accelerated video editing platform designed for scalable cloud deployment.

## 🏗️ Project Architecture

### Core Components

- **Python Handler**: `runpod_handler.py` - Main RunPod serverless entry point
- **Node.js Processor**: `runpod-handler-integrated.js` - Video processing engine with Editly integration
- **Storage Layer**: `storage-handler.js` - Abstraction for local/S3/Cloudflare R2 storage
- **Docker Images**:
  - `Dockerfile.runpod` - Production container with GPU acceleration
  - `Dockerfile.test` - Testing and development container

### Dual Processing Architecture

The system implements a **fallback architecture** for maximum reliability:

1. **Primary**: Editly library (Node.js) for advanced video editing
2. **Fallback**: FFmpeg direct processing when Editly unavailable
3. **GPU Acceleration**: NVIDIA NVENC encoding when GPU available
4. **CPU Fallback**: Software encoding when GPU unavailable

## 🚀 Development Workflows

### Local Testing

Always test locally before RunPod deployment:

```powershell
# Quick performance test (8 clips, 720p)
.\test-quick.ps1

# Full performance benchmark (32 clips, various configs)
.\test-editly.ps1 -Mode benchmark -Clips 32

# Local RunPod handler simulation
.\test-runpod-local.ps1

# Docker build verification
.\build-test.ps1
```

### Testing Patterns

- **Performance Tests**: Use `test-editly.ps1` for systematic benchmarking
- **Integration Tests**: Use `test-runpod-local.ps1` for handler testing
- **Build Verification**: Use `build-test.ps1` for Docker validation
- **Quick Validation**: Use `test-quick.ps1` for rapid iteration

### Test Payloads

The project includes comprehensive test files:

- `test-simple.json` - Basic single clip test
- `test-complex-full.json` - Full feature test with multiple layers
- `test-performance.json` - High-load performance testing
- `runpod-test-payload.json` - RunPod-specific format testing

## 📁 Key File Patterns

### Configuration Files

- `runpod-config.md` - Complete environment variable documentation
- `package.json` - Node.js dependencies and scripts
- `requirements.txt` - Python dependencies
- `tsconfig.json` - TypeScript compilation settings

### Handler Architecture

```javascript
// runpod-handler-integrated.js structure:
const handler = async (event) => {
  // 1. Input validation and preprocessing
  // 2. Storage handling (download assets)
  // 3. Choose processing method (Editly vs FFmpeg)
  // 4. Execute video processing
  // 5. Upload result and cleanup
};
```

### Storage Abstraction Pattern

```javascript
// All storage operations use the abstraction layer:
const { uploadToStorage, downloadFromStorage } = storageHandler;

// Automatically handles local/S3/R2 based on environment
await downloadFromStorage(url, localPath);
await uploadToStorage(localPath, storageKey);
```

## 🎥 Video Processing Patterns

### Input Format Compatibility

The system supports multiple input formats:

**Simplified Format** (recommended):

```json
{
  "input": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "audioUrl": "https://example.com/audio.mp3",
    "images": [{ "url": "https://example.com/img1.jpg", "duration": 5 }]
  }
}
```

**Editly Native Format** (advanced):

```json
{
  "input": {
    "editSpec": {
      "width": 1080,
      "height": 1920,
      "fps": 30,
      "audioFilePath": "https://example.com/audio.mp3",
      "clips": [
        {
          "duration": 5,
          "layers": [
            { "type": "image", "path": "https://example.com/img1.jpg" }
          ]
        }
      ]
    }
  }
}
```

### Error Handling Patterns

Always implement graceful fallbacks:

```javascript
try {
  await processWithEditly(editSpec, outputPath);
  processingMethod = "editly";
} catch (editlyError) {
  console.warn("Editly failed, falling back to FFmpeg:", editlyError.message);
  await processWithFFmpeg(input, outputPath);
  processingMethod = "ffmpeg";
}
```

## 🐳 Docker & Deployment

### Build Process

The Docker build addresses Node.js package conflicts:

```dockerfile
# Critical: Remove conflicting packages before Node.js installation
RUN apt-get remove -y nodejs npm libnode-dev

# Install Node.js from NodeSource (prevents conflicts)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs
```

### Common Build Issues & Solutions

**Node.js Package Conflict**:

- **Problem**: `dpkg: error processing archive .../nodejs_18.20.8-1nodesource1_amd64.deb (--unpack): trying to overwrite '/usr/include/node/common.gypi', which is also in package libnode-dev`
- **Solution**: Install Node.js 18 from NodeSource FIRST before any other dependencies in `Dockerfile.runpod`
- **Prevention**: Sequential installation order prevents libnode-dev auto-installation conflicts

### Environment Variables

Configure via `runpod-config.md` patterns:

```bash
# GPU acceleration (auto-detected)
USE_GPU=true

# Storage configuration
STORAGE_TYPE=s3  # or 'local', 'r2'
S3_BUCKET=your-bucket
S3_REGION=us-east-1

# Domain for download URLs
EXTERNAL_DOMAIN=https://your-domain.com
```

### GPU Optimization

GPU settings are auto-detected but can be overridden:

```javascript
const gpu_available =
  process.env.USE_GPU === "true" &&
  (fs.existsSync("/dev/nvidia0") || fs.existsSync("/dev/nvidiactl"));

const hwAccel = gpu_available
  ? ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"]
  : [];
```

## 🧪 Testing & Debugging

### Performance Monitoring

Always include performance metrics:

```javascript
const startTime = Date.now();
// ... processing ...
const duration = (Date.now() - startTime) / 1000;
console.log(
  `✅ Processing completed in ${duration}s using ${processingMethod}`,
);
```

### Common Debug Patterns

1. **Module Loading Issues**: Check `dist/` vs `src/` imports
2. **GPU Detection**: Verify `/dev/nvidia*` device files
3. **Storage Issues**: Test with `STORAGE_TYPE=local` first
4. **Memory Issues**: Use temporary directories with cleanup

### Error Logging

Follow the established logging patterns:

```javascript
console.log(`✅ Success: ${message}`); // Success
console.warn(`⚠ Warning: ${message}`); // Warning
console.error(`❌ Error: ${message}`); // Error
```

## 📊 Performance Optimization

### CPU Utilization

The system auto-detects CPU cores for optimal performance:

```javascript
const cpus = require("os").cpus().length;
const concurrency = Math.min(cpus, 32); // Max 32 concurrent operations
```

### Memory Management

Always clean up temporary files:

```javascript
try {
  // Processing code
} finally {
  // Cleanup temporary directory
  if (fs.existsSync(workDir)) {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
```

### GPU Memory

Monitor GPU usage in production:

```bash
# Use the monitoring script
.\monitor-gpu.ps1
```

## 🔧 Common Modifications

### Adding New Layer Types

Extend the Editly configuration in `runpod-handler-integrated.js`:

```javascript
const editSpec = {
  // ... existing config
  clips: images.map((img) => ({
    duration: img.duration || 5,
    layers: [
      { type: "image", path: img.localPath, resizeMode: "contain" },
      // Add new layer types here
      { type: "title", text: img.title, position: "center" },
    ],
  })),
};
```

### Storage Provider Integration

Extend `storage-handler.js` for new providers:

```javascript
// Follow the existing pattern for S3/R2 implementation
const customHandler = {
  uploadToStorage: async (localPath, key) => {
    /* implementation */
  },
  downloadFromStorage: async (url, localPath) => {
    /* implementation */
  },
};
```

### Performance Tuning

Modify processing parameters based on use case:

```javascript
// High-speed processing (lower quality)
const fastConfig = { fast: true, fps: 24, quality: "medium" };

// High-quality processing (slower)
const qualityConfig = { fast: false, fps: 30, quality: "high" };
```

## 📚 Documentation References

When working with this codebase, always consult:

- `README-RUNPOD.md` - Complete deployment guide
- `README-EDITLY-PARAMETERS.md` - Video processing parameters
- `runpod-config.md` - Environment configuration
- `QUICK_DEPLOY_GUIDE.md` - Rapid deployment steps

## 🎯 Development Tips

### Code Style

- Use descriptive console logging with emojis for status tracking
- Implement comprehensive error handling with fallbacks
- Always include cleanup in `finally` blocks
- Use absolute paths in Docker containers

### Testing Strategy

1. **Local First**: Always test locally before Docker build
2. **Incremental**: Use quick tests during development
3. **Comprehensive**: Run full benchmark before deployment
4. **GPU Testing**: Test both GPU and CPU fallback modes

### Deployment Checklist

- [ ] Local tests pass (`test-quick.ps1`)
- [ ] Docker build succeeds (`build-test.ps1`)
- [ ] GPU acceleration verified
- [ ] Storage configuration tested
- [ ] Environment variables documented
- [ ] Performance benchmarks recorded

This architecture prioritizes **reliability**, **performance**, and **maintainability** through comprehensive testing, graceful fallbacks, and clear separation of concerns.
