#!/bin/bash
# build-test.sh - Test build script for RunPod

echo "🏗️  Starting Editly RunPod build test..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
docker rmi editly-runpod-test:latest 2>/dev/null || true
docker builder prune -f

# Build with verbose output
echo "🔨 Building Docker image..."
docker build \
    -f Dockerfile.runpod \
    -t editly-runpod-test:latest \
    --progress=plain \
    --no-cache \
    . 2>&1 | tee build-test.log

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Test the image
    echo "🧪 Testing the image..."
    docker run --rm editly-runpod-test:latest python3 -c "
import runpod
import json
import os
print('✓ RunPod SDK imported successfully')
print('✓ Environment check passed')
print('Node.js version:', os.popen('node --version').read().strip())
print('Python version:', os.popen('python3 --version').read().strip())
print('FFmpeg version:', os.popen('ffmpeg -version 2>/dev/null | head -1').read().strip())
"
    
    echo "✅ All tests passed!"
else
    echo "❌ Build failed! Check build-test.log for details"
    tail -50 build-test.log
    exit 1
fi
