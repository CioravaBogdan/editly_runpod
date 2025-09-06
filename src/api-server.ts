#!/usr/bin/env node

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';
import editly from './index.js';
import ParallelRenderer from './parallel-renderer.js';
import { cleanupService } from './cleanup-service.js';

// 🚀 OPTIMIZARE 16 CORES - Environment variable pentru thread configuration
// Use 0 (auto) by default to let codecs pick optimal threading
const FFMPEG_THREADS = process.env.FFMPEG_THREADS || '0';

// 🌐 CLOUDFLARE TUNNEL - External domain configuration
const EXTERNAL_DOMAIN = process.env.EXTERNAL_DOMAIN || 'https://editly.byinfant.com';

// 🎮 GPU ENCODING TOGGLE
const USE_GPU = String(process.env.USE_GPU || '').toLowerCase() === 'true';
const VIDEO_ENCODER = (process.env.VIDEO_ENCODER || (USE_GPU ? 'h264_nvenc' : 'libx264')).toLowerCase();

// 🚀 PARALLEL PROCESSING TOGGLE - Force enable for true parallelization
const USE_PARALLEL_PROCESSING = String(process.env.USE_PARALLEL_PROCESSING || 'true').toLowerCase() === 'true';

function buildEncoderArgs(encoder: string): string[] {
  if (encoder === 'h264_nvenc') {
    // Safe NVENC defaults focused on speed with reasonable size
    // Ensure ffmpeg has NVENC available: `ffmpeg -hide_banner -encoders | grep nvenc`
    return [
      '-c:v', 'h264_nvenc',
      '-preset', process.env.NVENC_PRESET || 'fast',
      '-cq', process.env.NVENC_CQ || '20',
      '-g', process.env.GOP_SIZE || '120',
      '-bf', '0',
      '-pix_fmt', 'yuv420p',
      // Threads mostly ignored by NVENC, but keep for filters/mux
      '-threads', FFMPEG_THREADS
    ];
  }
  if (encoder === 'hevc_nvenc') {
    return [
      '-c:v', 'hevc_nvenc',
      '-preset', process.env.NVENC_PRESET || 'fast',
      '-cq', process.env.NVENC_CQ || '20',
      '-g', process.env.GOP_SIZE || '120',
      '-bf', '0',
      '-pix_fmt', 'yuv420p',
      '-threads', FFMPEG_THREADS
    ];
  }
  // CPU MAXIMUM PERFORMANCE
  return [
    '-c:v', 'libx264',
    '-preset', 'slow',          // Maximum quality
    '-crf', '10',               // Very high quality (10 = near lossless)
    '-profile:v', 'high',       // High profile supports yuv444p
    '-level', '4.0',            // Higher level for better quality
    '-g', '30',                 // Smaller GOP
    '-bf', '0',                 // No B-frames
    '-refs', '1',               // Single reference
    '-threads', FFMPEG_THREADS || '16',  // Use 16 threads
    '-x264opts', 'threads=16:lookahead_threads=8:sliced_threads=1',
    '-tune', 'zerolatency'      // Zero latency tuning
  ];
}

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// 🚀 INITIALIZE PARALLEL RENDERER FOR REAL 16-CORE PROCESSING
const parallelRenderer = new ParallelRenderer();

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
    runtime: {
      externalDomain: EXTERNAL_DOMAIN,
      useGpu: USE_GPU,
      videoEncoder: VIDEO_ENCODER,
      ffmpegThreads: FFMPEG_THREADS
    },
    cleanup: {
      autoCleanupEnabled: true,
      cleanupAfterHours: 2,
      checkIntervalMinutes: 15,
      directories: ['/outputs', '/app/uploads', '/app/temp', '/app/files', '/tmp']
    },
    endpoints: {
      health: 'GET /health',
      info: 'GET /info',
      edit: 'POST /edit',
      upload: 'POST /upload',
      download: 'GET /download/:filename',
      files: 'GET /files',
      audioInfo: 'POST /audio-info',
      cleanup: 'POST /cleanup',
      diskUsage: 'GET /disk-usage'
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

  // 🔧 ROBUST FILTER FOR PROBLEMATIC FFmpeg PARAMETERS FROM CLIENT REQUESTS
    // Remove frame_threads, duplicate threads, and other problematic parameters
    let clientCustomArgs = [];
    if (editSpec.customOutputArgs && Array.isArray(editSpec.customOutputArgs)) {
      console.log(`🔍 Processing ${editSpec.customOutputArgs.length} client customOutputArgs...`);
      
      const problematicParams = [
        '-frame_threads', '-frame-threads',  // Direct frame_threads parameters
        '-thread_type', // We'll set our own thread_type
      ];
      
      for (let i = 0; i < editSpec.customOutputArgs.length; i++) {
        const arg = editSpec.customOutputArgs[i];
        
        // Skip problematic parameters entirely
        if (problematicParams.includes(arg)) {
          console.log(`🚫 SKIPPED problematic parameter: ${arg}`);
          if (i + 1 < editSpec.customOutputArgs.length) {
            console.log(`🚫 SKIPPED its value: ${editSpec.customOutputArgs[i + 1]}`);
            i++; // Skip the next argument (parameter value)
          }
          continue;
        }
        
        // Process x264opts parameter to remove frame_threads
        if (arg === '-x264opts' && i + 1 < editSpec.customOutputArgs.length) {
          const nextArg = editSpec.customOutputArgs[i + 1];
          if (typeof nextArg === 'string') {
            // Remove frame_threads and any thread-related options that conflict
            let cleanedOpts = nextArg
              .replace(/:?frame_threads=\d+/g, '')     // Remove frame_threads=X
              .replace(/:?sliced-threads=\d+/g, '')    // Remove sliced-threads=X  
              .replace(/:?lookahead_threads=\d+/g, '') // Remove lookahead_threads=X (will add our own)
              .replace(/^:+|:+$/g, '')                 // Clean up leading/trailing colons
              .replace(/:+/g, ':')                     // Clean up multiple colons
              .replace(/^:$/, '');                     // Remove if only colon left
            
            // If we cleaned everything out, skip this parameter entirely
            if (!cleanedOpts || cleanedOpts === '') {
              console.log(`🚫 SKIPPED empty x264opts after cleaning: "${nextArg}"`);
              i++; // Skip the next argument too
              continue;
            }
            
            console.log(`🔧 CLEANED x264opts: "${nextArg}" -> "${cleanedOpts}"`);
            clientCustomArgs.push(arg);
            clientCustomArgs.push(cleanedOpts);
            i++; // Skip next argument since we processed it
            continue;
          }
        }
        
        // Skip duplicate -threads parameters (we set our own)
        if (arg === '-threads') {
          console.log(`🚫 SKIPPED duplicate threads parameter from client`);
          if (i + 1 < editSpec.customOutputArgs.length) {
            console.log(`🚫 SKIPPED threads value: ${editSpec.customOutputArgs[i + 1]}`);
            i++; // Skip the next argument (thread count)
          }
          continue;
        }
        
        // Copy all other arguments unchanged
        clientCustomArgs.push(arg);
      }
      
      console.log(`✅ Client args filtered: ${editSpec.customOutputArgs.length} -> ${clientCustomArgs.length} final args`);
    }

  // Prepare edit specification with output path and GPU/CPU encoder selection
  const videoEncoderArgs = buildEncoderArgs(VIDEO_ENCODER);
    const finalEditSpec = {
      ...editSpec,
      outPath: outputPath,
      // ✅ Audio volume configuration - RESPECT USER'S AUDIO SETTINGS
      outputVolume: editSpec.outputVolume || 1.0,      // 🎯 Volum din spec user sau default
      clipsAudioVolume: editSpec.clipsAudioVolume || 1.0,  // 🎯 Volum din spec user sau default
      // 🚀 OPTIMIZĂRI CPU MAXIME pentru 16 cores
      ffmpegOptions: {
        input: [
          '-threads', FFMPEG_THREADS,       // 🚀 FORȚEZ 16 threads pentru input
          '-thread_type', 'slice+frame',
          '-hwaccel', 'auto'      // 🚀 Hardware acceleration dacă disponibil
        ],
        output: [
          '-threads', FFMPEG_THREADS,       // 🚀 FORȚEZ 16 threads pentru output
          '-thread_type', 'slice+frame'
        ]
      },
      customOutputArgs: [
        ...videoEncoderArgs,
        // 🎬 VIDEO QUALITY SETTINGS
        '-b:v', '10M',                  // High video bitrate (10 Mbps)
        '-maxrate', '15M',               // Max bitrate 15 Mbps
        '-bufsize', '20M',               // Buffer size for quality
        '-pix_fmt', 'yuv420p',           // Compatible pixel format with baseline profile
        // 🎵 AUDIO
        '-c:a', 'aac',
        '-b:a', process.env.AUDIO_BITRATE || '320k',  // Maximum audio quality
        '-ac', '2',
        '-ar', '48000',                  // Higher sample rate
        // Flags utile pentru playback
        '-movflags', '+faststart',
        '-fflags', '+genpts+igndts',
        '-avoid_negative_ts', 'make_zero',
        // 🔧 MERGE CLIENT CUSTOM ARGS (after filtering problematic parameters)
        ...clientCustomArgs,
      ],
      // 🚀 CONFIGURAȚII PENTRU CALITATE MAXIMĂ  
      fast: false,  // Dezactivat pentru calitate maximă
      verbose: false,             
      allowRemoteRequests: false, 
      enableFfmpegLog: false,     
      // 🚀 OPTIMĂ PARALELIZARE pentru 16 cores
      concurrency: 1,                     // 🚀 Un singur video la momentul dat
      frameSourceConcurrency: 16,         // 🚀 16 frame sources paralele  
      frameRenderConcurrency: 16,         // 🚀 16 frame renders paralele
      enableFfmpegLog: false,              // 🚀 Disable pentru performance
      canvasRenderingConcurrency: 16,     // 🚀 16 canvas renders paralele
      tempDir: '/app/temp',
      // 🚀 CONFIGURAȚII ULTRA-PERFORMANȚĂ pentru CPU INTENSIV
      enableClipsAudioVolume: true,
      enableFfmpegStreaming: true,
      enableFfmpegMultipass: false,  // Dezactivat pentru viteză maximă
      // 🚀 SETĂRI AVANSATE PENTRU MAXIMIZARE CPU - RESPECT USER'S AUDIO
      keepSourceAudio: editSpec.keepSourceAudio !== undefined ? editSpec.keepSourceAudio : true,  // 🎯 PĂSTREAZĂ din spec sau default TRUE
      keepTempFiles: false,          // 🚀 Șterge temp files pentru economie spațiu
      outDir: '/outputs',            // 🚀 Output directory explicit
      // 🚀 OPTIMIZĂRI SPECIFICE PENTRU 16 CORES
      logLevel: 'error',             // 🚀 Reduce logging overhead
      enableProgressBar: false       // 🚀 Disable progress bar pentru performance
    };

    console.log('Starting video edit with', USE_PARALLEL_PROCESSING ? 'PARALLEL 16-CORE' : 'STANDARD', 'processing:', JSON.stringify(finalEditSpec, null, 2));

    // 🚀 USE PARALLEL RENDERER FOR REAL 16-CORE PROCESSING
    if (USE_PARALLEL_PROCESSING && finalEditSpec.clips && finalEditSpec.clips.length > 1) {
      console.log(`🚀 Using ParallelRenderer for ${finalEditSpec.clips.length} clips across 16 cores`);
      await parallelRenderer.renderParallel(finalEditSpec);
    } else {
      console.log('🔄 Using standard Editly (single-core)');
      await editly(finalEditSpec);
    }

    // Check if output file exists
    try {
      await fs.access(outputPath);
      res.json({
        message: 'Video editing completed successfully',
        outputPath: outputPath,
        outputFilename: outputName,
        downloadUrl: `${EXTERNAL_DOMAIN}/download/${outputName}`
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
          downloadUrl: `${EXTERNAL_DOMAIN}/download/${filename}`
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
        downloadUrl: fileLocation === 'outputs' ? `${EXTERNAL_DOMAIN}/download/${filename}` : `${EXTERNAL_DOMAIN}/uploads/${filename}`
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
        downloadUrl: fileLocation === 'outputs' ? `${EXTERNAL_DOMAIN}/download/${filename}` : `${EXTERNAL_DOMAIN}/uploads/${filename}`,
        error: 'Could not extract media metadata'
      });
    }
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to get file metadata' });
  }
});

// 🧹 CLEANUP ENDPOINTS
// Manual cleanup endpoint
app.post('/cleanup', async (req, res) => {
  try {
    const result = await cleanupService.manualCleanup();
    res.json({
      success: true,
      message: 'Cleanup completed',
      filesDeleted: result.filesDeleted,
      sizeFreed: result.sizeFreed
    });
  } catch (error: any) {
    console.error('Manual cleanup error:', error);
    res.status(500).json({ 
      error: 'Cleanup failed', 
      details: error.message 
    });
  }
});

// Get disk usage endpoint
app.get('/disk-usage', async (req, res) => {
  try {
    const usage = await cleanupService.getDiskUsage();
    res.json({
      success: true,
      diskUsage: usage,
      cleanupAfterHours: 2
    });
  } catch (error: any) {
    console.error('Disk usage error:', error);
    res.status(500).json({ 
      error: 'Failed to get disk usage', 
      details: error.message 
    });
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
  
  // Start cleanup service
  cleanupService.start();
  console.log('🧹 Cleanup service started - files will be automatically deleted after 2 hours');
  
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
  cleanupService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  cleanupService.stop();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
