# 🎬 Editly Dynamic Duration Video Creator

## 📋 Descriere

Acest workflow n8n creează videoclipuri cu **durată dinamică** bazată pe lungimea audio-ului, respectând cerințele tale specifice:

### ✅ Funcționalități Implementate

- **Durată dinamică**: Clipul se adaptează la durata audio-ului
- **Calitate maximă**: Fără fast mode, encoding HD
- **Audio neschimbat**: Păstrează calitatea și durata originală
- **Rezoluție 1024x1536**: Perfect pentru format portret
- **Pauze între clipuri**: 2 secunde de liniște între pagini

### 🎯 Reguli de Durată

| Durată Audio | Durată Clip | Explicație |
|-------------|-------------|------------|
| ≤ 4 secunde | 4 secunde | Audio scurt + minim necesar |
| 5 secunde | 8 secunde | Audio + 3 secunde buffer |
| 6-9 secunde | 10 secunde | Audio + 1-4 secunde buffer |
| > 9 secunde | 10 secunde | Limitat la maximum |
| Fără audio | 4 secunde | Durată minimă standard |

## 🚀 Cum să folosești

### 1. Import în n8n
```bash
# Importă workflow-ul în n8n
curl -X POST http://localhost:5678/api/v1/workflows/import \\
  -H "Content-Type: application/json" \\
  -d @n8n-dynamic-duration-workflow.json
```

### 2. Configurare Input

Workflow-ul așteaptă un array de obiecte cu următoarea structură:

```json
[
  {
    "audioPath": "/app/uploads/files-1753801198963-967848345.mp3",
    "imagePath": "/app/uploads/files-1753809979219-248490257.png"
  },
  {
    "audioPath": "/app/uploads/files-1753801198969-641241060.mp3", 
    "imagePath": "/app/uploads/files-1753809979224-923577472.png"
  }
]
```

### 3. Webhook/Manual Trigger

- **Manual**: Rulează direct din n8n interface
- **Webhook**: Trimite date prin POST request
- **API**: Integrează cu alte sisteme

## 🔧 Configurație Tehnică

### Video Settings
```javascript
const VIDEO_CONFIG = {
  width: 1024,              // Rezoluție width
  height: 1536,             // Rezoluție height  
  fps: 30,                  // Frame rate înalt
  minDuration: 4,           // Minimul per clip
  maxDuration: 10,          // Maximul per clip
  silenceBetween: 2         // Pauză între clipuri
};
```

### Encoding Settings (Calitate Maximă)
```javascript
customOutputArgs: [
  "-c:v", "libx264",        // Video codec H.264
  "-preset", "medium",      // Preset balansat
  "-crf", "18",            // Calitate foarte înaltă
  "-profile:v", "high",     // Profile înalt
  "-pix_fmt", "yuv420p",    // Format pixel compatibil
  
  "-c:a", "aac",           // Audio codec AAC
  "-b:a", "192k",          // Bitrate audio mare
  "-ar", "48000",          // Sample rate înalt
  "-ac", "2",              // Stereo
  
  "-threads", "0"          // Toate cores-urile CPU
]
```

## 📊 Output Format

Workflow-ul returnează:

```json
{
  "status": "success",
  "message": "✅ Video creat cu succes!",
  "videoUrl": "http://localhost:3001/download/carte_digitala_HD_2025-07-29T20-45-00.mp4",
  "filename": "carte_digitala_HD_2025-07-29T20-45-00.mp4",
  "stats": {
    "totalPages": 32,
    "totalDuration": 256,
    "withAudio": 30,
    "resolution": "1024x1536",
    "quality": "HD_Maximum",
    "audioQuality": "Original_192k"
  },
  "fileSize": "45.6MB",
  "processingTime": "180000ms"
}
```

## 🎵 Gestionarea Audio

### Caracteristici Audio
- **Volum**: `mixVolume: 1.0` (original, neschimbat)
- **Calitate**: 192k bitrate, 48kHz sample rate
- **Format**: AAC stereo
- **Durată**: Păstrată exact ca în original

### Logica de Timing
```javascript
function calculateClipDuration(audioDuration) {
  if (!audioDuration) return 4;           // Fără audio
  if (audioDuration <= 4) return 4;       // Audio scurt
  if (audioDuration <= 5) return 8;       // Audio mediu
  if (audioDuration <= 9) return 10;      // Audio lung
  return 10;                              // Audio foarte lung
}
```

## 🖼️ Gestionarea Imaginilor

- **ResizeMode**: `"cover"` - umple tot ecranul
- **Aspect Ratio**: Păstrat, croppat dacă necesar
- **Durată**: Dinamică bazată pe audio
- **Format**: Acceptă PNG, JPG, etc.

## ⚡ Optimizări Performanță

### CPU Usage
- **Multi-threading**: Folosește toate cores-urile
- **Concurrency**: Paralelizare maximă
- **Buffer Pool**: Management eficient memorie
- **Fast Mode**: DEZACTIVAT pentru calitate

### Memory Management
- **Buffer reuse**: Pool de buffere refolosibile
- **Garbage collection**: Curățare automată
- **Stream processing**: Procesare în flux

## 🐛 Debugging

### Log Messages
```
🎬 Procesare carte digitală: 32 pagini
🎵 Pagina 1: Audio 5s → Clip 8s
🖼️  Pagina 2: Fără audio → Clip 4s
✅ Pagina 3: 10s (audio: 7s)
```

### Common Issues

1. **Audio prea lung**: Se limitează la 10s clip
2. **Audio prea scurt**: Se extinde la 4s minim
3. **Fără imagine**: Pagina se omite
4. **Path invalid**: Verifică căile fișierelor

## 🔄 Workflow Nodes

1. **📥 Webhook Start**: Trigger pentru input
2. **📋 Sample Data**: Date de test
3. **🎬 Dynamic Duration Processor**: Logica principală
4. **🚀 Editly API Call**: Apel către API
5. **✅ Success Check**: Verificare rezultat
6. **📥 Download Video**: Download fișier final
7. **🎉 Success Result**: Rezultat final
8. **❌ Error Result**: Gestionare erori

## 📈 Performanță Așteptată

- **32 pagini**: ~4-5 minute procesare
- **CPU Usage**: 60-90% (toate cores-urile)
- **Memory**: ~2-4GB peak usage
- **File Size**: ~40-60MB pentru 32 pagini HD

## 🎯 Exemple de Utilizare

### Test cu 3 pagini:
```bash
curl -X POST http://localhost:5678/webhook/dynamic-video \\
  -H "Content-Type: application/json" \\
  -d '[
    {
      "audioPath": "/app/uploads/audio1.mp3",
      "imagePath": "/app/uploads/image1.png"
    },
    {
      "audioPath": "/app/uploads/audio2.mp3", 
      "imagePath": "/app/uploads/image2.png"
    },
    {
      "imagePath": "/app/uploads/image3.png"
    }
  ]'
```

### Rezultat așteptat:
- Pagina 1: 8s (audio 5s + 3s buffer)
- Pagina 2: 10s (audio 7s + 3s buffer) 
- Pauză: 2s liniște
- Pagina 3: 4s (fără audio)
- **Total**: ~24 secunde video HD

🎬 **Gata de utilizare!** Workflow-ul este optimizat pentru calitate maximă și performanță ridicată.