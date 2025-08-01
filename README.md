# 🎬 Editly Video Editor API

Aplicație Docker optimizată pentru crearea videoclipurilor cu GPU acceleration și audio perfect.

## 🚀 Quick Start

```bash
# Start aplicația
docker compose up -d

# Test API
curl http://localhost:3001/health
```

## 📋 API Endpoints

- **Health Check:** `GET /health`
- **Create Video:** `POST /edit`
- **Download Video:** `GET /download/:filename`

## 🎯 Pentru n8n

Folosește codul din **`N8N-GOOGLE-DRIVE-FINAL-RAPID.js`** - optimizat pentru:
- ✅ Fișiere mici (perfect pentru Google Drive API)
- ✅ Audio sincronizat și boost
- ✅ Procesare rapidă cu GPU acceleration
- ✅ Rezoluție optimizată 640x960px

## 🔧 Configurație

- **Port:** 3001
- **GPU:** NVIDIA h264_nvenc acceleration
- **Audio:** Normalizare + boost 1.2x
- **Output:** MP4 optimizat pentru upload

## 📁 Structura

- `src/` - Codul sursă API
- `docker-compose.yml` - Configurația Docker
- `N8N-GOOGLE-DRIVE-FINAL-RAPID.js` - Cod n8n optimizat
- **`README-EDITLY-PARAMETERS.md`** - 📚 **DOCUMENTAȚIE COMPLETĂ** cu toți parametrii și funcțiile Editly
