#!/usr/bin/env node

/**
 * Parallel Processor for Editly
 * Împarte task-urile în bucăți și le procesează în paralel
 */

import express from 'express';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';

const execAsync = promisify(exec);

interface ParallelJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunks: ChunkJob[];
  finalOutput?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface ChunkJob {
  id: string;
  jobId: string;
  chunkIndex: number;
  clips: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputPath?: string;
  workerId?: string;
  error?: string;
}

class ParallelProcessor {
  private jobs: Map<string, ParallelJob> = new Map();
  private workers: string[] = [];
  private maxWorkers: number;
  private basePort: number;

  constructor(maxWorkers: number = 4, basePort: number = 3001) {
    this.maxWorkers = maxWorkers;
    this.basePort = basePort;
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    // Check disponibilitatea worker-ilor
    for (let i = 0; i < this.maxWorkers; i++) {
      const port = this.basePort + i;
      const workerUrl = `http://localhost:${port}`;
      
      try {
        const response = await axios.get(`${workerUrl}/health`, { timeout: 2000 });
        if (response.data.status === 'ok') {
          this.workers.push(workerUrl);
          console.log(`✅ Worker ${i} available at ${workerUrl}`);
        }
      } catch (error) {
        console.log(`⚠️  Worker ${i} not available at ${workerUrl}`);
      }
    }

    if (this.workers.length === 0) {
      console.error('❌ No workers available! Starting single worker...');
      this.workers.push('http://localhost:3001');
    }

    console.log(`📊 Total workers available: ${this.workers.length}`);
  }

  async createJob(editSpec: any): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Împarte clips în chunk-uri
    const clips = editSpec.clips || [];
    const chunkSize = Math.ceil(clips.length / this.workers.length);
    const chunks: ChunkJob[] = [];

    for (let i = 0; i < clips.length; i += chunkSize) {
      const chunkClips = clips.slice(i, i + chunkSize);
      chunks.push({
        id: `chunk-${jobId}-${chunks.length}`,
        jobId,
        chunkIndex: chunks.length,
        clips: chunkClips,
        status: 'pending'
      });
    }

    const job: ParallelJob = {
      id: jobId,
      status: 'pending',
      chunks,
      startTime: Date.now()
    };

    this.jobs.set(jobId, job);
    
    // Start processing async
    this.processJob(jobId, editSpec).catch(console.error);

