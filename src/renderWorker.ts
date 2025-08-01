import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { cpus } from "os";
import { createFabricCanvas, renderFabricCanvas } from "./sources/fabric.js";

const CPU_CORES = cpus().length;

export interface RenderTask {
  id: string;
  width: number;
  height: number;
  frames: Array<{ rgba: Buffer; layerIndex: number }>;
}

export interface RenderResult {
  id: string;
  rgba: Buffer;
  error?: string;
}

// Worker thread code
if (!isMainThread) {
  parentPort?.on("message", async (task: RenderTask) => {
    try {
      const { id, width, height, frames } = task;
      
      // Create canvas and composite frames
      const canvas = createFabricCanvas({ width, height });
      
      // Process frames in order
      for (const frame of frames.sort((a, b) => a.layerIndex - b.layerIndex)) {
        if (frame.rgba && frame.rgba.length > 0) {
          const { rgbaToFabricImage } = await import("./sources/fabric.js");
          const img = await rgbaToFabricImage({ width, height, rgba: frame.rgba });
          canvas.add(img);
        }
      }
      
      const result = await renderFabricCanvas(canvas);
      
      const response: RenderResult = {
        id,
        rgba: result,
      };
      
      parentPort?.postMessage(response);
    } catch (error) {
      const response: RenderResult = {
        id: task.id,
        rgba: Buffer.alloc(0),
        error: error instanceof Error ? error.message : String(error),
      };
      
      parentPort?.postMessage(response);
    }
  });
}

// Main thread worker pool
export class RenderWorkerPool {
  private workers: Worker[] = [];
  private pendingTasks = new Map<string, (result: RenderResult) => void>();
  private taskQueue: RenderTask[] = [];
  private activeWorkers = 0;
  private maxWorkers: number;

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers ?? Math.min(CPU_CORES, 8);
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(__filename);
      
      worker.on("message", (result: RenderResult) => {
        const resolver = this.pendingTasks.get(result.id);
        if (resolver) {
          this.pendingTasks.delete(result.id);
          resolver(result);
        }
        this.activeWorkers--;
        this.processQueue();
      });
      
      worker.on("error", (error) => {
        console.error("Worker error:", error);
        this.activeWorkers--;
        this.processQueue();
      });
      
      this.workers.push(worker);
    }
  }

  private processQueue(): void {
    if (this.taskQueue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const task = this.taskQueue.shift();
      if (task) {
        const availableWorker = this.workers.find(w => !w.threadId);
        if (availableWorker) {
          this.activeWorkers++;
          availableWorker.postMessage(task);
        }
      }
    }
  }

  async render(task: RenderTask): Promise<RenderResult> {
    return new Promise((resolve) => {
      this.pendingTasks.set(task.id, resolve);
      
      if (this.activeWorkers < this.maxWorkers) {
        const availableWorker = this.workers[this.activeWorkers];
        this.activeWorkers++;
        availableWorker.postMessage(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.pendingTasks.clear();
    this.taskQueue = [];
  }

  get stats() {
    return {
      maxWorkers: this.maxWorkers,
      activeWorkers: this.activeWorkers,
      queueLength: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
    };
  }
}

// Singleton instance
let workerPool: RenderWorkerPool | null = null;

export function getRenderWorkerPool(): RenderWorkerPool {
  if (!workerPool) {
    workerPool = new RenderWorkerPool();
  }
  return workerPool;
}

export async function terminateRenderWorkerPool(): Promise<void> {
  if (workerPool) {
    await workerPool.terminate();
    workerPool = null;
  }
}