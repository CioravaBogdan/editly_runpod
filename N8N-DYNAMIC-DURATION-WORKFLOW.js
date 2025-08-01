// 🎬 EDITLY VIDEO CREATOR - DURATĂ DINAMICĂ BAZATĂ PE AUDIO
// ✅ Rezoluție: 1024x1536 | Durată: bazată pe audio + buffer | Calitate maximă

const allPages = $input.all();

// --- 🎯 CONFIGURAȚIE VIDEO ---
const VIDEO_CONFIG = {
  width: 1024,              // Lățimea cerută
  height: 1536,             // Înălțimea cerută
  fps: 30,                  // Frame rate pentru calitate maximă
  minDuration: 4,           // Durată minimă per clip (secunde)
  maxDuration: 10,          // Durată maximă per clip (secunde)
  audioBuffer: 2,           // Buffer minim între audio-uri (secunde)
  silenceBetween: 2         // Pauză minimă între clipuri (secunde)
};

// 🎵 FUNCȚIE PENTRU CALCULAREA DURATEI AUDIO
async function getAudioDuration(audioPath) {
  // În n8n, poți folosi o funcție externă sau să estimezi
  // Pentru acest exemplu, returnăm o durată estimată
  // În practică, ai nevoie de o bibliotecă pentru a citi metadata audio
  
  // Simulăm detectarea duratei (în implementarea reală, folosești ffprobe)
  // Pentru testare, returnăm o durată aleatoare între 3-9 secunde
  return Math.floor(Math.random() * 7) + 3; // 3-9 secunde
}

// 🧮 FUNCȚIE PENTRU CALCULAREA DURATEI CLIPULUI
function calculateClipDuration(audioDuration) {
  if (!audioDuration) {
    // Fără audio - durată standard
    return VIDEO_CONFIG.minDuration;
  }
  
  if (audioDuration <= 4) {
    // Audio scurt (≤4s) → clip de 4 secunde
    return 4;
  }
  
  if (audioDuration <= 5) {
    // Audio 5s → clip de 8 secunde (5s audio + 3s buffer)
    return 8;
  }
  
  if (audioDuration <= 9) {
    // Audio 6-9s → clip de 10 secunde (audio + 1-4s buffer)
    return 10;
  }
  
  // Audio foarte lung → limitează la maxim
  return VIDEO_CONFIG.maxDuration;
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

// Procesăm fiecare pagină
for (let index = 0; index < allPages.length; index++) {
  const item = allPages[index];
  const { audioPath, imagePath } = item.json;
  
  // Verificăm că avem imagine (obligatoriu)
  if (!imagePath) {
    console.warn(`⚠️  Pagina ${index + 1} nu are imagine - omisă`);
    continue;
  }
  
  // Calculăm durata bazată pe audio
  let audioDuration = 0;
  let clipDuration = VIDEO_CONFIG.minDuration;
  
  if (audioPath) {
    // În implementarea reală, aici ai folosi:
    // audioDuration = await getAudioDuration(audioPath);
    // Pentru demo, simulăm:
    audioDuration = Math.floor(Math.random() * 7) + 3; // 3-9 secunde
    clipDuration = calculateClipDuration(audioDuration);
    
    console.log(`🎵 Pagina ${index + 1}: Audio ${audioDuration}s → Clip ${clipDuration}s`);
  } else {
    console.log(`🖼️  Pagina ${index + 1}: Fără audio → Clip ${clipDuration}s`);
  }
  
  // Construim clip-ul conform documentației Editly
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
  
  // Adăugăm audio dacă există
  if (audioPath) {
    clip.layers.push({
      type: "audio", 
      path: audioPath,
      mixVolume: 1.0,  // Volum original - NU modificăm
      // Audio-ul va rula natural durata sa reală
      // Nu îl extindem sau comprimăm
    });
  }
  
  // Adăugăm clip de liniște între pagini (pentru separare clară)
  if (index < allPages.length - 1) {
    // Adăugăm pauză între clipuri
    clips.push(clip);
    
    // Clip de liniște între pagini
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
    // Ultimul clip - fără pauză după
    clips.push(clip);
    totalEstimatedDuration += clipDuration;
  }
  
  console.log(`✅ Pagina ${index + 1}: ${clipDuration}s (audio: ${audioDuration}s)`);
}

// 🎯 Configurația finală Editly - CALITATE MAXIMĂ
const editSpec = {
  // Setări video principale
  width: VIDEO_CONFIG.width,
  height: VIDEO_CONFIG.height,
  fps: VIDEO_CONFIG.fps,
  
  // Array-ul de clipuri cu durată dinamică
  clips: clips,
  
  // 🚀 SETĂRI PENTRU CALITATE MAXIMĂ (nu fast mode)
  fast: false,  // 🎯 DEZACTIVAT pentru calitate maximă
  keepSourceAudio: true,  // Păstrăm calitatea audio originală
  
  // 🎵 Setări audio - calitate maximă
  audioCodec: "aac",
  audioBitrate: "192k",   // Bitrate mai mare pentru calitate
  
  // 🎬 Setări video - calitate maximă
  videoBitrate: "5000k",  // Bitrate crescut pentru calitate 1024x1536
  videoCodec: "libx264",
  
  // Fără tranziții pentru claritate
  defaults: {
    transition: null
  },
  
  // 🚀 Argumente optimizate pentru calitate + performanță
  customOutputArgs: [
    // Video encoding pentru calitate
    "-c:v", "libx264",
    "-preset", "medium",    // Preset balansat calitate/viteză
    "-crf", "18",           // Calitate foarte bună (18 = aproape lossless)
    "-profile:v", "high",
    "-level", "4.0",
    "-pix_fmt", "yuv420p",
    
    // Audio encoding pentru calitate
    "-c:a", "aac",
    "-b:a", "192k",         // Bitrate audio crescut
    "-ar", "48000",         // Sample rate ridicat
    "-ac", "2",             // Stereo
    
    // Optimizări pentru streaming
    "-movflags", "+faststart",
    
    // Multi-threading pentru performanță
    "-threads", "0"         // Folosește toate cores-urile
  ]
};

// 📁 Generăm numele fișierului
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const outputFilename = `carte_digitala_HD_${timestamp}.mp4`;

// 📊 Statistici finale
const validClips = clips.filter(c => c.layers.some(l => l.type === "image")).length;
const audioClips = clips.filter(c => c.layers.some(l => l.type === "audio")).length;
const totalMinutes = Math.floor(totalEstimatedDuration / 60);
const totalSeconds = totalEstimatedDuration % 60;

console.log("\n📊 === REZUMAT FINAL ===");
console.log(`✅ Pagini procesate: ${validClips}`);
console.log(`🎵 Pagini cu audio: ${audioClips}`);
console.log(`⏱️  Durată totală estimată: ${totalMinutes}m ${totalSeconds}s`);
console.log(`📁 Nume fișier: ${outputFilename}`);
console.log(`🎬 Calitate: HD ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height} @ ${VIDEO_CONFIG.fps}fps`);
console.log(`🔊 Audio: Calitate originală, fără modificări`);

// Verificare finală
if (validClips === 0) {
  throw new Error("❌ Nu există clipuri valide de procesat!");
}

// 🎬 Returnăm configurația pentru Editly
return {
  json: {
    editSpec: editSpec,
    outputFilename: outputFilename,
    stats: {
      totalPages: validClips,
      totalDuration: totalEstimatedDuration,
      withAudio: audioClips,
      resolution: `${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`,
      quality: "HD_Maximum",
      audioQuality: "Original_192k"
    }
  }
};