# Test RunPod Editly Local
# Windows PowerShell script pentru testarea locală

Write-Host "🧪 Testing Editly RunPod Handler Locally..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if required files exist
$requiredFiles = @(
    "runpod-handler-integrated.js",
    "storage-handler.js", 
    "test-runpod-payload.json",
    "package.json"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        exit 1
    }
}

# Install dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed!" -ForegroundColor Red
        exit 1
    }
}

# Create outputs directory
if (!(Test-Path "outputs")) {
    mkdir outputs | Out-Null
    Write-Host "📁 Created outputs directory" -ForegroundColor Green
}

# Run test
Write-Host "🚀 Running local test..." -ForegroundColor Yellow
Write-Host "⚙️ Environment: USE_GPU=false, STORAGE_TYPE=local" -ForegroundColor Cyan

$env:USE_GPU = "false"
$env:STORAGE_TYPE = "local" 
$env:EXTERNAL_DOMAIN = "http://localhost:3001"

try {
    node test-local.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🎉 Test completed successfully!" -ForegroundColor Green
        Write-Host "📁 Check outputs/ directory for generated video" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "💥 Test execution failed: $_" -ForegroundColor Red
    exit 1
}

# List output files
if (Test-Path "outputs") {
    $outputFiles = Get-ChildItem outputs -Filter "*.mp4"
    if ($outputFiles.Count -gt 0) {
        Write-Host "📹 Generated videos:" -ForegroundColor Green
        foreach ($file in $outputFiles) {
            $size = [math]::Round($file.Length / 1MB, 2)
            Write-Host "  - $($file.Name) ($size MB)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️ No video files found in outputs/" -ForegroundColor Yellow
    }
}

Write-Host "✅ Local testing complete!" -ForegroundColor Green
