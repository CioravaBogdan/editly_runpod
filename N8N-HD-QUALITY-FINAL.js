// 🎬 VIDEO CREATOR ULTRA-RAPID - OPTIMIZAT PENTRU VITEZĂ MAXIMĂ
// ⚡ Preset ultrafast + fast mode + optimizări extreme pentru performanță

const allPages = $input.all();

// --- 🎯 CONFIGURAȚIE VIDEO ---
const MIN_DURATION_PER_PAGE = 8;   // Durata MINIMĂ pentru fiecare imagine
const SILENCE_BUFFER = 1;           // 1 secundă de liniște după audio
const VIDEO_WIDTH = 1080;           // HD Width
const VIDEO_HEIGHT = 1920;          // HD Height  
const VIDEO_FPS = 30;               // Frame rate

if (!allPages || allPages.length === 0) {
  throw new Error("❌ Nu au fost primite date despre pagini pentru a crea videoclipul.");
}

console.log(`🎬 Procesare video ULTRA-RAPID: ${allPages.length} pagini`);

// 🎵 Funcție pentru a calcula durata optimă a clip-ului
function calculateOptimalDuration(audioPath) {
  // Dacă nu avem audio, folosim durata minimă
  if (!audioPath) {
    return MIN_DURATION_PER_PAGE;
  }
  
  // Pentru audio, estimăm 6-8 secunde + 1 secundă buffer
  // Total: 9 secunde (sau minim 8 dacă audio e foarte scurt)
  const estimatedAudioDuration = 7; // Estimare conservativă
  const audioWithBuffer = estimatedAudioDuration + SILENCE_BUFFER;
  
  // Returnăm maximul dintre durata minimă și audio + buffer
  return Math.max(MIN_DURATION_PER_PAGE, audioWithBuffer);
}

// 🚀 Creăm clipurile video cu timing perfect
const videoClips = [];

for (const [index, item] of allPages.entries()) {
  const imagePath = item.json.imagePath;
  const audioPath = item.json.audioPath;

  if (!imagePath) {
    console.warn(`⚠️  Pagina ${index + 1} nu are imagine. Omisă.`);
    continue;
  }
  
  // ✅ Calculăm durata optimă pentru clip
  const clipDuration = calculateOptimalDuration(audioPath);
  
  console.log(`📊 Clip ${index + 1}: Durată ${clipDuration}s ${audioPath ? '(cu audio + buffer)' : '(doar imagine)'}`);
  
  // ✅ Structura clip-ului SIMPLĂ cu dimensiuni FORȚATE
  const clip = {
    duration: clipDuration,
    layers: [
      { 
        type: 'image', 
        path: imagePath,
        resizeMode: 'cover',
        // ✅ FORȚEZ dimensiunile exact
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT
      }
    ]
  };
  
  // 🎵 Adăugăm audio dacă există (SIMPLU - fără complicații)
  if (audioPath) {
    clip.layers.push({
      type: 'audio',
      path: audioPath
      // Audio se va opri natural, clip-ul continuă cu silence
    });
    console.log(`   ✅ Audio adăugat: ${audioPath}`);
  } else {
    console.log(`   ⚠️ Fără audio - doar imagine ${MIN_DURATION_PER_PAGE}s`);
  }
  
  videoClips.push(clip);
}

// ⚡ Configurația Editly finală - ULTRA-RAPID cu sacrificarea calității
const editSpec = {
  width: VIDEO_WIDTH,
  height: VIDEO_HEIGHT,
  fps: VIDEO_FPS,
  fast: true,   // ⚡ ACTIVEZ fast mode pentru viteză maximă
  clips: videoClips,
  
  // 🚀 CONFIGURAȚII CPU MAXIME pentru performanță
  ffmpegOptions: {
    input: [
      '-threads', '0',  // Auto-detect toate thread-urile disponibile
    ]
  },
  customOutputArgs: [
    // ⚡ ENCODING ULTRA-RAPID - sacrificăm calitatea pentru VITEZĂ
    '-c:v', 'libx264',        // Codec CPU H.264
    '-preset', 'ultrafast',   // 🚀 CEL MAI RAPID preset (sacrifică calitate)
    '-crf', '28',             // Calitate mai mică = encoding mai rapid
    '-threads', '0',          // TOATE thread-urile CPU
    '-thread_type', 'slice+frame',  // Paralelizare maximă
    
    // 🎵 AUDIO RAPID - bitrate mai mic
    '-c:a', 'aac',
    '-b:a', '96k',            // Bitrate mai mic pentru viteză
    '-ar', '22050',           // Sample rate mai mic = procesare mai rapidă
    '-ac', '2',
    
    // 🚀 OPTIMIZĂRI ULTRA-RAPIDE
    '-x264-params', 'threads=0:sliced-threads=1:frame-threads=8:ref=1:subme=1:me=dia',
    '-movflags', '+faststart',  // Optimizare pentru streaming
    '-tune', 'fastdecode'     // Optimizat pentru decodare rapidă
  ],
  
  defaults: {
    transition: null,  // Fără tranziții automate
    layer: {
      fontFamily: 'Arial',  // ✅ Font simplu
      fontSize: 48
    }
  },
  
  outFormat: 'mp4',
  keepSourceAudio: true,
  audioCodec: 'aac',
  videoBitrate: '1000k',  // ⚡ Bitrate mai mic = encoding mai rapid
  audioBitrate: '96k'     // ⚡ Audio mai mic = procesare mai rapidă
};

// 📁 Numele fișierului
let bookTitleForFile = 'carte_video';
try {
  const title = $('Create Poem').first().json.title;
  if (title) {
    bookTitleForFile = title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
  }
} catch (e) {
  console.warn("Nu am putut prelua titlul cărții.");
}

const outputFilename = `${bookTitleForFile}_ULTRAFAST.mp4`;

// 📊 Raport final
const totalDuration = videoClips.reduce((sum, clip) => sum + clip.duration, 0);
const audioClipsCount = videoClips.filter(c => 
  c.layers.some(l => l.type === 'audio')
).length;

console.log(`\n⚡ === REZUMAT VIDEO ULTRA-RAPID ===`);
console.log(`📐 Rezoluție: ${VIDEO_WIDTH}x${VIDEO_HEIGHT} @ ${VIDEO_FPS}fps`);
console.log(`🎞️  Total clipuri: ${videoClips.length}`);
console.log(`🎵 Clipuri cu audio: ${audioClipsCount}`);
console.log(`⏱️  Durată totală: ${Math.floor(totalDuration / 60)}m ${Math.floor(totalDuration % 60)}s`);
console.log(`🔇 Buffer între clipuri: ${SILENCE_BUFFER}s (automat)`);
console.log(`⚡ MOD: ULTRA-RAPID (preset ultrafast + fast mode)`);
console.log(`🚀 CRF: 28 | Bitrate: 1000k/96k | Sample: 22050Hz`);
console.log(`🔧 x264: ref=1, subme=1, me=dia (optimizare extremă)`);
console.log(`📁 Output: ${outputFilename}`);

// 🔍 Detalii pentru fiecare clip
console.log(`\n📋 DETALII CLIPURI:`);
videoClips.forEach((clip, i) => {
  const hasAudio = clip.layers.some(l => l.type === 'audio');
  console.log(`   Clip ${i + 1}: ${clip.duration}s ${hasAudio ? '(cu audio + buffer)' : '(doar imagine)'}`);
});

return {
  json: { 
    editSpec: editSpec, 
    outputFilename: outputFilename,
    totalDuration: totalDuration,
    clipCount: videoClips.length
  }
};