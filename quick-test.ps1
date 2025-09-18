# quick-test.ps1 - Quick verification of fixes

Write-Host "Quick verification of fixes..." -ForegroundColor Green

# Check if files exist
$files = @("Dockerfile.runpod", "package.json", "requirements.txt", "runpod_handler.py", "runpod-handler-integrated.js")

Write-Host "Checking files..." -ForegroundColor Blue
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
    }
}

# Check Dockerfile content
Write-Host "Checking Dockerfile fixes..." -ForegroundColor Blue
$dockerfileContent = Get-Content "Dockerfile.runpod" -Raw

if ($dockerfileContent -like "*remove*nodejs*npm*libnode-dev*") {
    Write-Host "✓ Node.js conflict fix applied" -ForegroundColor Green
} else {
    Write-Host "⚠️ Node.js conflict fix may be missing" -ForegroundColor Yellow
}

if ($dockerfileContent -like "*requirements.txt*") {
    Write-Host "✓ Python requirements installation added" -ForegroundColor Green
} else {
    Write-Host "⚠️ Python requirements installation missing" -ForegroundColor Yellow
}

Write-Host "All fixes verification complete!" -ForegroundColor Green
