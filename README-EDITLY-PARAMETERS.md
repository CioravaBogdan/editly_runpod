# 🎬 EDITLY VIDEO EDITOR - DOCUMENTAȚIE COMPLETĂ PARAMETRI ȘI FUNCȚII

## 📖 CUPRINS
- [Configurația Principală](#configurația-principală)
- [Parametri Video](#parametri-video)
- [Parametri Audio](#parametri-audio)
- [Tipuri de Layer-uri](#tipuri-de-layer-uri)
- [Tranziții](#tranziții)
- [Optimizări Performanță](#optimizări-performanță)
- [Exemple Avansate](#exemple-avansate)
- [Configurația Docker](#configurația-docker)

---

## 🔧 CONFIGURAȚIA PRINCIPALĂ

### ConfigurationOptions
```typescript
interface ConfigurationOptions {
  // OBLIGATORIU
  outPath: string;          // Calea de ieșire (.mp4, .mkv, .gif)
  clips: Clip[];           // Lista de clipuri video
  
  // DIMENSIUNI VIDEO
  width?: number;          // Lățimea video (default: 640 sau detectat din primul video)
  height?: number;         // Înălțimea video (default: calculat pe baza aspect ratio)
  fps?: number;            // Frame rate (default: 25 sau detectat din primul video)
  
  // AUDIO
  audioFilePath?: string;  // Calea către audio de fundal
  backgroundAudioVolume?: string | number; // Volumul audio de fundal
  loopAudio?: boolean;     // Loop audio dacă e mai scurt decât video
  keepSourceAudio?: boolean; // Păstrează audio din sursă
  outputVolume?: number | string; // Volumul final (ex: 1, "10dB")
  clipsAudioVolume?: number | string; // Volumul clipurilor (default: 1)
  audioTracks?: AudioTrack[]; // Piste audio arbitrare
  audioNorm?: AudioNormalizationOptions; // Normalizare audio
  
  // OPTIMIZĂRI
  fast?: boolean;          // Mod rapid (rezoluție și FPS mai mici)
  allowRemoteRequests?: boolean; // Permite URL-uri remote
  customOutputArgs?: string[]; // Argumente custom pentru FFmpeg
  
  // SETĂRI DEFAULT
  defaults?: DefaultOptions; // Opțiuni default pentru clips și layer-uri
  
  // DEBUG
  verbose?: boolean;       // Afișează informații detaliate
  logTimes?: boolean;      // Afișează timpii de execuție
  keepTmp?: boolean;       // Păstrează fișierele temporare
  
  // FFMPEG
  ffmpegPath?: string;     // Calea către FFmpeg
  ffprobePath?: string;    // Calea către FFprobe
  enableFfmpegLog?: boolean; // Activează log-urile FFmpeg
}
```

---

## 🎥 PARAMETRI VIDEO

### Clip Structure
```typescript
interface Clip {
  layers: Layer[];         // Lista de layer-uri (obligatoriu)
  duration?: number;       // Durata clip-ului în secunde
  transition?: TransitionOptions | null; // Tranziția la sfârșitul clip-ului
}
```

### Resize Modes
```typescript
type ResizeMode = 
  | "contain"      // Video complet vizibil cu letterbox
  | "contain-blur" // Cu blur în letterbox (default)
  | "cover"        // Video acoperă tot ecranul (crop)
  | "stretch";     // Video întins (aspect ratio ignorat)
```

### Position Types
```typescript
type Position = 
  | "top" | "top-left" | "top-right"
  | "center" | "center-left" | "center-right" 
  | "bottom" | "bottom-left" | "bottom-right"
  | PositionObject;

interface PositionObject {
  x: number;               // Poziție X (0-1)
  y: number;               // Poziție Y (0-1)
  originX?: OriginX;       // Ancora X ("left", "center", "right")
  originY?: OriginY;       // Ancora Y ("top", "center", "bottom")
}
```

---

## 🎵 PARAMETRI AUDIO

### Audio Track
```typescript
interface AudioTrack {
  path: string;            // Calea către fișierul audio
  mixVolume?: number | string; // Volumul relativ (default: 1)
  cutFrom?: number;        // Start în secunde (default: 0)
  cutTo?: number;          // Sfârșitul în secunde
  start?: number;          // Când să înceapă în video (default: 0)
}
```

### Audio Normalization
```typescript
interface AudioNormalizationOptions {
  enable?: boolean;        // Activează normalizarea (default: false)
  gaussSize?: number;      // Mărimea Gauss (default: 5)
  maxGain?: number;        // Gain maxim (default: 30)
}
```

---

## 📑 TIPURI DE LAYER-URI

### 1. 🎬 VIDEO LAYER
```typescript
interface VideoLayer {
  type: "video";
  path: string;            // Calea către video
  resizeMode?: ResizeMode; // Modul de redimensionare
  cutFrom?: number;        // Start în secunde
  cutTo?: number;          // Sfârșitul în secunde
  width?: number;          // Lățimea relativă (0-1)
  height?: number;         // Înălțimea relativă (0-1)
  left?: number;           // Poziția X (0-1)
  top?: number;            // Poziția Y (0-1)
  originX?: OriginX;       // Ancora X
  originY?: OriginY;       // Ancora Y
  mixVolume?: number | string; // Volumul audio
  start?: number;          // Start în clip
  stop?: number;           // Stop în clip
}
```

### 2. 🖼️ IMAGE LAYER
```typescript
interface ImageLayer {
  type: "image";
  path: string;            // Calea către imagine
  resizeMode?: ResizeMode; // Modul de redimensionare
  zoomDirection?: "in" | "out" | "left" | "right" | null; // Ken Burns
  zoomAmount?: number;     // Cantitatea de zoom (default: 0.1)
  start?: number;          // Start în clip
  stop?: number;           // Stop în clip
}
```

### 3. 🎭 TEXT LAYERS

#### Title Layer
```typescript
interface TitleLayer {
  type: "title";
  text: string;            // Textul de afișat
  textColor?: string;      // Culoarea textului (default: "#ffffff")
  fontPath?: string;       // Calea către font (.ttf)
  fontFamily?: string;     // Familia de font
  position?: Position;     // Poziția pe ecran
  fontSize?: number;       // Mărimea fontului
  start?: number;          // Start în clip
  stop?: number;           // Stop în clip
}
```

#### Subtitle Layer
```typescript
interface SubtitleLayer {
  type: "subtitle";
  text: string;            // Textul subtitrat
  textColor?: string;      // Culoarea textului
  fontPath?: string;       // Calea către font
  fontFamily?: string;     // Familia de font
  backgroundColor?: string; // Culoarea fundalului
  delay: number;           // Întârzierea apariției
  speed: number;           // Viteza de apariție
}
```

#### News Title Layer
```typescript
interface NewsTitleLayer {
  type: "news-title";
  text: string;            // Textul titlului
  textColor?: string;      // Culoarea textului
  backgroundColor?: string; // Culoarea fundalului (default: "#d02a42")
  fontPath?: string;       // Calea către font
  position?: Position;     // Poziția pe ecran
  delay: number;           // Întârzierea apariției
  speed: number;           // Viteza de apariție
}
```

#### Slide-in Text Layer
```typescript
interface SlideInTextLayer {
  type: "slide-in-text";
  text: string;            // Textul de afișat
  textColor?: string;      // Culoarea textului
  fontSize?: number;       // Mărimea fontului
  charSpacing?: number;    // Spațierea caracterelor
  position?: Position;     // Poziția pe ecran
  fontPath?: string;       // Calea către font
}
```

### 4. 🎨 BACKGROUND LAYERS

#### Fill Color
```typescript
interface FillColorLayer {
  type: "fill-color";
  color?: string;          // Culoarea de umplere (default: random)
}
```

#### Linear Gradient
```typescript
interface LinearGradientLayer {
  type: "linear-gradient";
  colors?: [string, string]; // Array cu două culori (default: random)
  direction?: "horizontal" | "vertical"; // Direcția gradientului
}
```

#### Radial Gradient
```typescript
interface RadialGradientLayer {
  type: "radial-gradient";
  colors?: [string, string]; // Array cu două culori (default: random)
  centerX?: number;        // Centrul X (0-1)
  centerY?: number;        // Centrul Y (0-1)
  innerRadius?: number;    // Raza interioară (0-1)
  outerRadius?: number;    // Raza exterioară (0-1)
}
```

### 5. 🖼️ IMAGE OVERLAY
```typescript
interface ImageOverlayLayer {
  type: "image-overlay";
  path: string;            // Calea către imagine
  position?: Position;     // Poziția pe ecran
  width?: number;          // Lățimea (0-1)
  height?: number;         // Înălțimea (0-1)
  zoomDirection?: "in" | "out" | "left" | "right" | null; // Ken Burns
  zoomAmount?: number;     // Cantitatea de zoom
}
```

### 6. 🎵 AUDIO LAYERS

#### Audio Layer
```typescript
interface AudioLayer {
  type: "audio";
  path: string;            // Calea către audio
  cutFrom?: number;        // Start în secunde
  cutTo?: number;          // Sfârșitul în secunde
  mixVolume?: number | string; // Volumul relativ
  start?: number;          // Start în clip
  stop?: number;           // Stop în clip
}
```

#### Detached Audio Layer
```typescript
interface DetachedAudioLayer {
  type: "detached-audio";
  path: string;            // Calea către audio
  mixVolume?: number | string; // Volumul relativ
  cutFrom?: number;        // Start în secunde
  cutTo?: number;          // Sfârșitul în secunde
  start?: number;          // Start relativ la clip
}
```

### 7. 🌈 SPECIAL LAYERS

#### Rainbow Colors
```typescript
interface RainbowColorsLayer {
  type: "rainbow-colors";
}
```

#### Pause Layer
```typescript
interface PauseLayer {
  type: "pause";
  color?: string;          // Culoarea fundalului
}
```

#### GL Shader Layer
```typescript
interface GlLayer {
  type: "gl";
  fragmentPath: string;    // Calea către shader fragment (.frag)
  vertexPath?: string;     // Calea către shader vertex (.vert)
  speed?: number;          // Viteza animației
}
```

---

## 🔄 TRANZIȚII

### Transition Options
```typescript
interface TransitionOptions {
  duration?: number;       // Durata tranziției (default: 0.5)
  name?: TransitionType;   // Tipul de tranziție (default: "random")
  audioOutCurve?: CurveType; // Curba fade out audio (default: "tri")
  audioInCurve?: CurveType;  // Curba fade in audio (default: "tri")
  easing?: Easing | null;    // Funcția de easing
  params?: TransitionParams; // Parametri custom
}
```

### Tipuri de Tranziții
```typescript
type TransitionType = 
  | "directional-left"     // Glisare spre stânga
  | "directional-right"    // Glisare spre dreapta
  | "directional-up"       // Glisare în sus
  | "directional-down"     // Glisare în jos
  | "random"               // Tranziție aleatoare
  | "dummy"                // Fără tranziție video (doar audio)
  | string;                // Alte tranziții GL disponibile
```

### Curve Types (Audio)
```typescript
type CurveType = 
  | "tri" | "qsin" | "hsin" | "esin" | "log" | "ipar"
  | "qua" | "cub" | "squ" | "cbr" | "par" | "exp"
  | "iqsin" | "ihsin" | "dese" | "desi" | "losi" | "nofade";
```

---

## ⚡ OPTIMIZĂRI PERFORMANȚĂ

### Fast Mode
```typescript
{
  fast: true,              // Activează modul rapid
  fps: 15,                 // FPS redus pentru viteză
  width: 250,              // Rezoluție redusă
  height: 250              // Calculat automat
}
```

### Custom FFmpeg Arguments
```typescript
{
  customOutputArgs: [
    // Video encoding ultra-rapid
    "-c:v", "libx264",
    "-preset", "ultrafast",  // Cel mai rapid preset
    "-crf", "28",            // Calitate mai mică = viteză mare
    "-threads", "0",         // Toate thread-urile disponibile
    
    // Audio optimizat
    "-c:a", "aac",
    "-b:a", "96k",           // Bitrate mai mic
    "-ar", "22050",          // Sample rate redus
    
    // Optimizări x264
    "-x264-params", "threads=0:sliced-threads=1:frame-threads=8:ref=1:subme=1:me=dia",
    "-movflags", "+faststart",
    "-tune", "fastdecode"
  ]
}
```

### FFmpeg Options
```typescript
{
  ffmpegOptions: {
    input: [
      "-threads", "0",       // Auto-detect thread-uri
      "-hwaccel", "auto"     // Accelerare hardware
    ]
  }
}
```

---

## 🎯 SETĂRI DEFAULT

### Default Options
```typescript
interface DefaultOptions {
  duration?: number;       // Durata default pentru clips (default: 4)
  layer?: {               // Setări default pentru layer-uri
    fontPath?: string;     // Font default
    fontFamily?: string;   // Familia de font default
    [key: string]: unknown; // Alte proprietăți
  };
  layerType?: {           // Setări specifice pe tip de layer
    video?: Partial<VideoLayer>;
    image?: Partial<ImageLayer>;
    title?: Partial<TitleLayer>;
    // etc.
  };
  transition?: TransitionOptions | null; // Tranziția default
}
```

---

## 📝 EXEMPLE AVANSATE

### 1. Video Simplu cu Audio
```json
{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "outPath": "output.mp4",
  "fast": true,
  "clips": [
    {
      "duration": 10,
      "layers": [
        {
          "type": "video",
          "path": "input.mp4",
          "resizeMode": "cover"
        },
        {
          "type": "audio",
          "path": "audio.mp3",
          "mixVolume": 1.5
        }
      ]
    }
  ]
}
```

### 2. Slideshow cu Tranziții
```json
{
  "width": 1280,
  "height": 720,
  "outPath": "slideshow.mp4",
  "clips": [
    {
      "duration": 5,
      "layers": [
        {
          "type": "image",
          "path": "image1.jpg",
          "resizeMode": "contain",
          "zoomDirection": "in",
          "zoomAmount": 0.2
        }
      ],
      "transition": {
        "name": "directional-left",
        "duration": 1.0
      }
    },
    {
      "duration": 5,
      "layers": [
        {
          "type": "image",
          "path": "image2.jpg",
          "resizeMode": "contain",
          "zoomDirection": "out"
        }
      ]
    }
  ],
  "audioFilePath": "background.mp3",
  "loopAudio": true
}
```

### 3. Video cu Overlay și Text
```json
{
  "clips": [
    {
      "duration": 15,
      "layers": [
        {
          "type": "video",
          "path": "background.mp4",
          "resizeMode": "cover"
        },
        {
          "type": "image-overlay",
          "path": "logo.png",
          "position": { "x": 0.9, "y": 0.1 },
          "width": 0.15,
          "height": 0.15
        },
        {
          "type": "title",
          "text": "Titlu Principal",
          "position": "center",
          "fontSize": 72,
          "textColor": "#ffffff"
        },
        {
          "type": "subtitle",
          "text": "Subtitlu explicativ",
          "textColor": "#cccccc",
          "fontSize": 32,
          "delay": 2,
          "speed": 1
        }
      ]
    }
  ]
}
```

### 4. Configurație Ultra-Rapidă
```json
{
  "width": 640,
  "height": 960,
  "fps": 25,
  "fast": true,
  "customOutputArgs": [
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-threads", "0",
    "-c:a", "aac",
    "-b:a", "96k",
    "-ar", "22050"
  ],
  "defaults": {
    "transition": null,
    "duration": 8
  }
}
```

---

## 🔧 API SERVER USAGE

### Upload și Process
```javascript
// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
await fetch('/upload', { method: 'POST', body: formData });

// Process video
const response = await fetch('/edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    editSpec: {
      width: 1920,
      height: 1080,
      clips: [...]
    },
    outputFilename: "my-video.mp4"
  })
});
```

---

## 📋 CHECKLIST OPTIMIZARE

### ✅ Pentru Viteză Maximă:
- [ ] `fast: true`
- [ ] `fps: 25` sau mai puțin
- [ ] `preset: "ultrafast"`
- [ ] `crf: 28` sau mai mare
- [ ] `threads: "0"`
- [ ] Bitrate redus audio/video
- [ ] `audioNorm.enable: false`
- [ ] `transition: null`

### ✅ Pentru Calitate Maximă:
- [ ] `fast: false`
- [ ] `fps: 30` sau 60
- [ ] `preset: "slow"` sau "veryslow"
- [ ] `crf: 18` sau mai mic
- [ ] Bitrate ridicat
- [ ] `audioNorm.enable: true`
- [ ] Tranziții complexe

### ✅ Pentru Audio Perfect:
- [ ] Durata minimă 8-9 secunde per clip
- [ ] `keepSourceAudio: true`
- [ ] Volume adjustment (`mixVolume`, `outputVolume`)
- [ ] Audio normalization activată
- [ ] Evitați tranziții rapide

---

## 🐳 CONFIGURAȚIA DOCKER ACTUALĂ

### Docker Compose Real (docker-compose.yml)
```yaml
services:
  editly:
    container_name: editly-api
    image: editly/editly:latest
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    volumes:
      - "outputs:/outputs"
      - "uploads:/app/uploads"
      - ./examples/assets/:/app/examples/assets/
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DISPLAY=:99
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,video,utility
      
      # 🚀 OPTIMIZĂRI PENTRU MULTI-THREADING MAXIM
      - UV_THREADPOOL_SIZE=64        # CRESCUT la 64 pentru I/O maxim
      - NODE_OPTIONS=--max-old-space-size=24576  # 24GB heap pentru Node.js
      - FFMPEG_THREADS=0             # 🚀 AUTO-DETECT toate cores
      - OMP_NUM_THREADS=32           # 🚀 TOATE cores pentru OpenMP
      - EDITLY_CONCURRENCY=32        # 🚀 CRESCUT la 32 clipuri simultan
      - EDITLY_FRAME_CONCURRENCY=16  # Frame processing paralel maxim
      
      # 🚀 CPU PERFORMANCE BOOST
      - MKL_NUM_THREADS=32           # Intel MKL toate cores
      - NUMEXPR_NUM_THREADS=32       # NumExpr toate cores
      - OPENBLAS_NUM_THREADS=32      # OpenBLAS toate cores
      
    # ✅ GPU ACCELERATION + RESURSE MAXIME (Server High-End)
    deploy:
      resources:
        limits:
          cpus: '30.0'          # Folosește 30 din 32 core-uri
          memory: 28G           # Folosește 28GB din 30.57GB disponibili
        reservations:
          cpus: '16.0'          # Rezervă minimum 16 core-uri
          memory: 16G           # Rezervă minimum 16GB RAM
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    
    # ✅ ALTERNATIV: Pentru Docker Compose versiuni mai vechi
    runtime: nvidia
    command: ["node", "dist/api-server.js"]
    restart: unless-stopped
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    depends_on: []
    tmpfs:
      - /tmp:noexec,nosuid,size=100m

volumes:
  outputs:
  uploads:
```

### Dockerfile Multi-Stage Build
```dockerfile
FROM node:lts-bookworm AS build

# Install dependencies for building canvas/gl
RUN apt-get update -y

RUN apt-get -y install \
    build-essential \
    libcairo2-dev \
    libgif-dev \
    libgl1-mesa-dev \
    libglew-dev \
    libglu1-mesa-dev \
    libjpeg-dev \
    libpango1.0-dev \
    librsvg2-dev \
    libxi-dev \
    pkg-config \
    python-is-python3

WORKDIR /app

# Install node dependencies
COPY package.json ./
RUN npm install --no-fund --no-audit

# Add app source
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

# Purge build dependencies
RUN apt-get --purge autoremove -y \
    build-essential \
    libcairo2-dev \
    libgif-dev \
    libgl1-mesa-dev \
    libglew-dev \
    libglu1-mesa-dev \
    libjpeg-dev \
    libpango1.0-dev \
    librsvg2-dev \
    libxi-dev \
    pkg-config \
    python-is-python3

# Remove Apt cache
RUN rm -rf /var/lib/apt/lists/* /var/cache/apt/*

# Final stage for app image
FROM node:lts-bookworm

# Install runtime dependencies
RUN apt-get update -y \
  && apt-get -y install ffmpeg dumb-init xvfb libcairo2 libpango1.0 libgif7 librsvg2-2 curl \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

WORKDIR /app
COPY --from=build /app /app

# Ensure `editly` binary available in container
RUN npm link

# Create necessary directories
RUN mkdir -p /app/uploads /outputs /app/temp

# Copy and make init script executable
COPY docker-init.sh /docker-init.sh
RUN chmod +x /docker-init.sh

# Expose API port
EXPOSE 3001

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/docker-init.sh", "xvfb-run", "--server-args", "-screen 0 1280x1024x24 -ac"]
CMD [ "node", "dist/api-server.js" ]
```

### Variabile de Mediu Actuale

#### 🎬 Configurații Node.js (Ultra High-End)
```bash
UV_THREADPOOL_SIZE=64                      # Thread pool maxim pentru I/O
NODE_OPTIONS=--max-old-space-size=24576    # 24GB heap JavaScript (!)
```

#### 🚀 Optimizări FFmpeg și GPU
```bash
FFMPEG_THREADS=0                   # Auto-detect toate cores
NVIDIA_VISIBLE_DEVICES=all         # Toate GPU-urile disponibile
NVIDIA_DRIVER_CAPABILITIES=compute,video,utility  # Capabilități complete GPU
DISPLAY=:99                        # Virtual display pentru Xvfb
```

#### 🎯 Configurații Editly (Extreme Performance)
```bash
EDITLY_CONCURRENCY=32              # 32 clipuri procesate simultan (!)
EDITLY_FRAME_CONCURRENCY=16        # 16 frame-uri paralele
```

#### 🔥 CPU Performance Boost (Toate Bibliotecile)
```bash
OMP_NUM_THREADS=32                 # OpenMP toate cores
MKL_NUM_THREADS=32                 # Intel MKL toate cores
NUMEXPR_NUM_THREADS=32             # NumExpr toate cores
OPENBLAS_NUM_THREADS=32            # OpenBLAS toate cores
```

### Resurse Hardware (Configurații pe Nivele)

#### 🚀 Configurația Actuală (Ultra High-End Server)
```yaml
deploy:
  resources:
    limits:
      cpus: '30.0'          # 30 din 32 cores (performance extrem)
      memory: 28G           # 28GB din 30.57GB (aproape tot RAM-ul)
    reservations:
      cpus: '16.0'          # Minim 16 cores garantate
      memory: 16G           # Minim 16GB RAM garantat
```

#### 💻 Pentru Servere Normale (8-16 cores, 16-32GB RAM)
```yaml
deploy:
  resources:
    limits:
      cpus: '12.0'
      memory: 24G
    reservations:
      cpus: '6.0'
      memory: 12G
environment:
  - UV_THREADPOOL_SIZE=32
  - NODE_OPTIONS=--max-old-space-size=8192
  - EDITLY_CONCURRENCY=16
```

#### 🖥️ Pentru Development (4-8 cores, 8-16GB RAM)
```yaml
deploy:
  resources:
    limits:
      cpus: '6.0'
      memory: 12G
    reservations:
      cpus: '3.0'
      memory: 6G
environment:
  - UV_THREADPOOL_SIZE=16
  - NODE_OPTIONS=--max-old-space-size=4096
  - EDITLY_CONCURRENCY=8
```

### Componente Docker Cheie

#### 📦 Multi-Stage Build Benefits
- **Stage 1 (build):** Toate dependențele pentru compilare (canvas, GL)
- **Stage 2 (runtime):** Doar ce e necesar pentru rulare
- **Rezultat:** Imagine optimizată și sigură

#### 🖥️ Virtual Display Setup
- **Xvfb:** Virtual X server pentru operații grafice
- **dumb-init:** Process supervisor pentru containerizare
- **docker-init.sh:** Script custom pentru inițializare

#### 🎮 GPU Support (NVIDIA)
```yaml
runtime: nvidia                    # Docker runtime NVIDIA
devices:
  - driver: nvidia
    count: all
    capabilities: [gpu]
```

#### 📁 Volume și Storage
```yaml
volumes:
  - "outputs:/outputs"              # Video-uri finale (persistent)
  - "uploads:/app/uploads"          # Upload-uri utilizatori (persistent)
  - ./examples/assets/:/app/examples/assets/  # Asset-uri demo (bind mount)
tmpfs:
  - /tmp:noexec,nosuid,size=100m    # Temporary files în RAM
```

---

## 🚀 COMENZI CLI

```bash
# Instalare
npm install -g editly

# Utilizare simplă
editly video1.mp4 video2.mp4 --out output.mp4

# Cu opțiuni
editly --json config.json5 --out result.mp4 --fast --verbose

# Cu parametri
editly title:'Intro' video.mp4 image.jpg title:'Outro' \
  --audio-file-path music.mp3 \
  --font-path font.ttf \
  --width 1920 --height 1080 \
  --fps 30 --fast
```

### Docker Commands
```bash
# Start aplicația
docker compose up -d

# Rebuild după modificări
docker compose up -d --build

# Vezi logs în timp real
docker compose logs -f editly

# Stop aplicația
docker compose down

# Cleanup volumes și rebuild complet
docker compose down -v && docker compose up -d --build

# Debug în container
docker compose exec editly bash

# Monitor resurse
docker stats editly-api
```

---

**🎬 Această documentație acoperă toate parametrii și funcțiile disponibile în Editly Video Editor. Pentru exemple suplimentare, consultați directorul `examples/` din repository.**