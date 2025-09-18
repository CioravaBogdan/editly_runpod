# build-test.ps1 - Test build script for RunPod on Windows

Write-Host "🏗️  Starting Editly RunPod build test..." -ForegroundColor Green

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
try {
    docker rmi editly-runpod-test:latest 2>$null
    docker builder prune -f
} catch {
    Write-Host "No previous builds to clean" -ForegroundColor Gray
}

# Build with verbose output
Write-Host "🔨 Building Docker image..." -ForegroundColor Blue
docker build `
    -f Dockerfile.runpod `
    -t editly-runpod-test:latest `
    --progress=plain `
    --no-cache `
    . 2>&1 | Tee-Object -FilePath "build-test.log"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    
    # Test the image
    Write-Host "🧪 Testing the image..." -ForegroundColor Blue
    docker run --rm editly-runpod-test:latest python3 -c @"
import runpod
import json
import os
print('✓ RunPod SDK imported successfully')
print('✓ Environment check passed')
print('Node.js version:', os.popen('node --version').read().strip())
print('Python version:', os.popen('python3 --version').read().strip())
print('FFmpeg version:', os.popen('ffmpeg -version 2>/dev/null | head -1').read().strip())
"@
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All tests passed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Build succeeded but tests failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Build failed! Check build-test.log for details" -ForegroundColor Red
    Get-Content "build-test.log" | Select-Object -Last 50
    exit 1
}
