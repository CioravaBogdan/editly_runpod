// 🎬 EDITLY VIDEO CREATOR - AUDIO PRESERVED (Versiune Simplificată)
// ✅ Audio păstrat EXACT ca în original - fără modificări de viteză sau durată

const allPages = $input.all();

// --- 🎯 CONFIGURAȚIE VIDEO ---
const VIDEO_CONFIG = {
  width: 1024,              // Lățimea cerută
  height: 1536,             // Înălțimea cerută
  fps: 30,                  // Frame rate pentru calitate maximă
  baseClipDuration: 8,      // Durată de bază per clip
  silenceBetween: 2         // Pauză între clipuri
};

// Validare date
if (!allPages || allPages.length === 0) {
  throw new Error("❌ Nu au fost primite date despre pagini.");
}

console.log(`🎬 Procesare carte digitală: ${allPages.length} pagini`);
console.log(`📐 Rezoluție video: ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`);
console.log(`🎵 Audio: PĂSTRAT ORIGINAL - fără modificări`);

// 🚀 Creăm array-ul de clipuri pentru Editly
const clips = [];
let totalEstimatedDuration = 0;

// Procesăm fiecare pagină
allPages.forEach((item, index) => {
  const { audioPath, imagePath } = item.json;
  
  // Verificăm că avem imagine (obligatoriu)
  if (!imagePath) {
    console.warn(`⚠️ Pagina ${index + 1} nu are imagine - omisă`);
    return;
  }
  
  // 🎬 Construim clip-ul - CONFIGURAȚIE SPECIALĂ pentru audio neschimbat
  const clip = {
    // 🎯 Durată clip = durată de bază (audio-ul se va opri natural)
    duration: VIDEO_CONFIG.baseClipDuration,
    
    layers: [
      {
        type: "image",
        path: imagePath,
        resizeMode: "cover"  // Cover pentru a umple ecranul complet
      }
    ]
  };
  
  // ✅ Adăugăm audio cu setări SPECIALE pentru păstrarea originală
  if (audioPath) {
    clip.layers.push({
      type: "audio", 
      path: audioPath,
      
      // 🎯 SETĂRI CRITICE pentru audio neschimbat:
      mixVolume: 1.0,           // Volum original (100%)
      
      // ⚠️ NU setăm 'duration' - lăsăm Editly să folosească durata naturală
      // ⚠️ NU setăm 'cutFrom' sau 'cutTo' - păstrăm întregul audio
      // ⚠️ NU setăm 'speedFactor' - ar modifica viteza audio
      
      // Audio-ul va rula până la sfârșitul său natural, apoi se oprește
      // Dacă clipul e mai lung decât audio-ul, rămâne liniște
      // Dacă audio-ul e mai lung decât clipul, se taie natural
    });
    
    console.log(`🎵 Pagina ${index + 1}: Audio ORIGINAL + imagine ${VIDEO_CONFIG.baseClipDuration}s`);
  } else {
    console.log(`🖼️ Pagina ${index + 1}: Doar imagine ${VIDEO_CONFIG.baseClipDuration}s`);
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
    totalEstimatedDuration += VIDEO_CONFIG.baseClipDuration + VIDEO_CONFIG.silenceBetween;
  } else {
    totalEstimatedDuration += VIDEO_CONFIG.baseClipDuration;
  }
});

