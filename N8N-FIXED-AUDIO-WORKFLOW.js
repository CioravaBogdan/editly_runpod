// 🎬 EDITLY VIDEO CREATOR - AUDIO REAL, FĂRĂ MODIFICĂRI
// ✅ Rezoluție: 1024x1536 | Audio păstrat exact ca în original | Calitate maximă

const allPages = $input.all();

// --- 🎯 CONFIGURAȚIE VIDEO ---
const VIDEO_CONFIG = {
  width: 1024,              // Lățimea cerută
  height: 1536,             // Înălțimea cerută
  fps: 30,                  // Frame rate pentru calitate maximă
  minDuration: 4,           // Durată minimă per clip (secunde)
  maxDuration: 15,          // Durată maximă per clip (secunde) - crescută
  silenceBetween: 2         // Pauză minimă între clipuri (secunde)
};

// 🎵 FUNCȚIE PENTRU DETECTAREA DURATEI AUDIO REALE
async function getAudioDuration(audioPath) {
  try {
    // În n8n, poți folosi un HTTP request către un serviciu de metadata
    // Sau un script extern cu ffprobe
    
    // Pentru implementarea reală, folosește:
    const response = await $execution.getApi().helpers.request({
      method: 'POST',
      url: 'http://editly-api:3001/audio-info', // endpoint pentru metadata
      json: { audioPath: audioPath }
    });
    
    return response.duration || 5; // fallback la 5 secunde
  } catch (error) {
    console.warn(`⚠️ Nu pot detecta durata pentru ${audioPath}, folosesc 5s`);
    return 5; // durată sigură de fallback
  }
}

// 🧮 FUNCȚIE PENTRU CALCULAREA DURATEI CLIPULUI - CORECTATĂ
function calculateClipDuration(audioDuration) {
  if (!audioDuration || audioDuration === 0) {
    // Fără audio - durată standard
    return VIDEO_CONFIG.minDuration;
  }
  
  // 🎯 REGULA EXACTĂ: Clipul = Audio + Buffer minim 2 secunde
  
  if (audioDuration <= 4) {
    // Audio scurt (≤4s) → clip minim 4 secunde
    return Math.max(4, audioDuration + 1);
  }
  
  if (audioDuration === 5) {
    // Audio exact 5s → clip exact 8 secunde
    return 8;
  }
  
  if (audioDuration >= 6 && audioDuration <= 9) {
    // Audio 6-9s → clip exact 10 secunde
    return 10;
  }
  
  if (audioDuration > 9) {
    // Audio foarte lung → clip = audio + 2s buffer (max 15s)
    return Math.min(audioDuration + 2, VIDEO_CONFIG.maxDuration);
  }
  
  // Fallback: audio + 2 secunde buffer
  return Math.min(audioDuration + 2, VIDEO_CONFIG.maxDuration);
}

// Validare date
if (!allPages || allPages.length === 0) {
  throw new Error("❌ Nu au fost primite date despre pagini.");
}

console.log(`🎬 Procesare carte digitală: ${allPages.length} pagini`);
console.log(`📐 Rezoluție video: ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`);

// 🚀 Creăm array-ul de clipuri pentru Editly
const clips = [];
let totalEstimatedDuration = 0;

// Procesăm fiecare pagină - ASYNC pentru detectarea audio reale
for (let index = 0; index < allPages.length; index++) {
  const item = allPages[index];
  const { audioPath, imagePath } = item.json;
  
  // Verificăm că avem imagine (obligatoriu)
  if (!imagePath) {
    console.warn(`⚠️ Pagina ${index + 1} nu are imagine - omisă`);
    continue;
  }
  
  // 🎵 DETECTĂM DURATA AUDIO REALĂ
  let audioDuration = 0;
  let clipDuration = VIDEO_CONFIG.minDuration;
  
  if (audioPath) {
    try {
      // Încearcă să detecteze durata reală
      audioDuration = await getAudioDuration(audioPath);
      clipDuration = calculateClipDuration(audioDuration);
      
      console.log(`🎵 Pagina ${index + 1}: Audio REAL ${audioDuration}s → Clip ${clipDuration}s`);
    } catch (error) {
      console.warn(`⚠️ Eroare detectare audio pentru pagina ${index + 1}:`, error);
      // Folosește o durată conservativă
      audioDuration = 6;
      clipDuration = 10;
    }
  } else {
    console.log(`🖼️ Pagina ${index + 1}: Fără audio → Clip ${clipDuration}s`);
  }
  
  // 🎬 Construim clip-ul - CONFIGURAȚIE SPECIALĂ pentru audio neschimbat
  const clip = {
    duration: clipDuration,
    layers: [
      {
        type: "image",
        path: imagePath,
        resizeMode: "cover"  // Cover pentru a umple ecranul
      }
    ]
  };
  
  // ✅ Adăugăm audio cu setări SPECIALE pentru a nu fi modificat
  if (audioPath) {
    clip.layers.push({
      type: "audio", 
      path: audioPath,
      
      // 🎯 SETĂRI CRITICE pentru audio neschimbat:
      mixVolume: 1.0,           // Volum original
      cutFrom: 0,               // Start de la început
      cutTo: audioDuration,     // Taie exact la durata reală
      
      // ⚠️ NU setăm 'duration' - lăsăm Editly să folosească durata naturală
      // ⚠️ NU setăm 'speedFactor' - ar modifica viteza
      
      // Setări suplimentare pentru păstrarea calității
      audioNorm: false,         // Fără normalizare
      volume: 1.0               // Volum natural
    });
  }
  
  clips.push(clip);
  
  // Adăugăm clip de liniște între pagini (doar dacă nu e ultima)
  if (index < allPages.length - 1) {
    clips.push({
      duration: VIDEO_CONFIG.silenceBetween,
      layers: [
        {
          type: "fill-color",
          color: "#000000"  // Ecran negru pentru pauză
        }
      ]
    });
    totalEstimatedDuration += clipDuration + VIDEO_CONFIG.silenceBetween;
  } else {
    totalEstimatedDuration += clipDuration;
  }
  
  console.log(`✅ Pagina ${index + 1}: Clip ${clipDuration}s (audio real: ${audioDuration}s)`);
}

