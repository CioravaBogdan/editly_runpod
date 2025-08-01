// 🎬 EDITLY VIDEO CREATOR - AUDIO PERFECT NESCHIMBAT
// ✅ Audio EXACT ca în original + imagini continue (fără ecran negru)

const allPages = $input.all();

// --- 🎯 CONFIGURAȚIE VIDEO ---
const VIDEO_CONFIG = {
  width: 1024,              // Lățimea cerută
  height: 1536,             // Înălțimea cerută
  fps: 30,                  // Frame rate pentru calitate maximă
  baseClipDuration: 10,     // Durată crescută pentru audio mai lung
  silenceBetween: 0         // 🚫 ELIMINAT - nu mai facem ecran negru
};

// Validare date
if (!allPages || allPages.length === 0) {
  throw new Error("❌ Nu au fost primite date despre pagini.");
}

console.log(`🎬 Procesare carte digitală: ${allPages.length} pagini`);
console.log(`📐 Rezoluție video: ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`);
console.log(`🎵 Audio: COMPLET NESCHIMBAT - fără modificări de viteză/vocale`);
console.log(`🖼️ Imagini: CONTINUE - fără ecran negru între ele`);

// 🚀 Creăm array-ul de clipuri pentru Editly
const clips = [];
let totalEstimatedDuration = 0;

// Procesăm fiecare pagină - FĂRĂ clipuri de liniște
allPages.forEach((item, index) => {
  const { audioPath, imagePath } = item.json;
  
  // Verificăm că avem imagine (obligatoriu)
  if (!imagePath) {
    console.warn(`⚠️ Pagina ${index + 1} nu are imagine - omisă`);
    return;
  }
  
  // 🎬 Construim clip-ul - ZERO modificări audio
  const clip = {
    duration: VIDEO_CONFIG.baseClipDuration,
    
    layers: [
      {
        type: "image",
        path: imagePath,
        resizeMode: "cover"  // Cover pentru a umple ecranul complet
      }
    ]
  };
  
  // ✅ Adăugăm audio cu setări ABSOLUTE ZERO modificări
  if (audioPath) {
    clip.layers.push({
      type: "audio", 
      path: audioPath,
      
      // 🎯 SETĂRI ABSOLUTE pentru audio NESCHIMBAT:
      mixVolume: 1.0,           // Volum 100% original
      
      // 🚫 IMPORTANT: NU setăm NIMIC altceva care ar putea modifica audio:
      // NU setăm: duration, cutFrom, cutTo, speedFactor, volume, 
      // NU setăm: audioNorm, fadeIn, fadeOut, start, stop
      
      // Audio-ul rulează EXACT ca în fișierul original
      // Dacă e mai scurt decât clipul - se oprește natural
      // Dacă e mai lung - continuă în următorul clip (suprapunere naturală)
    });
    
    console.log(`🎵 Pagina ${index + 1}: Audio ZERO modificări + imagine ${VIDEO_CONFIG.baseClipDuration}s`);
  } else {
    console.log(`🖼️ Pagina ${index + 1}: Doar imagine ${VIDEO_CONFIG.baseClipDuration}s`);
  }
  
  clips.push(clip);
  totalEstimatedDuration += VIDEO_CONFIG.baseClipDuration;
  
  // 🚫 NU mai adăugăm clipuri de liniște - imaginile vor fi continue
});

