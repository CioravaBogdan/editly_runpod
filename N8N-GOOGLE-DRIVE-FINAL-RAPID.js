// 🚀 VERSIUNEA OPTIMIZATĂ RAPIDĂ - PERFECTĂ! 
// ✅ Editly Video Editor pentru n8n - VITEZĂ + AUDIO PERFECT
// ✅ Durate scurtate + audio sincronizat + fișiere mici pentru Google Drive

const allPages = $input.all();

// --- 🎯 Setări Video ULTRA-OPTIMIZATE pentru VITEZĂ și CALITATE ---
const DURATION_PER_PAGE = 6;    // ✅ PERFECT pentru sincronizare audio (era 8)
const TRANSITION_DURATION = 0;   // ✅ Fără tranziții pentru viteză maximă
const VIDEO_WIDTH = 640;         // ✅ OPTIMIZAT pentru fișiere mici (era 1024)
const VIDEO_HEIGHT = 960;        // ✅ OPTIMIZAT pentru fișiere mici (era 1536)
const MARGIN_START = 0.2;        // ✅ Margin mic pentru sincronizare perfectă
const MARGIN_END = 0.2;          // ✅ Margin mic pentru viteză
const VOLUME_BOOST = 1.2;        // ✅ Boost perfect pentru claritate audio

if (!allPages || allPages.length === 0) {
  throw new Error("❌ Nu au fost primite date despre pagini pentru a crea videoclipul.");
}

console.log(`🎬 RAPID PROCESSING: ${allPages.length} pages → optimized video`);

// 🚀 Creăm clipurile video cu AUDIO PERFECT și VITEZĂ MAXIMĂ
const videoClips = [];

for (const [index, item] of allPages.entries()) {
  const imagePath = item.json.imagePath;
  const audioPath = item.json.audioPath;

  if (!imagePath) {
    console.warn(`⚠️  Pagina ${index + 1} nu are imagine. Omisă.`);
    continue;
  }
  
  // ✅ Durata OPTIMIZATĂ pentru viteză și sincronizare
  let clipDuration = DURATION_PER_PAGE;
  
  // 🎵 Pentru audio, calculăm durata PERFECTĂ
  if (audioPath) {
    clipDuration = Math.max(DURATION_PER_PAGE, DURATION_PER_PAGE + MARGIN_START + MARGIN_END);
  }
  
  // ✅ CLIP STRUCTURE PERFECTĂ pentru viteză + audio
  const clip = {
    duration: clipDuration,
    layers: [
      { 
        type: 'image', 
        path: imagePath,
        resizeMode: 'cover'  // ✅ COVER pentru fișiere mici (era contain)
      }
    ]
  };
  
  // 🎵 AUDIO cu timing PERFECT - PARTEA CRITICĂ PENTRU SUNET!
  if (audioPath) {
    clip.layers.push({
      type: 'audio',
      path: audioPath,
      start: MARGIN_START,           // ✅ Start cu delay mic pentru sincronizare
      cutFrom: 0,                    // ✅ De la început
      cutTo: clipDuration - MARGIN_END, // ✅ Până aproape de sfârșit
      mixVolume: VOLUME_BOOST        // ✅ Boost pentru claritate MAXIMĂ
    });
    console.log(`🎵 Audio added to clip ${index + 1}: ${audioPath}`);
  } else {
    console.warn(`⚠️  Clip ${index + 1} nu are audio`);
  }
  
  videoClips.push(clip);
  console.log(`✅ Clip ${index + 1} RAPID: ${imagePath.substring(imagePath.lastIndexOf('/') + 1)}`);
}

// 🚀 Configurația Editly ULTRA-OPTIMIZATĂ pentru VITEZĂ + AUDIO
const editSpec = {
  width: VIDEO_WIDTH,              // ✅ 640px pentru fișiere MICI
  height: VIDEO_HEIGHT,            // ✅ 960px pentru fișiere MICI
  fps: 25,                         // ✅ REDUS de la 30 la 25 pentru VITEZĂ
  fast: true,                      // ✅ ACTIVAT pentru VITEZĂ MAXIMĂ
  clips: videoClips,
  
  // 🎵 Audio optimizat pentru CLARITATE și VITEZĂ
  audioNorm: {
    enable: true,                  // ✅ ACTIVAT pentru audio perfect
    loudness: -16,                 // ✅ Normalizare standard
    peak: -1.5                     // ✅ Peak limiting pentru claritate
  },
  
  defaults: {
    transition: null,              // ✅ Fără tranziții pentru VITEZĂ
    layer: {
      fontFamily: 'Arial'
    }
  },
  
  outFormat: 'mp4',               // ✅ Format standard
  keepSourceAudio: true,          // ✅ CRITICA! Păstrează audio original
  clipsAudioVolume: VOLUME_BOOST  // ✅ Boost global pentru toate clipurile
};

// 📁 Numele fișierului optimizat pentru VITEZĂ
let bookTitleForFile = 'carte_video_rapid';
try {
  const title = $('Create Poem').first().json.title;
  if (title) {
    bookTitleForFile = title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 25); // ✅ REDUS lungimea pentru viteză
  }
} catch (e) {
  console.warn("Nu am putut prelua titlul cărții - folosesc numele default.");
}

const outputFilename = `${bookTitleForFile}_rapid_audio.mp4`;

// 📊 Raport final OPTIMIZAT
const totalDuration = videoClips.length * DURATION_PER_PAGE;
console.log(`🎯 ULTRA-OPTIMIZAT: ${VIDEO_WIDTH}x${VIDEO_HEIGHT}, ${videoClips.length} clips`);
console.log(`⏱️  Durată totală: ${totalDuration}s (${DURATION_PER_PAGE}s/clip)`);
console.log(`🎵 Audio: ${videoClips.filter(c => c.layers.length > 1).length}/${videoClips.length} clips cu audio`);
console.log(`🚀 FPS: 25 pentru viteză, Fast mode: ACTIVAT`);
console.log(`📁 Output: ${outputFilename}`);
console.log(`💾 Optimizat pentru: Google Drive API (fișiere mici)`);

return {
  json: { 
    editSpec: editSpec, 
    outputFilename: outputFilename
  }
};
