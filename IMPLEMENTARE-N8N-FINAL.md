# 🚀 IMPLEMENTARE N8N - CONFIGURAȚIE FINALĂ PENTRU CALITATE MAXIMĂ

## 📋 Rezumat Optimizări

API-ul Editly a fost optimizat pentru **calitate video înaltă cu utilizare maximă a resurselor CPU**:

### 🎯 Setări Video (CRF 18 - Calitate Înaltă)
- **Preset**: `faster` (echilibru calitate-viteză)
- **CRF**: `18` (calitate vizuală foarte bună, aproape lossless)
- **Threading**: Maximizat pentru toate core-urile CPU
- **Slicing**: 16 slice-uri pentru paralelizare maximă

### 🚀 Optimizări CPU & Performanță
- **Concurrency**: `2x CPU cores` (pentru hyperthreading)
- **Frame Source Concurrency**: `CPU cores` (maxim 32)
- **x264 Optimizări**: Tune special pentru viteză + calitate

### ⏱️ Timeout-uri Extended
- **API Server**: 45 minute
- **HTTP Request**: 45 minute
- **n8n Workflow**: **TREBUIE configurat la 45 minute**

---

## 🛠️ CONFIGURAȚIE N8N OBLIGATORIE

### 1. 📝 Setări HTTP Request Node

În node-ul **HTTP Request** din n8n, configurează:

```json
{
  "timeout": 2700000,
  "headers": {
    "Content-Type": "application/json"
  }
}
```

**IMPORTANT**: `2700000ms = 45 minute`

### 2. ⚙️ Setări Workflow

În **Workflow Settings** → **Timeouts**:
- **Execution Timeout**: `45 minute` (2700 secunde)
- **Keep workflow data**: `Activat` pentru debugging

### 3. 🔧 Setări Advanced în HTTP Request

În **Advanced Options** al HTTP Request node:
- **Timeout**: `2700000`
- **Retry**: `0` (dezactivat pentru a evita dublarea procesării)
- **Keep Alive**: `Activat`

---

## 📊 ESTIMĂRI PERFORMANȚĂ

### Timp de Procesare Estimat
- **Video scurt (30s - 2 clipuri)**: 3-8 minute
- **Video mediu (60s - 5 clipuri)**: 8-15 minute  
- **Video lung (120s - 10+ clipuri)**: 15-30 minute
- **Video foarte lung (300s+)**: 30-45 minute

### Calitate Output
- **CRF 18**: Calitate vizuală foarte înaltă
- **Bitrate**: Variabil (optimizat automat)
- **Compatibilitate**: H.264 AAC (universal)

---

## 🔧 PAYLOAD EXEMPLE

### Payload Standard pentru Calitate Înaltă
```json
{
  "editSpec": {
    "width": 1024,
    "height": 1536, 
    "fps": 30,
    "clips": [
      {
        "duration": 7.840375,
        "layers": [
          {
            "type": "image",
            "path": "/app/uploads/files-1753945616597-751337472.png",
            "resizeMode": "cover",
            "start": 0,
            "stop": 7.840375
          },
          {
            "type": "audio",
            "path": "/app/uploads/files-1754038347566-184717591.mp3",
            "start": 0,
            "mixVolume": 1
          }
        ]
      }
    ]
  },
  "outputFilename": "carte_digitala_optimizata.mp4"
}
```

---

## 🚨 TROUBLESHOOTING

### Eroare Timeout (600s)
**Cauză**: n8n timeout default (10 minute) < processing time
**Soluție**: Configurează timeout la 45 minute în HTTP Request

### Eroare ECONNABORTED  
**Cauză**: Conexiune HTTP timeout
**Soluție**: Verifică că ambele timeout-uri (API + n8n) sunt configurate corect

### Video Inconsistent
**Cauză**: Timpii `cutTo` depășesc durata video
**Soluție**: Verifică durata audio cu endpoint `/audio-info`

### Loop-uri sau Hanging
**Cauză**: Procesare foarte lungă cu setări calitate maximă
**Soluție**: Monitorizează cu `docker logs editly-api -f`

---

## 📈 MONITORIZARE

### Verificare Status Container
```bash
docker ps | grep editly-api
```

### Logs Live
```bash
docker logs editly-api -f
```

### Test API Health
```bash
curl http://host.docker.internal:3001/health
```

---

## ✅ CHECKLIST FINAL

- [ ] Timeout n8n HTTP Request: 45 minute (2700000ms)
- [ ] Workflow timeout: 45 minute
- [ ] Container editly-api: Running
- [ ] Test endpoint `/health`: OK
- [ ] Audio files: Upload și verificare cu `/audio-info`
- [ ] Image files: Upload în `/uploads`
- [ ] Test procesare: Start cu video scurt pentru verificare

---

## 🎯 REZULTAT FINAL

Cu aceste setări ai:
- ✅ **Calitate video foarte înaltă** (CRF 18)
- ✅ **Utilizare maximă CPU** (2x cores + threading)
- ✅ **Stabilitate** (45 minute timeout)
- ✅ **Consistență** (audio re-encoding AAC)
- ✅ **Compatibilitate** (H.264 universal)

**Timpul de procesare va fi mai lung, dar calitatea va fi aproape perfectă!**
