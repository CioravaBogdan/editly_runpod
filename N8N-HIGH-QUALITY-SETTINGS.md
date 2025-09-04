# 🎬 EDITLY HIGH QUALITY SETTINGS FOR N8N

## ✅ OPTIMAL QUALITY SETTINGS

### 📸 IMAGE LAYER SETTINGS

Pentru a păstra calitatea originală a imaginilor, folosește aceste setări în n8n:

```json
{
  "type": "image",
  "path": "/path/to/image.png",
  "resizeMode": "contain",  // ⚠️ NU FOLOSI "cover" - taie și comprimă!
  "zoomDirection": null,     // Dezactivează zoom
  "zoomAmount": 0            // Fără zoom
}
```

### 🎬 VIDEO SPEC SETTINGS

```json
{
  "editSpec": {
    "width": 1920,        // Full HD sau rezoluția imaginilor tale
    "height": 1080,       // Păstrează aspect ratio original
    "fps": 30,            // 30 fps pentru calitate bună
    "fast": false,        // ⚠️ IMPORTANT: false pentru calitate maximă
    "videoBitrate": "10000k",  // 10 Mbps pentru calitate înaltă
    "audioBitrate": "320k",    // Audio maxim
    "clips": [...]
  }
}
```

## 🚫 CE SĂ EVIȚI

1. **NU folosi `resizeMode: "cover"`** - Taie părți din imagine și reduce calitatea
2. **NU folosi `fast: true`** - Reduce drastic calitatea
3. **NU lăsa width/height mai mic decât imaginile originale** - Comprimă imaginile

## ✅ RECOMANDĂRI

### Pentru imagini 1024x1536 (Portrait):
```json
{
  "width": 1024,
  "height": 1536,
  "resizeMode": "contain"  // Păstrează toată imaginea
}
```

### Pentru imagini 1920x1080 (Landscape):
```json
{
  "width": 1920,
  "height": 1080,
  "resizeMode": "contain"  // Păstrează toată imaginea
}
```

### Pentru mix de imagini cu dimensiuni diferite:
```json
{
  "width": 1920,
  "height": 1080,
  "resizeMode": "contain-blur"  // Adaugă blur pe margini, păstrează imaginea
}
```

## 🎯 SETĂRI DOCKER CONTAINER

Container-ul editly-api este acum configurat pentru:

- **CRF: 10** (aproape lossless)
- **Preset: slow** (calitate maximă)
- **Video Bitrate: 10 Mbps**
- **Audio Bitrate: 320 kbps**
- **Pixel Format: yuv444p** (fără pierdere de culoare)

## 💡 TIPS

1. **Pentru prezentări/slideshow**: Folosește `fps: 24` - suficient și reduce mărimea
2. **Pentru animații**: Păstrează `fps: 30` sau chiar `60`
3. **Pentru imagini statice**: Poți reduce la `fps: 15` fără pierdere vizibilă

## 🔧 EXEMPLU COMPLET N8N

```json
{
  "editSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "fast": false,
    "videoBitrate": "10000k",
    "audioBitrate": "320k",
    "clips": [
      {
        "duration": 3,
        "layers": [
          {
            "type": "image",
            "path": "/app/uploads/imagine1.jpg",
            "resizeMode": "contain",
            "zoomDirection": null,
            "zoomAmount": 0
          },
          {
            "type": "audio",
            "path": "/app/uploads/audio1.mp3",
            "mixVolume": 1
          }
        ]
      }
    ]
  },
  "outputFilename": "high-quality-video.mp4"
}
```

## ⏱️ TIMP DE PROCESARE

Cu setările de calitate maximă:
- **4 clips**: ~5-10 secunde
- **32 clips**: ~40-60 secunde
- **100 clips**: ~2-3 minute

Merită timpul extra pentru calitate perfectă! 🎯