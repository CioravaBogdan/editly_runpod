# Editly RunPod Serverless Deployment

🚀 **Editly Video Editor adaptat pentru RunPod Serverless GPU cloud**

## 📋 Overview

Această versiune adaptată a Editly permite deployment pe RunPod Serverless pentru:

- **3-10x performanță mai bună** cu GPU acceleration
- **95% reducere costuri** (pay-per-second vs always-on servers)
- **Scalare automată** de la 0 la 100+ workers
- **Zero maintenance** - RunPod gestionează infrastructura

## 🎯 Features

### ✅ Compatibilitate completă cu Editly existent

- Acceptă același format JSON `editSpec`
- Fallback automat la FFmpeg dacă Editly nu e disponibil
- Support pentru imagini + audio → video MP4

### ⚡ GPU Acceleration

- NVIDIA NVENC pentru encoding H.264/H.265
- Timp de procesare: 7 min → 2 min pentru video-uri complexe
- Auto-fallback la CPU dacă GPU nu e disponibil

### 🗄️ Storage flexibil

- **Local**: Pentru dezvoltare și teste
- **S3**: Pentru producție AWS
- **Cloudflare R2**: Pentru costuri reduse

## 🚀 Quick Start

### 1. Deploy pe RunPod

1. **Login la RunPod**: https://runpod.io
2. **Serverless → New Endpoint**
3. **GitHub Integration**:

   - Repository: `CioravaBogdan/EDITLY_VIDEO_EDITOR`
   - Branch: `master`
   - Dockerfile Path: `Dockerfile.runpod`
   - Build Context: `.`

4. **Environment Variables** (vezi `runpod-config.md` pentru lista completă):

   ```
   USE_GPU=true
   VIDEO_ENCODER=h264_nvenc
   STORAGE_TYPE=local
   EXTERNAL_DOMAIN=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID
   ```

5. **Container Configuration**:

   - Container Disk: 10 GB
   - Expose HTTP Ports: 3001

6. **Deploy** și așteaptă build-ul (5-10 minute)

### 2. Test Endpoint

```bash
curl -X POST https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @test-runpod-payload.json
```

### 3. Integrare cu n8n

Înlocuiește URL-ul în n8n HTTP Request node:

```
URL: https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
Headers: Authorization: Bearer YOUR_API_KEY
Method: POST
Body: { "input": { ...your existing payload... } }
```

## 📊 Performance & Pricing

### CPU Instance (Development)

- **Config**: 16 vCPUs, 32 GB RAM
- **Cost**: $0.000186/second (~$2-5/month pentru usage normal)
- **Processing**: ~4-5 min pentru video 9 minute
- **Best for**: Testing, development, low-volume

### GPU Instance (Production)

- **Config**: RTX 4090 sau Tesla T4
- **Cost**: $0.34/hour (RTX 4090) - billing per second
- **Processing**: ~1-2 min pentru video 9 minute
- **Best for**: Production, high-volume, speed critical

### Cost Comparison

| Scenario      | Current Editly | RunPod CPU  | RunPod GPU |
| ------------- | -------------- | ----------- | ---------- |
| 1 video/zi    | ~$6/lună       | ~$0.50/lună | ~$2/lună   |
| 10 videos/zi  | ~$60/lună      | ~$5/lună    | ~$15/lună  |
| 100 videos/zi | ~$600/lună     | ~$50/lună   | ~$120/lună |

## 🛠️ Development

### Local Testing

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Test local**:

   ```bash
   npm run test:runpod
   ```

3. **Build Docker local**:
   ```bash
   docker build -f Dockerfile.runpod -t editly-runpod:test .
   docker run -p 3001:3001 -e USE_GPU=false editly-runpod:test
   ```

### Format Input

**Runpod Simplified Format**:

```json
{
  "input": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "audioUrl": "https://example.com/audio.mp3",
    "images": [
      { "url": "https://example.com/img1.jpg", "duration": 5 },
      { "url": "https://example.com/img2.jpg", "duration": 7 }
    ]
  }
}
```

**Editly Native Format** (backwards compatible):

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

## 🔧 Configuration

Toate configurațiile se fac prin environment variables în RunPod UI.

Vezi `runpod-config.md` pentru:

- Lista completă de environment variables
- Configurări pentru S3/R2 storage
- Settings pentru GPU optimization
- Debugging și monitoring

## 📁 Files Overview

| File                           | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `Dockerfile.runpod`            | Container definition pentru RunPod |
| `runpod-handler-integrated.js` | Main RunPod serverless handler     |
| `storage-handler.js`           | Storage abstraction (local/S3/R2)  |
| `test-local.js`                | Local testing script               |
| `test-runpod-payload.json`     | Test payload example               |
| `runpod-config.md`             | Detailed configuration guide       |

## 🐛 Troubleshooting

### Common Issues

**1. Build failed on RunPod**

- Check Dockerfile.runpod syntax
- Verify all files are committed to GitHub
- Check RunPod build logs

**2. Handler timeout**

- Large video files need more processing time
- Check input file sizes and formats
- Monitor RunPod logs for errors

**3. Storage issues**

- Verify storage configuration in environment variables
- Check S3/R2 credentials and permissions
- Test with local storage first

**4. GPU not available**

- Handler automatically falls back to CPU
- Check RunPod instance type selection
- Verify NVENC drivers in logs

### Monitoring

Check processing logs în RunPod dashboard:

```bash
curl https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/logs \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 🚀 Production Checklist

- [ ] RunPod endpoint deployed și tested
- [ ] Environment variables configured
- [ ] Storage setup (S3/R2 for production)
- [ ] n8n workflow updated cu noul endpoint
- [ ] Monitoring setup
- [ ] Cost alerts configured
- [ ] Backup plan for fallback

## 🔗 Resources

- [RunPod Documentation](https://docs.runpod.io/)
- [RunPod Serverless Guide](https://docs.runpod.io/serverless/overview)
- [Original Editly Documentation](https://github.com/mifi/editly)

---

**🎬 Ready to scale your video processing to the cloud!** 🚀
