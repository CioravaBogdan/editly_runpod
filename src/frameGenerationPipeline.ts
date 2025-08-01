import { cpus } from "os";
import pMap from "p-map";
import type { ProcessedClip } from "./parseConfig.js";
import { FrameBufferManager } from "./frameBufferPool.js";

const CPU_CORES = cpus().length;

export interface FrameGenerationTask {
  frameIndex: number;
  fromClipTime: number;
  toClipTime?: number;
  transitionProgress?: number;
  isTransition: boolean;
  transitionFromClipId: number;
  transitionToClipId?: number;
}

export interface GeneratedFrame {
  frameIndex: number;
  frameData: Buffer;
  timestamp: number;
}

export class FrameGenerationPipeline {
  private frameQueue: GeneratedFrame[] = [];
  private isGenerating = false;
  private maxQueueSize: number;
  private frameBufferPool: FrameBufferManager;

  constructor(
    private width: number,
    private height: number,
    private channels: number = 4,
    maxQueueSize?: number
  ) {
    this.maxQueueSize = maxQueueSize ?? Math.min(CPU_CORES * 4, 64);
    this.frameBufferPool = FrameBufferManager.getPool(width, height, channels);
  }

  async generateFramesBatch(
    tasks: FrameGenerationTask[],
    frameSource1: any,
    frameSource2: any,
    runTransitionOnFrame: (params: {
      fromFrame: Buffer;
      toFrame: Buffer;
      progress: number;
    }) => Buffer
  ): Promise<GeneratedFrame[]> {
    if (tasks.length === 0) return [];

    // Pre-generate frames in parallel
    const frames = await pMap(
      tasks,
      async (task): Promise<GeneratedFrame> => {
        const startTime = performance.now();
        
        // Generate from frame
        const fromFrameData = await frameSource1.readNextFrame({ 
          time: task.fromClipTime 
        });

        let outFrameData: Buffer;

        if (task.isTransition && frameSource2 && task.toClipTime !== undefined) {
          // Generate to frame for transition
          const toFrameData = await frameSource2.readNextFrame({ 
            time: task.toClipTime 
          });

          if (toFrameData && task.transitionProgress !== undefined) {
            // Apply transition
            outFrameData = runTransitionOnFrame({
              fromFrame: fromFrameData!,
              toFrame: toFrameData,
              progress: task.transitionProgress,
            });
          } else {
            outFrameData = fromFrameData!;
          }
        } else {
          // No transition, pass through from frame
          outFrameData = fromFrameData!;
        }

        return {
          frameIndex: task.frameIndex,
          frameData: outFrameData,
          timestamp: performance.now() - startTime,
        };
      },
      { 
        concurrency: Math.min(CPU_CORES, tasks.length, 16) // Limit to prevent memory issues
      }
    );

    // Sort frames by index to maintain order
    return frames.sort((a, b) => a.frameIndex - b.frameIndex);
  }

  async startBatchGeneration(
    tasks: FrameGenerationTask[],
    frameSource1: any,
    frameSource2: any,
    runTransitionOnFrame: any
  ): Promise<void> {
    if (this.isGenerating) return;
    
    this.isGenerating = true;
    
    try {
      // Process tasks in batches to manage memory
      const batchSize = Math.min(CPU_CORES * 2, 32);
      
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const frames = await this.generateFramesBatch(
          batch,
          frameSource1,
          frameSource2,
          runTransitionOnFrame
        );
        
        // Add to queue (with backpressure control)
        for (const frame of frames) {
          while (this.frameQueue.length >= this.maxQueueSize) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          this.frameQueue.push(frame);
        }
      }
    } finally {
      this.isGenerating = false;
    }
  }

  getNextFrame(): GeneratedFrame | null {
    return this.frameQueue.shift() || null;
  }

  hasFrames(): boolean {
    return this.frameQueue.length > 0;
  }

  isActive(): boolean {
    return this.isGenerating || this.frameQueue.length > 0;
  }

  getQueueSize(): number {
    return this.frameQueue.length;
  }

  getMaxQueueSize(): number {
    return this.maxQueueSize;
  }

  clear(): void {
    // Release all frame buffers
    for (const frame of this.frameQueue) {
      this.frameBufferPool.releaseBuffer(frame.frameData);
    }
    this.frameQueue = [];
    this.isGenerating = false;
  }

  getStats() {
    return {
      queueSize: this.frameQueue.length,
      maxQueueSize: this.maxQueueSize,
      isGenerating: this.isGenerating,
      averageGenerationTime: this.frameQueue.length > 0 
        ? this.frameQueue.reduce((sum, f) => sum + f.timestamp, 0) / this.frameQueue.length 
        : 0,
    };
  }
}