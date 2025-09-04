// 🚀 SEGMENT WORKER - PROCESEAZĂ UN SEGMENT VIDEO ÎN PARALEL (Child Process)
import editly from '../dist/index.js';
import fs from 'fs';
import path from 'path';

let segmentEditSpec, segmentIndex;

// Listen for data from parent process
process.on('message', (data) => {
  segmentEditSpec = data.segmentEditSpec;
  segmentIndex = data.segmentIndex;
  processSegment();
});

async function processSegment() {
  
  console.log(`🔥 Worker ${segmentIndex} started processing segment with ${segmentEditSpec.clips.length} clips`);
  
  try {
    // 🚀 CREAZĂ DIRECTORUL TEMP DACĂ NU EXISTĂ
    const tempDir = path.dirname(segmentEditSpec.outPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 🚀 PROCESEAZĂ SEGMENTUL CU EDITLY
    await editly(segmentEditSpec);
    
    // 🚀 VERIFICĂ CĂ FIȘIERUL A FOST CREAT
    if (fs.existsSync(segmentEditSpec.outPath)) {
      const stats = fs.statSync(segmentEditSpec.outPath);
      console.log(`✅ Worker ${segmentIndex} completed: ${segmentEditSpec.outPath} (${Math.round(stats.size / 1024 / 1024)}MB)`);
      
      process.send({
        success: true,
        outputPath: segmentEditSpec.outPath,
        segmentIndex: segmentIndex,
        fileSize: stats.size
      });
    } else {
      throw new Error(`Output file not created: ${segmentEditSpec.outPath}`);
    }
    
  } catch (error) {
    console.error(`❌ Worker ${segmentIndex} failed:`, error.message);
    process.send({
      success: false,
      error: error.message,
      segmentIndex: segmentIndex
    });
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`💥 Worker ${segmentIndex} crashed:`, error);
  process.send({
    success: false,
    error: error.message,
    segmentIndex: segmentIndex
  });
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`💥 Worker ${segmentIndex} unhandled rejection:`, error);
  process.send({
    success: false,
    error: error.message || error.toString(),
    segmentIndex: segmentIndex
  });
  process.exit(1);
});