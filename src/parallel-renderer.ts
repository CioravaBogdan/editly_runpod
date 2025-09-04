// 🚀 PARALLEL RENDERER - UTILIZEAZĂ TOATE CORES-URILE REAL!
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

interface SegmentJob {
  segmentIndex: number;
  clips: any[];
  outputPath: string;
  segmentDuration: number;
  totalSegments: number;
  editSpec: any;
}

export class ParallelRenderer {
  private maxWorkers = 16; // 🚀 16 CORES PARALELI
  private activeWorkers: ChildProcess[] = [];
  private jobQueue: SegmentJob[] = [];
  private completedSegments: string[] = [];

  constructor() {
    console.log(`🚀 Parallel Renderer initialized with ${this.maxWorkers} workers`);
  }

  async renderParallel(editSpec: any): Promise<string> {
    const startTime = Date.now();
    console.log(`🎬 Starting PARALLEL rendering with ${this.maxWorkers} cores`);

    // 🚀 ÎMPARTE VIDEO-UL ÎN SEGMENTE
    const segments = this.splitIntoSegments(editSpec);
    console.log(`📹 Split into ${segments.length} segments for parallel processing`);

    // 🚀 PROCESEAZĂ TOATE SEGMENTELE ÎN PARALEL
    const segmentPaths = await this.processSegmentsParallel(segments, editSpec);

    // 🚀 CONCATENEAZĂ SEGMENTELE
    const finalPath = await this.concatenateSegments(segmentPaths, editSpec.outPath);

    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`✅ PARALLEL rendering completed in ${processingTime}s using ${this.maxWorkers} cores`);

    return finalPath;
  }

  private splitIntoSegments(editSpec: any): any[] {
    const segments: any[] = [];
    const totalClips = editSpec.clips.length;
    const clipsPerSegment = Math.max(1, Math.ceil(totalClips / this.maxWorkers));

    for (let i = 0; i < totalClips; i += clipsPerSegment) {
      const segmentClips = editSpec.clips.slice(i, i + clipsPerSegment);
      segments.push({
        segmentIndex: segments.length,
        clips: segmentClips,
        startClipIndex: i,
        endClipIndex: Math.min(i + clipsPerSegment - 1, totalClips - 1)
      });
    }

    console.log(`📊 Split ${totalClips} clips into ${segments.length} segments (${clipsPerSegment} clips each)`);
    return segments;
  }

  private async processSegmentsParallel(segments: any[], editSpec: any): Promise<string[]> {
    const promises: Promise<string>[] = [];

    console.log(`🚀 Launching ${segments.length} parallel workers...`);

    for (const segment of segments) {
      const segmentEditSpec = {
        ...editSpec,
        clips: segment.clips,
        outPath: `/app/temp/segment_${segment.segmentIndex}.mp4`
      };

      // 🚀 LANSEAZĂ WORKER PENTRU ACEST SEGMENT
      const promise = this.processSegmentWithWorker(segmentEditSpec, segment.segmentIndex);
      promises.push(promise);
    }

    // 🚀 AȘTEAPTĂ CA TOATE SEGMENTELE SĂ SE TERMINE
    const segmentPaths = await Promise.all(promises);
    console.log(`✅ All ${segmentPaths.length} segments completed in parallel!`);

    return segmentPaths;
  }

  private async processSegmentWithWorker(segmentEditSpec: any, segmentIndex: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // 🚀 Use child process instead of worker threads to avoid Canvas native module issues
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const workerPath = path.join(__dirname, '..', 'src', 'segment-worker.js');
      
      console.log(`🔥 Starting child process ${segmentIndex} for segment processing`);
      
      // Create a child process instead of worker thread
      const child = spawn('node', [workerPath], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env, NODE_ENV: 'production' }
      });

      let stdout = '';
      let stderr = '';

      // Send the segment data to the child process
      child.send({ segmentEditSpec, segmentIndex });

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('message', (result: any) => {
        if (result.success) {
          console.log(`✅ Child process ${segmentIndex} completed: ${result.outputPath}`);
          resolve(result.outputPath);
        } else {
          console.error(`❌ Child process ${segmentIndex} failed: ${result.error}`);
          reject(new Error(result.error));
        }
      });

      child.on('error', (error) => {
        console.error(`💥 Child process ${segmentIndex} error:`, error);
        reject(error);
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          console.error(`🚨 Child process ${segmentIndex} exited with code ${code}`);
          console.error(`Stdout: ${stdout}`);
          console.error(`Stderr: ${stderr}`);
          reject(new Error(`Child process exited with code ${code}: ${stderr}`));
        }
      });
    });
  }

  private async concatenateSegments(segmentPaths: string[], outputPath: string): Promise<string> {
    console.log(`🔗 Concatenating ${segmentPaths.length} segments with FFmpeg...`);

    // 🚀 CREAZĂ LISTA PENTRU FFmpeg CONCAT
    const concatList = segmentPaths.map(path => `file '${path}'`).join('\n');
    const concatFile = '/app/temp/concat_list.txt';
    
    await fs.writeFile(concatFile, concatList);

    return new Promise((resolve, reject) => {
      // 🚀 FFmpeg CONCAT CU TOATE CORES-URILE
      const ffmpegArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFile,
        '-c', 'copy', // 🚀 Copy fără re-encoding
        '-threads', '16', // 🚀 16 threads pentru concat
        '-y',
        outputPath
      ];

      console.log(`🎬 FFmpeg concat command: ffmpeg ${ffmpegArgs.join(' ')}`);

      const ffmpeg = spawn('/usr/local/ffmpeg/bin/ffmpeg', ffmpegArgs);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Concatenation completed: ${outputPath}`);
          this.cleanup(segmentPaths, concatFile);
          resolve(outputPath);
        } else {
          console.error(`❌ FFmpeg concat failed with code: ${code}`);
          reject(new Error(`FFmpeg concat failed with code: ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        console.error('💥 FFmpeg concat error:', error);
        reject(error);
      });
    });
  }

  private async cleanup(segmentPaths: string[], concatFile: string) {
    console.log(`🧹 Cleaning up ${segmentPaths.length} temporary segments...`);
    
    try {
      // 🚀 ȘTERGE SEGMENTELE TEMPORARE
      for (const segmentPath of segmentPaths) {
        await fs.unlink(segmentPath).catch(() => {});
      }
      
      // 🚀 ȘTERGE LISTA CONCAT
      await fs.unlink(concatFile).catch(() => {});
      
      console.log(`✅ Cleanup completed`);
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error);
    }
  }

  destroy() {
    // 🚀 TERMINATE TOATE WORKERS-II
    this.activeWorkers.forEach(worker => {
      worker.terminate();
    });
    this.activeWorkers = [];
    console.log(`🛑 All workers terminated`);
  }
}

export default ParallelRenderer;