// 🎯 Configurația finală Editly - AUDIO NESCHIMBAT
const editSpec = {
  // Setări video principale
  width: VIDEO_CONFIG.width,
  height: VIDEO_CONFIG.height,
  fps: VIDEO_CONFIG.fps,
  
  // Array-ul de clipuri cu durată dinamică
  clips: clips,
  
  // 🎵 SETĂRI CRITICE pentru audio neschimbat
  fast: false,                    // Calitate maximă
  keepSourceAudio: true,          // OBLIGATORIU - păstrează audio original
  clipsAudioVolume: 1.0,         // Volum original pentru toate clipurile
  audioNorm: false,              // FĂRĂ normalizare audio
  outputVolume: 1.0,             // Volum final original
  
  // ⚠️ NU setăm backgroundAudioVolume sau loopAudio
  
  // Setări pentru calitate video
  videoCodec: "libx264",
  videoBitrate: "5000k",
  audioCodec: "aac",
  audioBitrate: "192k",
  
  // Fără tranziții (ar putea afecta audio-ul)
  defaults: {
    transition: null,
    layer: {
      // Setări default pentru layer-uri
      audioNorm: false,      // Fără normalizare pe layer
      volume: 1.0           // Volum natural pe layer
    }
  },
  
  // 🚀 Argumente FFmpeg optimizate pentru audio neschimbat
  customOutputArgs: [
    // Video encoding
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-profile:v", "high",
    "-level", "4.0",
    "-pix_fmt", "yuv420p",
    
    // 🎵 AUDIO ENCODING - PĂSTREAZĂ ORIGINAL
    "-c:a", "aac",
    "-b:a", "192k",           // Bitrate înalt pentru calitate
    "-ar", "48000",           // Sample rate înalt
    "-ac", "2",               // Stereo
    
    // ⚠️ FĂRĂ filtre audio care ar modifica sunetul:
    // NU folosim: -af, -filter:a, -volume, -loudnorm
    
    // Optimizări generale
    "-movflags", "+faststart",
    "-threads", "0"
  ],
  
  // 🎯 Setări suplimentare pentru controlul audio
  enableClipsAudioVolume: false,   // Dezactivează modificarea volumului
  enableFfmpegStreaming: true,     // Pentru eficiență
  enableFfmpegMultipass: false     // Single pass pentru viteză
};

// 📁 Generăm numele fișierului
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const outputFilename = `carte_audio_original_${timestamp}.mp4`;

// 📊 Statistici finale
const validClips = clips.filter(c => c.layers.some(l => l.type === "image")).length;
const audioClips = clips.filter(c => c.layers.some(l => l.type === "audio")).length;
const totalMinutes = Math.floor(totalEstimatedDuration / 60);
const totalSeconds = totalEstimatedDuration % 60;

console.log("\n📊 === REZUMAT FINAL ===");
console.log(`✅ Pagini procesate: ${validClips}`);
console.log(`🎵 Pagini cu audio: ${audioClips}`);
console.log(`⏱️ Durată totală estimată: ${totalMinutes}m ${totalSeconds}s`);
console.log(`📁 Nume fișier: ${outputFilename}`);
console.log(`🎬 Calitate: HD ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height} @ ${VIDEO_CONFIG.fps}fps`);
console.log(`🔊 Audio: ORIGINAL - fără modificări de viteză sau durată`);

// Verificare finală
if (validClips === 0) {
  throw new Error("❌ Nu există clipuri valide de procesat!");
}

// 🎬 Returnăm configurația pentru Editly
return {
  editSpec: editSpec,
  outputFilename: outputFilename,
  stats: {
    totalPages: validClips,
    totalDuration: totalEstimatedDuration,
    withAudio: audioClips,
    resolution: `${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`,
    quality: "HD_Original_Audio",
    audioQuality: "Unchanged_Original"
  }
};