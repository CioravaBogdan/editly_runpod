import { cpus } from "os";

const CPU_CORES = cpus().length;

export class FrameBufferPool {
  private buffers: Buffer[] = [];
  private maxBuffers: number;
  private bufferSize: number;

  constructor(width: number, height: number, channels: number = 4) {
    this.bufferSize = width * height * channels;
    this.maxBuffers = Math.min(CPU_CORES * 2, 64); // Limit memory usage
  }

  getBuffer(): Buffer {
    const buffer = this.buffers.pop();
    if (buffer) {
      // Clear buffer for reuse
      buffer.fill(0);
      return buffer;
    }
    return Buffer.allocUnsafe(this.bufferSize);
  }

  releaseBuffer(buffer: Buffer): void {
    if (this.buffers.length < this.maxBuffers && buffer.length === this.bufferSize) {
      this.buffers.push(buffer);
    }
  }

  clear(): void {
    this.buffers = [];
  }

  get poolSize(): number {
    return this.buffers.length;
  }

  get maxPoolSize(): number {
    return this.maxBuffers;
  }
}

export class FrameBufferManager {
  private static pools = new Map<string, FrameBufferPool>();

  static getPool(width: number, height: number, channels: number = 4): FrameBufferPool {
    const key = `${width}x${height}x${channels}`;
    let pool = this.pools.get(key);
    if (!pool) {
      pool = new FrameBufferPool(width, height, channels);
      this.pools.set(key, pool);
    }
    return pool;
  }

  static clearAll(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
  }

  static getStats(): Record<string, { poolSize: number; maxPoolSize: number }> {
    const stats: Record<string, { poolSize: number; maxPoolSize: number }> = {};
    for (const [key, pool] of this.pools.entries()) {
      stats[key] = {
        poolSize: pool.poolSize,
        maxPoolSize: pool.maxPoolSize,
      };
    }
    return stats;
  }
}