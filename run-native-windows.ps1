# Native Windows Setup - Performanță MAXIMĂ fără Docker
# Rulează Editly direct pe Windows pentru viteză maximă

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   EDITLY NATIVE WINDOWS - MAX PERFORMANCE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ Node.js not installed!" -ForegroundColor Red
    Write-Host "    📦 Download from: https://nodejs.org/en/download/" -ForegroundColor Yellow
    exit 1
}
Write-Host "    ✅ Node.js: $nodeVersion" -ForegroundColor Green

# Check FFmpeg
Write-Host "[2/4] Checking FFmpeg..." -ForegroundColor Yellow
$ffmpegVersion = ffmpeg -version 2>$null | Select-Object -First 1
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ FFmpeg not installed!" -ForegroundColor Red
    Write-Host "    📦 Download from: https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor Yellow
    Write-Host "    Download 'full' version and add to PATH" -ForegroundColor Yellow
    exit 1
}
Write-Host "    ✅ FFmpeg installed" -ForegroundColor Green

# Install dependencies
Write-Host "[3/4] Installing dependencies..." -ForegroundColor Yellow
npm install --no-audit --no-fund 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "    ✅ Dependencies installed" -ForegroundColor Green

# Build TypeScript
Write-Host "[4/4] Building TypeScript..." -ForegroundColor Yellow
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "    ✅ Build completed" -ForegroundColor Green

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "   STARTING WITH MAX PERFORMANCE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

# Set environment variables for MAXIMUM PERFORMANCE
$env:NODE_ENV = "production"
$env:PORT = "3001"
$env:EXTERNAL_DOMAIN = "https://editly.byinfant.com"

# CPU Performance Settings
$env:USE_GPU = "false"
$env:VIDEO_ENCODER = "libx264"
$env:FFMPEG_THREADS = "32"  # Use all 32 threads
$env:AUDIO_BITRATE = "96k"  # Lower audio bitrate for speed

# Node.js optimizations
$env:UV_THREADPOOL_SIZE = "256"
$env:NODE_OPTIONS = "--max-old-space-size=28672 --max-semi-space-size=2048"

# Editly performance settings
$env:EDITLY_FAST_MODE = "true"
$env:EDITLY_PARALLEL_RENDERS = "32"
$env:EDITLY_CLEANUP_TEMP = "false"
$env:EDITLY_LOG_LEVEL = "error"

# Threading optimizations
$env:OMP_NUM_THREADS = "32"
$env:MKL_NUM_THREADS = "32"
$env:NUMEXPR_NUM_THREADS = "32"
$env:OPENBLAS_NUM_THREADS = "32"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  🖥️  CPU Threads: 32" -ForegroundColor Gray
Write-Host "  💾 Max Memory: 28GB" -ForegroundColor Gray
Write-Host "  🎬 Encoder: libx264 ultrafast" -ForegroundColor Gray
Write-Host "  ⚡ Fast Mode: Enabled" -ForegroundColor Gray
Write-Host "  🔧 Parallel Renders: 32" -ForegroundColor Gray
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "  http://localhost:3001/health" -ForegroundColor White
Write-Host "  http://localhost:3001/info" -ForegroundColor White
Write-Host "  http://localhost:3001/edit" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Start the server
node dist/api-server.js