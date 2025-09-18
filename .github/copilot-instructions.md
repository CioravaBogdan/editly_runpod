# AI Copilot Instructions for Editly RunPod Serverless

This document guides AI coding agents working with the **Editly RunPod Serverless** video processing system. This is a production-ready, GPU-accelerated video editing platform designed for scalable cloud deployment.

**Repository**: https://github.com/CioravaBogdan/editly_runpod

## 🏗️ Project Architecture

### Core Components

- **Python Handler**: `runpod_handler.py` - Main RunPod serverless entry point (timeout: 5 minutes)
- **Node.js Processor**: `runpod-handler-integrated.js` - Video processing engine with Editly integration
- **Storage Layer**: `storage-handler.js` - Abstraction for local/S3/Cloudflare R2 storage
- **Docker Images**:
  - `Dockerfile.runpod` - Production container with GPU acceleration (Ubuntu 22.04 + Node.js 18)
  - `Dockerfile.test` - Testing and development container
- **N8N Integration**: Complete workflow files for automation (`n8n-*.json`)

### Dual Processing Architecture

The system implements a **fallback architecture** for maximum reliability:

1. **Primary**: Editly library (Node.js/TypeScript) for advanced video editing
2. **Fallback**: FFmpeg direct processing when Editly unavailable
3. **GPU Acceleration**: NVIDIA NVENC encoding when GPU available
4. **CPU Fallback**: Software encoding when GPU unavailable

### Python-to-Node.js Bridge Pattern

```python
# runpod_handler.py - Entry point that detects best handler
if os.path.exists("/app/runpod-handler.js"):
    cmd = ["node", "/app/runpod-handler.js"]  # Preferred integrated handler
else:
    cmd = ["node", "/app/dist/cli.js", "--json", str(config_path)]  # Editly CLI fallback
```

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

# GPU monitoring during development
.\monitor-gpu.ps1
```

### N8N Integration Workflow

The system includes complete N8N automation workflows:

```javascript
// N8N HTTP Request Node Configuration
{
  "url": "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync",
  "timeout": 2700000, // 45 minutes (CRITICAL for large videos)
  "headers": {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  }
}
```

**Critical N8N Settings**:

- **HTTP Request Timeout**: 45 minutes (2700000ms) - Default 10min will cause failures
- **Workflow Timeout**: Match or exceed HTTP timeout
- **Keep Workflow Data**: Enabled for debugging large video processing

### N8N Workflow Files Guide

**Audio Synchronization Workflows**:

- `n8n-audio-preserved-workflow.json` - Audio timing preservation
- `n8n-perfect-audio-workflow.json` - High-quality audio sync
- `perfect-audio-sync.json` - Template for 9-second audio sync

**Integration Workflows**:

- `n8n-dynamic-duration-workflow.json` - Variable video lengths
- `n8n-test-workflow.json` - Basic functionality testing
- `n8n-optimized-fast-code.js` - Performance-optimized processing

**Google Drive Integration**:

- `N8N-GOOGLE-DRIVE-FINAL-RAPID.js` - Fast Google Drive integration
- `N8N-GOOGLE-DRIVE-OPTIMIZED.js` - Optimized Drive processing
- `N8N-HD-QUALITY-FINAL.js` - High-definition quality settings

**Common N8N Issues & Solutions**:

1. **Timeout Errors**: Default 10-minute timeout insufficient for video processing

   - Solution: Set HTTP Request timeout to 2700000ms (45 minutes)
   - Also configure Workflow Settings timeout to match

2. **Memory Issues**: Large video processing can exhaust N8N memory

   - Solution: Enable "Keep Workflow Data" for monitoring
   - Use chunked processing for large files

3. **Google Drive Rate Limits**: API quota exhaustion with bulk operations
   - Solution: Implement delays between requests
   - Use batch operations where possible

### Testing Patterns

- **Performance Tests**: Use `test-editly.ps1` for systematic benchmarking
- **Integration Tests**: Use `test-runpod-local.ps1` for handler testing
- **Build Verification**: Use `build-test.ps1` for Docker validation
- **Quick Validation**: Use `test-quick.ps1` for rapid iteration
- **N8N Testing**: Use provided workflow files (`n8n-*.json`) for automation testing

### Test Payloads

The project includes comprehensive test files:

- `test-simple.json` - Basic single clip test
- `test-complex-full.json` - Full feature test with multiple layers
- `test-performance.json` - High-load performance testing (32 clips)
- `runpod-test-payload.json` - RunPod-specific format testing
- `n8n-example-payload.json` - N8N workflow integration examples

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

### Windows PowerShell Development Commands

**Testing Commands**:

```powershell
# Quick 8-clip performance test (recommended for iteration)
.\test-quick.ps1

# Comprehensive benchmark testing (32 clips, multiple configurations)
.\test-editly.ps1 -Mode benchmark -Clips 32

# Parallel processing test for performance comparison
.\concurrent-test.ps1

# Local RunPod handler simulation (tests Python → Node.js bridge)
.\test-runpod-local.ps1

# Native Windows execution test
.\run-native-windows.ps1
```

**Build & Deployment Commands**:

```powershell
# Docker build with error checking
.\build-test.ps1

# Test different shell configurations
.\build-test.ps1 -Shell cmd      # Use CMD instead of PowerShell
.\build-test.ps1 -Shell powershell # Use PowerShell (default)

