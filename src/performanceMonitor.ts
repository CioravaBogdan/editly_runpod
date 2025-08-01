import { cpus } from "os";
import { performance } from "perf_hooks";

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp: number;
  threadsActive: number;
  frameRate?: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private monitoring = false;
  private intervalId?: NodeJS.Timeout;
  private startTime = 0;
  private frameCount = 0;
  private lastFrameTime = 0;

  constructor(private sampleInterval = 1000) {} // Sample every 1 second

  start(): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.startTime = performance.now();
    this.metrics = [];
    
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.sampleInterval);
    
    console.log("🚀 Performance monitoring started");
  }

  stop(): void {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.printSummary();
    console.log("📊 Performance monitoring stopped");
  }

  frameRendered(): void {
    this.frameCount++;
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const timeDiff = now - this.lastFrameTime;
      if (timeDiff > 0) {
        // Update frame rate in latest metric if available
        const latest = this.metrics[this.metrics.length - 1];
        if (latest) {
          latest.frameRate = 1000 / timeDiff; // FPS
        }
      }
    }
    
    this.lastFrameTime = now;
  }

  private collectMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Calculate CPU usage percentage
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    const cpuPercent = Math.min(100, (totalCpuTime / (this.sampleInterval * 1000)) * 100);
    
    const metrics: PerformanceMetrics = {
      cpuUsage: cpuPercent,
      memoryUsage: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      timestamp: performance.now(),
      threadsActive: this.getActiveThreadCount(),
    };
    
    this.metrics.push(metrics);
    
    // Keep only last 60 samples (1 minute at 1s intervals)
    if (this.metrics.length > 60) {
      this.metrics.shift();
    }
  }

  private getActiveThreadCount(): number {
    // Approximate active thread count based on available data
    return cpus().length; // This is a simplification
  }

  private printSummary(): void {
    if (this.metrics.length === 0) return;
    
    const avgCpu = this.metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / this.metrics.length;
    const maxCpu = Math.max(...this.metrics.map(m => m.cpuUsage));
    const avgMemory = this.metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / this.metrics.length;
    const maxMemory = Math.max(...this.metrics.map(m => m.memoryUsage.heapUsed));
    
    const totalTime = (performance.now() - this.startTime) / 1000; // seconds
    const avgFrameRate = this.frameCount / totalTime;
    
    console.log("\n📊 PERFORMANCE SUMMARY:");
    console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`🎬 Frames Rendered: ${this.frameCount}`);
    console.log(`📽️  Average Frame Rate: ${avgFrameRate.toFixed(2)} FPS`);
    console.log(`🔥 CPU Usage - Avg: ${avgCpu.toFixed(1)}% | Max: ${maxCpu.toFixed(1)}%`);
    console.log(`💾 Memory Usage - Avg: ${avgMemory.toFixed(0)}MB | Max: ${maxMemory.toFixed(0)}MB`);
    console.log(`🧵 Available CPU Cores: ${cpus().length}`);
    
    if (avgCpu < 50) {
      console.log("⚠️  CPU utilization is low. Consider increasing concurrency settings.");
    } else if (avgCpu > 90) {
      console.log("🔥 High CPU utilization achieved!");
    }
  }

  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  isMonitoring(): boolean {
    return this.monitoring;
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

export function resetPerformanceMonitor(): void {
  if (performanceMonitor?.isMonitoring()) {
    performanceMonitor.stop();
  }
  performanceMonitor = null;
}