import { cpus } from "os";
import pMap from "p-map";
import type { ProcessedClip } from "./parseConfig.js";

const CPU_CORES = cpus().length;

export interface FrameRenderingContext {
  width: number;
  height: number;
  channels: number;
  fps: number;
  clips: ProcessedClip[];
  frameSource1: any;
  frameSource2: any;
  getTransitionFromClip: () => ProcessedClip;
  getTransitionToClip: () => ProcessedClip | undefined;
  getTransitionFromSource: () => Promise<any>;
  getTransitionToSource: () => Promise<any>;
}

export interface FrameRenderTask {
  frameIndex: number;
  fromClipFrameAt: number;
  toClipFrameAt: number;
  transitionFromClipId: number;
  fromClipTime: number;
  toClipTime?: number;
  isInTransition: boolean;
  transitionProgress?: number;
}

export class ParallelFrameRenderer {
  private context: FrameRenderingContext;
  private renderQueue: FrameRenderTask[] = [];
  private completedFrames = new Map<number, Buffer>();
  private maxConcurrency: number;

  constructor(context: FrameRenderingContext) {
    this.context = context;
    this.maxConcurrency = Math.min(CPU_CORES, 16); // Limit to prevent memory overflow
  }

  // Pre-calculate multiple frames for parallel processing
  calculateFrameBatch(
    startFrameIndex: number,
    batchSize: number,
    fromClipFrameAt: number,
    toClipFrameAt: number,
    transitionFromClipId: number
  ): FrameRenderTask[] {
    const tasks: FrameRenderTask[] = [];
    const { fps, clips } = this.context;

    for (let i = 0; i < batchSize; i++) {
      const frameIndex = startFrameIndex + i;
      const currentFromClipFrameAt = fromClipFrameAt + i;
      const currentToClipFrameAt = toClipFrameAt + i;

      const transitionFromClip = clips[transitionFromClipId];
      const transitionToClip = clips[transitionFromClipId + 1];
      
      if (!transitionFromClip) break;

      const fromClipNumFrames = Math.round(transitionFromClip.duration * fps);
      const toClipNumFrames = transitionToClip ? Math.round(transitionToClip.duration * fps) : 0;
      
      const fromClipProgress = currentFromClipFrameAt / fromClipNumFrames;
      const toClipProgress = transitionToClip ? currentToClipFrameAt / toClipNumFrames : 0;
      
      const fromClipTime = transitionFromClip.duration * fromClipProgress;
      const toClipTime = transitionToClip ? transitionToClip.duration * toClipProgress : undefined;

      const currentTransition = transitionFromClip.transition;
      const transitionNumFrames = Math.round(currentTransition.duration * fps);
      const transitionNumFramesSafe = Math.floor(
        Math.min(
          Math.min(fromClipNumFrames, toClipNumFrames || Number.MAX_SAFE_INTEGER) / 2,
          transitionNumFrames,
        ),
      );
      
      const transitionFrameAt = currentFromClipFrameAt - (fromClipNumFrames - transitionNumFramesSafe);
      const isInTransition = transitionToClip && transitionNumFramesSafe > 0 && transitionFrameAt >= 0;
      const transitionProgress = isInTransition ? transitionFrameAt / transitionNumFramesSafe : undefined;

      tasks.push({
        frameIndex,
        fromClipFrameAt: currentFromClipFrameAt,
        toClipFrameAt: currentToClipFrameAt,
        transitionFromClipId,
        fromClipTime,
        toClipTime,
        isInTransition,
        transitionProgress,
      });
    }

    return tasks;
  }

  // Render frames in parallel
  async renderFramesBatch(tasks: FrameRenderTask[]): Promise<Map<number, Buffer>> {
    const results = new Map<number, Buffer>();
    
    if (tasks.length === 0) return results;

    // Process frames in parallel
    const renderedFrames = await pMap(
      tasks,
      async (task): Promise<{ frameIndex: number; frameData: Buffer }> => {
        const { frameSource1, frameSource2 } = this.context;
        
        // Read frame from source 1
        const frameSource1Data = await frameSource1.readNextFrame({ 
          time: task.fromClipTime 
        });

        let outFrameData = frameSource1Data;

        if (task.isInTransition && frameSource2 && task.toClipTime !== undefined) {
          // Read frame from source 2 for transition
          const frameSource2Data = await frameSource2.readNextFrame({ 
            time: task.toClipTime 
          });

          if (frameSource2Data && task.transitionProgress !== undefined) {
            const transitionFromClip = this.context.clips[task.transitionFromClipId];
            const currentTransition = transitionFromClip.transition;
            const runTransitionOnFrame = currentTransition.create({ 
              width: this.context.width, 
              height: this.context.height, 
              channels: this.context.channels 
            });

            // Apply transition
            outFrameData = runTransitionOnFrame({
              fromFrame: frameSource1Data,
              toFrame: frameSource2Data,
              progress: task.transitionProgress,
            });
          }
        }

        return {
          frameIndex: task.frameIndex,
          frameData: outFrameData,
        };
      },
      { concurrency: this.maxConcurrency }
    );

    // Store results
    for (const frame of renderedFrames) {
      results.set(frame.frameIndex, frame.frameData);
    }

    return results;
  }

  // Process frames with improved parallelization  
  async processFramesParallel(
    startFrameIndex: number,
    endFrameIndex: number,
    currentState: {
      fromClipFrameAt: number;
      toClipFrameAt: number;
      transitionFromClipId: number;
    }
  ): Promise<Buffer[]> {
    const totalFrames = endFrameIndex - startFrameIndex;
    const batchSize = Math.min(this.maxConcurrency, totalFrames);
    const frameResults: Buffer[] = [];

    // Calculate all frame tasks
    const allTasks = this.calculateFrameBatch(
      startFrameIndex,
      totalFrames,
      currentState.fromClipFrameAt,
      currentState.toClipFrameAt,
      currentState.transitionFromClipId
    );

    // Process in batches to manage memory
    for (let i = 0; i < allTasks.length; i += batchSize) {
      const batch = allTasks.slice(i, i + batchSize);
      const batchResults = await this.renderFramesBatch(batch);
      
      // Collect results in order
      for (let j = 0; j < batch.length; j++) {
        const frameIndex = startFrameIndex + i + j;
        const frameData = batchResults.get(frameIndex);
        if (frameData) {
          frameResults.push(frameData);
        }
      }
    }

    return frameResults;
  }

  getStats() {
    return {
      maxConcurrency: this.maxConcurrency,
      availableCores: CPU_CORES,
      queueSize: this.renderQueue.length,
      completedFrames: this.completedFrames.size,
    };
  }

  clear() {
    this.renderQueue = [];
    this.completedFrames.clear();
  }
}