# GPU setup and monitoring
.\setup-gpu.ps1                  # Configure GPU acceleration
.\monitor-gpu.ps1                # Real-time GPU monitoring during processing
```

**Development Workflow**:

```powershell
# 1. Quick validation
.\test-quick.ps1

# 2. If successful, test RunPod integration
.\test-runpod-local.ps1

# 3. Build Docker image for deployment
.\build-test.ps1

# 4. Monitor GPU during processing (separate terminal)
.\monitor-gpu.ps1

# 5. Run comprehensive benchmark
.\test-editly.ps1 -Mode benchmark -Clips 32
```

### Common Build Issues & Solutions

**Node.js Package Conflict**:

- **Problem**: `dpkg: error processing archive .../nodejs_18.20.8-1nodesource1_amd64.deb (--unpack): trying to overwrite '/usr/include/node/common.gypi', which is also in package libnode-dev`
- **Solution**: Install Node.js 18 from NodeSource FIRST before any other dependencies in `Dockerfile.runpod`
- **Prevention**: Sequential installation order prevents libnode-dev auto-installation conflicts

**Package Installation Order** (Critical):

````dockerfile
**Package Installation Order** (Critical):
```dockerfile
# STEP 1: Remove conflicting packages FIRST
RUN apt-get remove -y nodejs npm libnode-dev

# STEP 2: Install Node.js from NodeSource (prevents conflicts)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# STEP 3: Install other dependencies AFTER Node.js is stable
RUN apt-get install -y python3 python3-pip ffmpeg
````

**CommonJS/ES Module Compatibility** (Critical):

```dockerfile
# Copy handlers with .cjs extension for CommonJS compatibility
COPY runpod-handler-integrated.js ./runpod-handler.cjs
COPY storage-handler.js ./storage-handler.cjs
```

**Python Handler Bridge**:

```python
# Check for .cjs files (CommonJS modules)
if os.path.exists("/app/runpod-handler.cjs"):
    cmd = ["node", "/app/runpod-handler.cjs"]
```

**Docker Build Debugging**:

```powershell
# Build with verbose output
docker build -f Dockerfile.runpod -t editly-test . --progress=plain --no-cache

# Check intermediate layers
docker run --rm -it editly-test node --version
docker run --rm -it editly-test python3 --version
```

````

**Docker Build Debugging**:

```powershell
# Build with verbose output
docker build -f Dockerfile.runpod -t editly-test . --progress=plain --no-cache

# Check intermediate layers
docker run --rm -it editly-test node --version
docker run --rm -it editly-test python3 --version
````

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
5. **ES Module/CommonJS Conflicts**: Use `.cjs` extensions for CommonJS handlers

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

## 🎯 Project Conventions & File Patterns

### Naming Conventions

**PowerShell Scripts**:

- `test-*.ps1` - Testing scripts with specific purposes
- `build-*.ps1` - Build and Docker-related scripts
- `monitor-*.ps1` - System monitoring and debugging scripts

**Configuration Files**:

- `runpod-*.js` - RunPod handler implementations
- `test-*.json` - Test payload specifications
- `n8n-*.json` - N8N workflow configurations
- `*-config.md` - Configuration documentation

**Documentation Structure**:

- `README-*.md` - Component-specific documentation
- `*-FINAL.md` - Implementation completion reports
- `*-OPTIMIZATION.md` - Performance tuning guides
- `QUICK_*.md` - Rapid deployment guides

### File Organization Patterns

**Test Files Hierarchy**:

```
test-simple.json          # Basic functionality
test-complex-full.json    # Complete feature set
test-performance.json     # Load/stress testing
test-speed-*.json         # Speed optimization variants
runpod-test-payload.json  # RunPod-specific format
n8n-example-payload.json  # N8N integration examples
```

**N8N Integration Files**:

```
n8n-*.json                # Workflow definitions
N8N-*.js                  # Code snippets for workflows
*-audio-*.json            # Audio synchronization workflows
*-google-drive-*.js       # Google Drive integration code
```

**Documentation Layers**:

```
README.md                 # Main project overview
README-RUNPOD.md         # Deployment-specific guide
README-EDITLY-PARAMETERS.md # Video processing parameters
QUICK_DEPLOY_GUIDE.md    # Rapid deployment steps
runpod-config.md         # Environment configuration
```

### Code Style Patterns

**Error Handling Convention**:

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

**Logging Pattern**:

```javascript
console.log(`✅ Success: ${message}`); // Success operations
console.warn(`⚠ Warning: ${message}`); // Non-fatal issues
console.error(`❌ Error: ${message}`); // Fatal errors
console.log(`🚀 Starting: ${process}`); // Process initiation
console.log(`📊 Stats: ${metrics}`); // Performance data
```

**Module Import Strategy**:

```javascript
// Graceful module loading with fallbacks
let editly;
try {
  editly = require("./dist/index.js"); // Try compiled version first
  console.log("✓ Loaded Editly from dist/index.js");
} catch (error) {
  try {
    editly = require("./src/index.ts"); // Fallback to source
    console.log("✓ Loaded Editly from src/index.ts");
  } catch (fallbackError) {
    console.warn("⚠ Could not import Editly module, using FFmpeg fallback");
  }
}
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