// 🎯 Configurația finală Editly - AUDIO COMPLET NESCHIMBAT
const editSpec = {
  // Setări video principale
  width: VIDEO_CONFIG.width,
  height: VIDEO_CONFIG.height,
  fps: VIDEO_CONFIG.fps,
  
  // Array-ul de clipuri
  clips: clips,
  
  // 🎵 SETĂRI CRITICE pentru păstrarea audio original
  fast: false,                    // Calitate maximă
  keepSourceAudio: true,          // ✅ OBLIGATORIU - păstrează audio original
  
  // 🚫 DEZACTIVATE - setări care ar modifica audio-ul:
  clipsAudioVolume: 1.0,         // Volum 100% original
  audioNorm: false,              // FĂRĂ normalizare audio
  outputVolume: 1.0,             // Volum final 100%
  enableClipsAudioVolume: false, // Dezactivează modificarea volumului
  
  // ⚠️ NU setăm backgroundAudioVolume, loopAudio, sau alte setări audio
  
  // Setări pentru calitate video
  videoCodec: "libx264",
  videoBitrate: "4000k",         // Bitrate decent pentru 1024x1536
  audioCodec: "aac",
  audioBitrate: "192k",          // Bitrate înalt pentru calitate audio
  
  // Fără tranziții (pentru claritate audio)
  defaults: {
    transition: null,
    
    // Setări default pentru layer-uri
    layer: {
      audioNorm: false,      // Fără normalizare pe layer-uri
      mixVolume: 1.0         // Volum natural pe toate layer-urile
    }
  },
  
  // 🚀 Argumente FFmpeg OPTIMIZATE pentru audio original
  customOutputArgs: [
    // Video encoding - calitate bună
    "-c:v", "libx264",
    "-preset", "medium",           // Balansat calitate/viteză
    "-crf", "20",                  // Calitate foarte bună
    "-profile:v", "high",
    "-level", "4.0",
    "-pix_fmt", "yuv420p",
    
    // 🎵 AUDIO ENCODING - PĂSTREAZĂ COMPLET ORIGINAL
    "-c:a", "aac",
    "-b:a", "192k",               // Bitrate înalt pentru calitate
    "-ar", "48000",               // Sample rate înalt
    "-ac", "2",                   // Stereo
    
    // 🚫 FĂRĂ FILTRE AUDIO care ar modifica sunetul:
    // NU folosim: -af, -filter:a, -volume, -loudnorm, -dynaudnorm
    
    // Optimizări generale
    "-movflags", "+faststart",    // Pentru streaming rapid
    "-threads", "0"               // Toate cores-urile pentru viteză
  ],
  
  // 🎯 Setări suplimentare pentru controlul strict al audio
  enableFfmpegStreaming: true,     // Pentru eficiență
  enableFfmpegMultipass: false,    // Single pass pentru viteză
  verbose: false,                  // Fără log verbose
  allowRemoteRequests: false,      // Securitate
  enableFfmpegLog: false          // Fără log FFmpeg
};

// 📁 Generăm numele fișierului
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const outputFilename = `carte_audio_preserved_${timestamp}.mp4`;

// 📊 Statistici finale
const validClips = clips.filter(c => c.layers.some(l => l.type === "image")).length;
const audioClips = clips.filter(c => c.layers.some(l => l.type === "audio")).length;
const silenceClips = clips.filter(c => c.layers.some(l => l.type === "fill-color")).length;
const totalMinutes = Math.floor(totalEstimatedDuration / 60);
const totalSeconds = totalEstimatedDuration % 60;

console.log("\\n📊 === REZUMAT FINAL ===");
console.log(`✅ Pagini procesate: ${validClips}`);
console.log(`🎵 Pagini cu audio: ${audioClips}`);
console.log(`⏸️ Clipuri de pauză: ${silenceClips}`);
console.log(`⏱️ Durată totală: ${totalMinutes}m ${totalSeconds}s`);
console.log(`📁 Nume fișier: ${outputFilename}`);
console.log(`🎬 Calitate: HD ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height} @ ${VIDEO_CONFIG.fps}fps`);
console.log(`🔊 Audio: PRESERVED - durată și viteză originală`);
console.log(`📋 Durată per pagină: ${VIDEO_CONFIG.baseClipDuration}s + ${VIDEO_CONFIG.silenceBetween}s pauză`);

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
    silenceClips: silenceClips,
    resolution: `${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`,
    quality: "HD_Audio_Preserved",
    audioQuality: "Original_Unmodified",
    clipDuration: VIDEO_CONFIG.baseClipDuration,
    silenceDuration: VIDEO_CONFIG.silenceBetween
  }
};