    return jobId;
  }

  private async processJob(jobId: string, originalSpec: any) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    console.log(`🚀 Starting parallel processing for job ${jobId}`);
    console.log(`   Chunks: ${job.chunks.length}, Workers: ${this.workers.length}`);

    try {
      // Process chunks in parallel
      const chunkPromises = job.chunks.map((chunk, index) => 
        this.processChunk(chunk, originalSpec, this.workers[index % this.workers.length])
      );

      const results = await Promise.all(chunkPromises);

      // Check if all chunks succeeded
      const failedChunks = results.filter(r => !r.success);
      if (failedChunks.length > 0) {
        throw new Error(`${failedChunks.length} chunks failed to process`);
      }

      // Concatenate all chunk outputs
      console.log(`🎬 Concatenating ${results.length} chunks...`);
      const finalOutput = await this.concatenateChunks(
        results.map(r => r.outputPath!),
        jobId,
        originalSpec
      );

      job.status = 'completed';
      job.finalOutput = finalOutput;
      job.endTime = Date.now();

      const duration = (job.endTime - job.startTime!) / 1000;
      console.log(`✅ Job ${jobId} completed in ${duration.toFixed(2)}s`);
      console.log(`   Final output: ${finalOutput}`);

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = Date.now();
      console.error(`❌ Job ${jobId} failed: ${error.message}`);
    }
  }

  private async processChunk(
    chunk: ChunkJob, 
    originalSpec: any, 
    workerUrl: string
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    
    chunk.status = 'processing';
    chunk.workerId = workerUrl;
    
    console.log(`  📦 Processing chunk ${chunk.id} on ${workerUrl}`);

    try {
      // Create spec for this chunk
      const chunkSpec = {
        ...originalSpec,
        clips: chunk.clips,
        // Use ultra-fast settings for chunks
        width: originalSpec.width || 1280,
        height: originalSpec.height || 720,
        fps: originalSpec.fps || 24
      };

      // Send to worker
      const response = await axios.post(`${workerUrl}/edit`, {
        editSpec: chunkSpec,
        outputFilename: `${chunk.id}.mp4`
      }, {
        timeout: 600000 // 10 minutes per chunk
      });

      chunk.status = 'completed';
      chunk.outputPath = response.data.outputPath;
      
      console.log(`  ✅ Chunk ${chunk.id} completed`);
      return { success: true, outputPath: chunk.outputPath };

    } catch (error: any) {
      chunk.status = 'failed';
      chunk.error = error.message;
      
      console.error(`  ❌ Chunk ${chunk.id} failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async concatenateChunks(
    chunkPaths: string[], 
    jobId: string,
    originalSpec: any
  ): Promise<string> {
    
    const outputPath = `/outputs/final-${jobId}.mp4`;
    const listFile = `/tmp/concat-${jobId}.txt`;

    // Create concat list file
    const fileList = chunkPaths.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(listFile, fileList);

    // Build FFmpeg concat command with GPU if available
    const useGpu = process.env.USE_GPU === 'true';
    const encoder = useGpu ? 'h264_nvenc' : 'libx264';
    
    const ffmpegCmd = [
      'ffmpeg',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c:v', encoder,
      useGpu ? '-preset p3' : '-preset fast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath
    ].join(' ');

    console.log(`  🔧 Concatenating with: ${encoder}`);
    await execAsync(ffmpegCmd);

    // Cleanup temp files
    await fs.unlink(listFile);
    
    // Optionally cleanup chunk files
    if (process.env.CLEANUP_CHUNKS === 'true') {
      for (const chunkPath of chunkPaths) {
        try {
          await fs.unlink(chunkPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }

    return outputPath;
  }

  getJob(jobId: string): ParallelJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): ParallelJob[] {
    return Array.from(this.jobs.values());
  }
}

// API Server for Parallel Processing
const app = express();
const PORT = process.env.PARALLEL_PORT || 3100;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const processor = new ParallelProcessor(
  parseInt(process.env.MAX_WORKERS || '4'),
  parseInt(process.env.WORKER_BASE_PORT || '3001')
);

// Create parallel job
app.post('/parallel-edit', async (req, res) => {
  try {
    const { editSpec, preset } = req.body;

    if (!editSpec) {
      return res.status(400).json({ error: 'editSpec is required' });
    }

    // Apply fast preset if specified
    let finalSpec = editSpec;
    if (preset) {
      const { applyPreset } = await import('./api-fast-presets.js');
      finalSpec = applyPreset(editSpec, preset);
    }

    const jobId = await processor.createJob(finalSpec);

    res.json({
      message: 'Parallel job created',
      jobId,
      status: 'processing',
      checkUrl: `/parallel-status/${jobId}`
    });

  } catch (error: any) {
    console.error('Parallel edit error:', error);
    res.status(500).json({ 
      error: 'Failed to create parallel job', 
      details: error.message 
    });
  }
});

// Check job status
app.get('/parallel-status/:jobId', (req, res) => {
  const job = processor.getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const duration = job.endTime 
    ? (job.endTime - job.startTime!) / 1000 
    : (Date.now() - job.startTime!) / 1000;

  res.json({
    jobId: job.id,
    status: job.status,
    duration: duration.toFixed(2),
    chunks: job.chunks.map(c => ({
      id: c.id,
      status: c.status,
      worker: c.workerId
    })),
    finalOutput: job.finalOutput,
    error: job.error
  });
});

// Get all jobs
app.get('/parallel-jobs', (req, res) => {
  const jobs = processor.getAllJobs();
  res.json({
    jobs: jobs.map(j => ({
      id: j.id,
      status: j.status,
      chunksTotal: j.chunks.length,
      chunksCompleted: j.chunks.filter(c => c.status === 'completed').length
    }))
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'editly-parallel-processor',
    workers: processor['workers'].length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Parallel Processor running on port ${PORT}`);
  console.log(`📊 Max workers: ${process.env.MAX_WORKERS || 4}`);
  console.log(`🔧 Worker base port: ${process.env.WORKER_BASE_PORT || 3001}`);
});

export { ParallelProcessor };