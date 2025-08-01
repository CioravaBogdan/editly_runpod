#!/usr/bin/env node

import express from 'express';
import multer from 'multer';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';
import editly from './index.js';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow n8n access
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/app/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir('/app/uploads', { recursive: true });
    await fs.mkdir('/outputs', { recursive: true });
    await fs.mkdir('/app/temp', { recursive: true });
  } catch (err) {
    console.error('Error creating directories:', err);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'editly-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get server info
app.get('/info', (req, res) => {
  res.json({
    service: 'Editly Video Editor API',
    version: '1.0.0',
    description: 'HTTP API wrapper for Editly video editing library',
    endpoints: {
      health: 'GET /health',
      info: 'GET /info',
      edit: 'POST /edit',
      upload: 'POST /upload',
      download: 'GET /download/:filename',
      files: 'GET /files',
      audioInfo: 'POST /audio-info'
    },
    documentation: 'https://github.com/mifi/editly'
  });
});

// Get audio file duration and metadata
app.post('/audio-info', async (req, res) => {
  try {
    const { audioPath } = req.body;
    
    if (!audioPath) {
      return res.status(400).json({ error: 'audioPath is required' });
    }
    
    // Use ffprobe to get audio metadata
    const { readDuration, readFileStreams } = await import('./ffmpeg.js');
    
    try {
      const duration = await readDuration(audioPath);
      const streams = await readFileStreams(audioPath);
      const audioStream = streams.find(s => s.codec_type === 'audio');
      
      const audioInfo = {
        duration: Math.round(duration * 100) / 100, // Round to 2 decimals
        hasAudio: !!audioStream,
        codec: audioStream?.codec_name || 'unknown',
        sampleRate: audioStream?.tags?.sample_rate || 'unknown',
        channels: audioStream?.channels || 'unknown',
        bitrate: audioStream?.tags?.bit_rate || 'unknown'
      };
      
      console.log(`🎵 Audio info for ${audioPath}:`, audioInfo);
      
      res.json({
        success: true,
        audioPath: audioPath,
        ...audioInfo
      });
      
    } catch (fileError) {
      console.error(`❌ Error reading audio file ${audioPath}:`, fileError);
      res.status(404).json({ 
        error: 'Could not read audio file',
        audioPath: audioPath,
        details: fileError.message
      });
    }
    
  } catch (error) {
    console.error('Audio info error:', error);
    res.status(500).json({ 
      error: 'Failed to get audio info', 
      details: error.message 
    });
  }
});

// Upload files endpoint
app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = (req.files as Express.Multer.File[]).map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      url: `/uploads/${file.filename}`
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Main edit endpoint with extended timeout
app.post('/edit', async (req, res) => {
  try {
    // Set VERY long timeout for high-quality video processing (45 minutes)
    req.setTimeout(45 * 60 * 1000); // 45 minutes
    res.setTimeout(45 * 60 * 1000); // 45 minutes

    const { editSpec, outputFilename } = req.body;

    if (!editSpec) {
      return res.status(400).json({ error: 'editSpec is required' });
    }

    // Generate output filename if not provided
    const outputName = outputFilename || `output-${Date.now()}.mp4`;
    const outputPath = `/outputs/${outputName}`;

    // Prepare edit specification with output path and GPU acceleration
    const finalEditSpec = {
      ...editSpec,
      outPath: outputPath,
      // ✅ Audio volume configuration - RESPECT USER'S AUDIO SETTINGS
      outputVolume: editSpec.outputVolume || 1.0,      // 🎯 Volum din spec user sau default
      clipsAudioVolume: editSpec.clipsAudioVolume || 1.0,  // 🎯 Volum din spec user sau default
      // 🚀 OPTIMIZĂRI CPU MAXIME pentru performanță (fără GPU)
      ffmpegOptions: {
        input: [
          '-threads', '32',       // 🚀 FORȚEZ 32 threads pentru input
          '-thread_type', 'slice+frame',
          '-hwaccel', 'auto'      // 🚀 Hardware acceleration dacă disponibil
        ],
        output: [
          '-threads', '32',       // 🚀 FORȚEZ 32 threads pentru output
          '-thread_type', 'slice+frame'
        ]
      },
      customOutputArgs: [
        // 🚀 VITEZĂ MAXIMĂ - SACRIFICE QUALITY PENTRU SPEED EXTREME
        '-c:v', 'libx264',        // Encoder CPU standard
        '-preset', 'ultrafast',   // 🚀 ULTRAFAST = viteză extremă
        '-crf', '28',             // 🚀 CRF 28 = calitate mai mică dar MULT mai rapid
        '-profile:v', 'baseline', // 🚀 Baseline = mai simplu, mai rapid
        '-level', '3.0',          // 🚀 Level mai mic pentru viteză
        '-pix_fmt', 'yuv420p',    
        // 🚀 THREADING AGRESIV pentru 32 cores
        '-threads', '32',         // 🚀 FORȚEZ 32 threads
        '-thread_type', 'slice+frame',
        '-slices', '32',          // 🚀 32 slice-uri pentru 32 cores
        '-x264opts', 'sliced-threads=1:me=dia:subme=1:ref=1:fast-pskip=1:no-chroma-me=1:no-mixed-refs=1:no-trellis=1:no-dct-decimate=1:no-fast-pskip=0:no-mbtree=1', // 🚀 ULTRA RAPID
        '-tune', 'zerolatency',   // 🚀 Zero latency pentru viteză maximă
        '-bf', '0',               // 🚀 ZERO B-frames pentru viteză
        '-refs', '1',             // 🚀 1 single reference frame
        '-g', '15',               // 🚀 GOP size mic pentru viteză
        // 🎵 AUDIO SUPER RAPID
        '-c:a', 'aac',            
        '-b:a', '128k',           // 🚀 Bitrate mai mic pentru viteză
        '-ac', '2',               
        '-ar', '44100',           // 🚀 Sample rate standard rapid
        // 🚀 DISABLE ORICE FEATURE SLOW
        '-movflags', '+faststart',// 🚀 Fast start pentru streaming
        '-fflags', '+genpts+igndts', // 🚀 Generate PTS rapid
        '-avoid_negative_ts', 'make_zero', // 🚀 Evită probleme timestamp
      ],
      // 🚀 CONFIGURAȚII PENTRU PERFORMANȚĂ CPU MAXIMĂ  
      fast: false,  // 🎯 DEZACTIVAT pentru performance testing real
      verbose: false,             
      allowRemoteRequests: false, 
      enableFfmpegLog: false,     
      // 🚀 STABILĂ CONCURENȚĂ pentru 64 cores  
      concurrency: 32,                    // 🚀 FORȚEZ 32 concurrent (toate cores)
      frameSourceConcurrency: 32,         // 🚀 32 frame sources paralele
      tempDir: '/app/temp',
      // 🚀 CONFIGURAȚII ULTRA-PERFORMANȚĂ pentru CPU INTENSIV
      enableClipsAudioVolume: true,
      enableFfmpegStreaming: true,
      enableFfmpegMultipass: false,  // Dezactivat pentru viteză maximă
      // 🚀 SETĂRI AVANSATE PENTRU MAXIMIZARE CPU - RESPECT USER'S AUDIO
      keepSourceAudio: editSpec.keepSourceAudio !== undefined ? editSpec.keepSourceAudio : true,  // 🎯 PĂSTREAZĂ din spec sau default TRUE
      keepTempFiles: false,          // 🚀 Șterge temp files pentru economie spațiu
      outDir: '/outputs',            // 🚀 Output directory explicit
      // 🚀 OPTIMIZĂRI SPECIFICE PENTRU 32+ CORES
      logLevel: 'error',             // 🚀 Reduce logging overhead
      enableProgressBar: false       // 🚀 Disable progress bar pentru performance
    };

    console.log('Starting video edit with GPU acceleration:', JSON.stringify(finalEditSpec, null, 2));

    // Execute editly with GPU acceleration
    await editly(finalEditSpec);

    // Check if output file exists
    try {
      await fs.access(outputPath);
      res.json({
        message: 'Video editing completed successfully',
        outputPath: outputPath,
        outputFilename: outputName,
        downloadUrl: `/download/${outputName}`
      });
    } catch (err) {
      throw new Error('Output file was not created');
    }

  } catch (error) {
    console.error('Edit error:', error);
    res.status(500).json({ 
      error: 'Video editing failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Download output files
app.get('/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = `/outputs/${filename}`;

    // Check if file exists
    await fs.access(filePath);

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Stream the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// List files in outputs directory
app.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir('/outputs');
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const filePath = `/outputs/${filename}`;
        const stats = await fs.stat(filePath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          downloadUrl: `/download/${filename}`
        };
      })
    );

    res.json({
      files: fileList,
      count: fileList.length
    });
  } catch (error) {
    console.error('Files list error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get file metadata endpoint
app.get('/metadata/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Try both outputs and uploads directories
    let filePath = `/outputs/${filename}`;
    let fileLocation = 'outputs';
    
    // Check if file exists in outputs first
    try {
      await fs.access(filePath);
    } catch {
      // If not in outputs, try uploads directory
      filePath = `/app/uploads/${filename}`;
      fileLocation = 'uploads';
      
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ 
          error: 'File not found',
          message: `File '${filename}' not found in outputs or uploads directories`
        });
      }
    }
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Use ffprobe to get media metadata
    const ffprobeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    
    try {
      const { stdout } = await execAsync(ffprobeCommand);
      const metadata = JSON.parse(stdout);
      
      // Extract useful information
      const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams?.find((s: any) => s.codec_type === 'audio');
      
      const result = {
        filename,
        fileLocation, // outputs sau uploads
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        duration: parseFloat(metadata.format?.duration || '0'),
        bitrate: parseInt(metadata.format?.bit_rate || '0'),
        format: metadata.format?.format_name,
        video: videoStream ? {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate || '0'),
          bitrate: parseInt(videoStream.bit_rate || '0')
        } : null,
        audio: audioStream ? {
          codec: audioStream.codec_name,
          channels: audioStream.channels,
          sample_rate: parseInt(audioStream.sample_rate || '0'),
          bitrate: parseInt(audioStream.bit_rate || '0')
        } : null,
        downloadUrl: fileLocation === 'outputs' ? `/download/${filename}` : `/uploads/${filename}`
      };
      
      res.json(result);
    } catch (ffprobeError) {
      // If ffprobe fails, return basic file info
      console.warn('FFprobe failed, returning basic file info:', ffprobeError);
      res.json({
        filename,
        fileLocation,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        downloadUrl: fileLocation === 'outputs' ? `/download/${filename}` : `/uploads/${filename}`,
        error: 'Could not extract media metadata'
      });
    }
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to get file metadata' });
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static('/app/uploads'));

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await ensureDirectories();
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Editly API Server running on http://0.0.0.0:${PORT}`);
    console.log(`📖 API Documentation: http://0.0.0.0:${PORT}/info`);
    console.log(`❤️  Health Check: http://0.0.0.0:${PORT}/health`);
  });

  // Set server timeout to 45 minutes for high-quality video processing
  server.timeout = 45 * 60 * 1000; // 45 minutes
  server.keepAliveTimeout = 45 * 60 * 1000; // 45 minutes
  server.headersTimeout = 45 * 60 * 1000 + 1000; // 45 minutes + 1 second
}

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
