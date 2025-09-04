# 🎮 GPU Setup pentru Editly pe Windows - Ghid Complet

## ⚠️ PROBLEMĂ IDENTIFICATĂ

Docker pe Windows NU poate accesa direct GPU-ul NVIDIA fără configurare specială WSL2.

### Eroarea întâlnită:
```
SIGSEGV: segmentation violation
nvidia-container-runtime-hook: exit status 2
```

## 🔧 SOLUȚII PENTRU GPU PE WINDOWS

### Opțiunea 1: WSL2 + NVIDIA Container Toolkit (Recomandat)

#### Pași de instalare:

1. **Activează WSL2:**
```powershell
# PowerShell as Admin
wsl --install
# Restart PC

# După restart, verifică versiunea
wsl --list --verbose
```

2. **Instalează Ubuntu în WSL2:**
```powershell
wsl --install -d Ubuntu-22.04
```

3. **În WSL2 Ubuntu, instalează NVIDIA Container Toolkit:**
```bash
# Deschide WSL2
wsl

# Configurare repository
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

# Instalare
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# Test GPU în WSL2
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

4. **Configurare Docker Desktop:**
- Settings → General → Use WSL 2 based engine ✅
- Settings → Resources → WSL Integration → Enable Ubuntu ✅
- Restart Docker Desktop

5. **Rulează Editly din WSL2:**
```bash
# În WSL2, navighează la proiect
cd /mnt/e/Aplciatii\ Docker/Editly_video_editor

# Modifică docker-compose.yml
nano docker-compose.yml
# Setează USE_GPU=true și VIDEO_ENCODER=h264_nvenc

# Pornește cu GPU
docker-compose up -d
```

### Opțiunea 2: Rulare Nativă pe Windows (Fără Docker)

**ACEASTA E CEA MAI RAPIDĂ SOLUȚIE!**

1. **Instalează Node.js 18+ pe Windows**
2. **Instalează FFmpeg cu NVENC:**
```powershell
# Download FFmpeg cu NVENC de la:
# https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-full.7z

# Extrage și adaugă în PATH
$env:Path += ";C:\ffmpeg\bin"
```

3. **Rulează Editly nativ:**
```powershell
cd "E:\Aplciatii Docker\Editly_video_editor"

# Install dependencies
npm install

# Build
npm run build

# Run cu GPU
$env:USE_GPU="true"
$env:VIDEO_ENCODER="h264_nvenc"
$env:NVENC_PRESET="p1"
node dist/api-server.js
```

### Opțiunea 3: VM Linux cu GPU Passthrough

Pentru performanță maximă, folosește o VM Linux cu GPU passthrough:

1. **Hyper-V sau VMware Workstation Pro**
2. **Enable GPU passthrough**
3. **Instalează Ubuntu 22.04**
4. **Rulează Docker nativ în Linux**

## 📊 COMPARAȚIE PERFORMANȚĂ

| Metodă | Setup Complexity | Performance | GPU Support |
|--------|-----------------|-------------|-------------|
| Docker Windows | Easy | Slowest | ❌ No |
| WSL2 + NVIDIA | Medium | Medium | ✅ Yes |
| Native Windows | Easy | Fast | ✅ Yes |
| Linux VM | Hard | Fastest | ✅ Yes |

## 🚀 CONFIGURAȚIE OPTIMĂ FĂRĂ GPU

Dacă GPU nu funcționează, optimizări CPU maxime:

```yaml
# docker-compose.yml
environment:
  - USE_GPU=false
  - VIDEO_ENCODER=libx264
  - FFMPEG_THREADS=0  # Auto-detect
  - UV_THREADPOOL_SIZE=256
  - NODE_OPTIONS=--max-old-space-size=28672
```

În `editSpec`:
```json
{
  "width": 1280,   // 720p în loc de 1080p
  "height": 720,
  "fps": 24,       // 24fps în loc de 30/60
  "fast": true,
  "customOutputArgs": [
    "-preset", "ultrafast",
    "-crf", "32"
  ]
}
```

## 🔍 DEBUGGING

### Verifică GPU în Docker:
```powershell
# Test NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi

# Dacă nu merge, problema e cu Docker GPU support
```

### Verifică FFmpeg cu NVENC:
```powershell
docker exec editly-api ffmpeg -encoders | grep nvenc

# Ar trebui să vezi:
# h264_nvenc
# hevc_nvenc
```

### Monitor GPU Usage:
```powershell
# În Windows
nvidia-smi dmon -s pucvmet

# Sau folosește scriptul nostru
.\monitor-gpu.ps1 -Detailed
```

## ⚡ CONCLUZIE

**Pentru Windows, recomandările sunt:**

1. **Cea mai simplă:** Rulează nativ pe Windows (fără Docker)
2. **Cea mai bună:** WSL2 cu NVIDIA Container Toolkit
3. **Compromis:** Docker pe CPU cu optimizări maxime

**Limitări cunoscute:**
- Docker Desktop pe Windows NU suportă GPU direct
- Necesită WSL2 pentru GPU access
- Overhead semnificativ vs Linux nativ

## 📝 COMENZI UTILE

```powershell
# Rebuild cu fix-uri
docker-compose build --no-cache

# Test simplu
.\test-editly.ps1 -Mode simple -Clips 8

# Benchmark
.\test-editly.ps1 -Mode benchmark

# Monitor
.\monitor-gpu.ps1
```