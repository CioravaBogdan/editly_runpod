#!/usr/bin/env node

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
      files: 'GET /files'
    },
    documentation: 'https://github.com/mifi/editly'
  });
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

// Main edit endpoint
app.post('/edit', async (req, res) => {
  try {
    const { editSpec, outputFilename } = req.body;

    if (!editSpec) {
      return res.status(400).json({ error: 'editSpec is required' });
    }

    // Generate output filename if not provided
    const outputName = outputFilename || `output-${Date.now()}.mp4`;
    const outputPath = `/outputs/${outputName}`;

    // Prepare edit specification with output path
    const finalEditSpec = {
      ...editSpec,
      outPath: outputPath
    };

    console.log('Starting video edit with spec:', JSON.stringify(finalEditSpec, null, 2));

    // Execute editly
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
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Editly API Server running on http://0.0.0.0:${PORT}`);
    console.log(`📖 API Documentation: http://0.0.0.0:${PORT}/info`);
    console.log(`❤️  Health Check: http://0.0.0.0:${PORT}/health`);
  });
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