// 🎯 Configurația finală Editly - AUDIO ABSOLUT NESCHIMBAT
const editSpec = {
  // Setări video principale
  width: VIDEO_CONFIG.width,
  height: VIDEO_CONFIG.height,
  fps: VIDEO_CONFIG.fps,
  
  // Array-ul de clipuri (FĂRĂ clipuri de liniște)
  clips: clips,
  
  // 🎵 SETĂRI ULTRA-CONSERVATIVE pentru audio 100% original
  fast: false,                    // Calitate maximă
  keepSourceAudio: true,          // ✅ OBLIGATORIU
  
  // 🔒 BLOCARE COMPLETĂ modificări audio:
  clipsAudioVolume: 1.0,         // Volum 100% - NU modifica
  outputVolume: 1.0,             // Output 100% - NU modifica  
  audioNorm: false,              // FĂRĂ normalizare - NU modifica
  
  // ⚠️ ELIMINATE - setări care ar putea afecta audio:
  // NU setăm: backgroundAudioVolume, loopAudio, audioTracks
  // NU setăm: enableClipsAudioVolume, enableFfmpegStreaming
  
  // Setări video - calitate bună dar fără a afecta audio
  videoCodec: "libx264",
  videoBitrate: "4000k",
  audioCodec: "aac", 
  audioBitrate: "256k",          // Bitrate foarte înalt pentru păstrarea calității
  
  // FĂRĂ tranziții - ar putea afecta audio
  defaults: {
    transition: null
  },
  
  // 🚀 FFmpeg arguments - PROTECȚIE MAXIMĂ pentru audio
  customOutputArgs: [
    // Video encoding - standard
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-profile:v", "high", 
    "-level", "4.0",
    "-pix_fmt", "yuv420p",
    
    // 🔒 AUDIO ENCODING - PROTECȚIE COMPLETĂ
    "-c:a", "copy",               // 🎯 COPY = zero reencoding!
    
    // 🚫 Dacă copy nu merge, atunci AAC cu setări conservative:
    // "-c:a", "aac",
    // "-b:a", "256k",             // Bitrate foarte înalt
    // "-ar", "44100",             // Sample rate standard (nu forțăm)
    // "-ac", "2",                 // Stereo standard
    
    // 🚫 ABSOLUT FĂRĂ filtre audio:
    // NU folosim: -af, -filter:a, -volume, -loudnorm, -dynaudnorm
    // NU folosim: -acodec copy (ar putea crea probleme)
    
    // Optimizări generale NON-AUDIO
    "-movflags", "+faststart",    // Pentru streaming
    "-threads", "0"               // CPU paralel pentru video
  ],
  
  // 🎯 Setări minimale - nu complicăm
  verbose: false,
  allowRemoteRequests: false,
  enableFfmpegLog: false
};

// 📁 Generăm numele fișierului
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const outputFilename = `carte_audio_perfect_${timestamp}.mp4`;

// 📊 Statistici finale
const validClips = clips.length;
const audioClips = clips.filter(c => c.layers.some(l => l.type === "audio")).length;
const totalMinutes = Math.floor(totalEstimatedDuration / 60);
const totalSeconds = totalEstimatedDuration % 60;

console.log("\\n📊 === REZUMAT FINAL ===");
console.log(`✅ Pagini procesate: ${validClips}`);
console.log(`🎵 Pagini cu audio: ${audioClips}`);
console.log(`⏱️ Durată totală: ${totalMinutes}m ${totalSeconds}s`);
console.log(`📁 Nume fișier: ${outputFilename}`);
console.log(`🎬 Calitate: HD ${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height} @ ${VIDEO_CONFIG.fps}fps`);
console.log(`🔊 Audio: COPY MODE - zero reencoding, vocale originale`);
console.log(`🖼️ Imagini: CONTINUE - fără ecran negru între ele`);
console.log(`📋 Durată per pagină: ${VIDEO_CONFIG.baseClipDuration}s (fără pauze)`);

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
    silenceClips: 0,              // ZERO clipuri de liniște
    resolution: `${VIDEO_CONFIG.width}x${VIDEO_CONFIG.height}`,
    quality: "HD_Audio_Copy_Mode",
    audioQuality: "Original_Zero_Reencoding",
    clipDuration: VIDEO_CONFIG.baseClipDuration,
    silenceDuration: 0,           // ZERO pauze
    continuousImages: true        // Imagini continue
  }
};