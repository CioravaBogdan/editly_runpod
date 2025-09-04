# PowerShell script pentru setup GPU cu Docker pe Windows
# Verifică și configurează Docker pentru accelerare GPU

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   EDITLY GPU ACCELERATION SETUP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificare WSL2
Write-Host "[1/5] Verificare WSL2..." -ForegroundColor Yellow
$wslVersion = wsl --list --verbose 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ WSL2 nu este instalat!" -ForegroundColor Red
    Write-Host "    📦 Instalare WSL2 necesară:" -ForegroundColor Yellow
    Write-Host "       wsl --install" -ForegroundColor White
    Write-Host "       Apoi restartați PC-ul" -ForegroundColor White
    exit 1
}
Write-Host "    ✅ WSL2 detectat" -ForegroundColor Green

# 2. Verificare NVIDIA GPU
Write-Host "[2/5] Verificare NVIDIA GPU..." -ForegroundColor Yellow
$gpu = nvidia-smi --query-gpu=name --format=csv,noheader 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ NVIDIA GPU nu a fost detectat!" -ForegroundColor Red
    exit 1
}
Write-Host "    ✅ GPU detectat: $gpu" -ForegroundColor Green

# 3. Verificare Docker Desktop
Write-Host "[3/5] Verificare Docker Desktop..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ Docker Desktop nu este instalat!" -ForegroundColor Red
    Write-Host "    📦 Download: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}
Write-Host "    ✅ Docker: $dockerVersion" -ForegroundColor Green

# 4. Test Docker GPU support
Write-Host "[4/5] Test Docker GPU support..." -ForegroundColor Yellow
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ⚠️  Docker GPU support nu funcționează!" -ForegroundColor Yellow
    Write-Host "    📋 Pași de rezolvare:" -ForegroundColor Yellow
    Write-Host "       1. Deschide Docker Desktop Settings" -ForegroundColor White
    Write-Host "       2. General -> Enable 'Use the WSL 2 based engine'" -ForegroundColor White
    Write-Host "       3. Resources -> WSL Integration -> Enable pentru distro-ul WSL" -ForegroundColor White
    Write-Host "       4. Restart Docker Desktop" -ForegroundColor White
    Write-Host ""
    Write-Host "    📦 Instalare NVIDIA Container Toolkit în WSL2:" -ForegroundColor Yellow
    Write-Host "       wsl" -ForegroundColor White
    Write-Host "       distribution=$(. /etc/os-release;echo `$ID`$VERSION_ID)" -ForegroundColor White
    Write-Host "       curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -" -ForegroundColor White
    Write-Host "       curl -s -L https://nvidia.github.io/nvidia-docker/`$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list" -ForegroundColor White
    Write-Host "       sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit" -ForegroundColor White
    Write-Host "       sudo systemctl restart docker" -ForegroundColor White
    exit 1
}
Write-Host "    ✅ Docker GPU support funcționează!" -ForegroundColor Green

# 5. Build și Start Editly cu GPU
Write-Host "[5/5] Build Docker image cu FFmpeg NVENC..." -ForegroundColor Yellow
Write-Host ""

# Oprire container existent
Write-Host "    🛑 Oprire container existent..." -ForegroundColor Cyan
docker-compose down 2>$null

# Build cu cache clear
Write-Host "    🔨 Build image cu suport GPU..." -ForegroundColor Cyan
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Start serviciu
Write-Host "    🚀 Pornire serviciu cu GPU acceleration..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "    ❌ Start failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   ✅ SETUP COMPLET!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Verificare status:" -ForegroundColor Yellow
Write-Host "   docker-compose logs -f" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Test GPU encoding:" -ForegroundColor Yellow
Write-Host "   docker exec editly-api ffmpeg -encoders | grep nvenc" -ForegroundColor White
Write-Host ""
Write-Host "🌐 API Endpoints:" -ForegroundColor Yellow
Write-Host "   Health: http://localhost:3001/health" -ForegroundColor White
Write-Host "   Info:   http://localhost:3001/info" -ForegroundColor White
Write-Host ""
Write-Host "💡 Pentru monitorizare GPU în timp real:" -ForegroundColor Yellow
Write-Host "   nvidia-smi dmon -s pucvmet -d 1" -ForegroundColor White