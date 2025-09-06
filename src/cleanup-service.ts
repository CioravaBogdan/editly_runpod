import fs from 'fs/promises';
import path from 'path';

interface FileInfo {
  path: string;
  createdAt: Date;
  size: number;
}

export class CleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_AFTER_HOURS = parseFloat(process.env.CLEANUP_AFTER_HOURS || '2');
  private readonly CHECK_INTERVAL_MINUTES = parseFloat(process.env.CLEANUP_CHECK_INTERVAL_MINUTES || '15');
  private readonly AUTO_CLEANUP_ENABLED = process.env.AUTO_CLEANUP_ENABLED !== 'false';
  
  private readonly directories = [
    process.env.OUTPUT_DIR || '/outputs',
    process.env.UPLOAD_DIR || '/app/uploads', 
    process.env.TEMP_DIR || '/tmp',
    '/app/temp',
    '/app/files'
  ];

  start() {
    if (!this.AUTO_CLEANUP_ENABLED) {
      console.log('🧹 Auto cleanup disabled via environment variable');
      return;
    }

    console.log(`🧹 Starting cleanup service - files will be deleted after ${this.CLEANUP_AFTER_HOURS} hours`);
    
    // Run initial cleanup
    this.performCleanup();
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CHECK_INTERVAL_MINUTES * 60 * 1000);
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Cleanup service stopped');
    }
  }

  async performCleanup() {
    console.log('🔍 Running cleanup check...');
    
    let totalFilesDeleted = 0;
    let totalSizeFreed = 0;
    
    for (const dir of this.directories) {
      try {
        const result = await this.cleanupDirectory(dir);
        totalFilesDeleted += result.filesDeleted;
        totalSizeFreed += result.sizeFreed;
      } catch (error) {
        console.warn(`⚠️  Could not cleanup directory ${dir}:`, error.message);
      }
    }
    
    if (totalFilesDeleted > 0) {
      console.log(`✅ Cleanup completed: ${totalFilesDeleted} files deleted, ${this.formatBytes(totalSizeFreed)} freed`);
    } else {
      console.log('✅ Cleanup completed: no old files found');
    }
    
    // Also cleanup any editly temp directories
    await this.cleanupEditlyTempDirs();
  }

  private async cleanupDirectory(dirPath: string): Promise<{filesDeleted: number, sizeFreed: number}> {
    try {
      await fs.access(dirPath);
    } catch {
      // Directory doesn't exist, skip
      return { filesDeleted: 0, sizeFreed: 0 };
    }

    const files = await this.getFilesRecursively(dirPath);
    const cutoffTime = new Date(Date.now() - this.CLEANUP_AFTER_HOURS * 60 * 60 * 1000);
    
    let filesDeleted = 0;
    let sizeFreed = 0;
    
    for (const file of files) {
      if (file.createdAt < cutoffTime) {
        try {
          await fs.unlink(file.path);
          filesDeleted++;
          sizeFreed += file.size;
          console.log(`🗑️  Deleted: ${path.basename(file.path)} (${this.formatBytes(file.size)})`);
        } catch (error) {
          console.warn(`⚠️  Could not delete ${file.path}:`, error.message);
        }
      }
    }
    
    // Clean up empty directories
    await this.removeEmptyDirectories(dirPath);
    
    return { filesDeleted, sizeFreed };
  }

  private async getFilesRecursively(dirPath: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively get files from subdirectories
          const subFiles = await this.getFilesRecursively(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            files.push({
              path: fullPath,
              createdAt: stats.birthtime || stats.mtime, // Use birthtime if available, fallback to mtime
              size: stats.size
            });
          } catch (error) {
            console.warn(`⚠️  Could not get stats for ${fullPath}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory ${dirPath}:`, error.message);
    }
    
    return files;
  }

  private async removeEmptyDirectories(dirPath: string) {
    try {
      const entries = await fs.readdir(dirPath);
      
      // First, recursively clean subdirectories
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.removeEmptyDirectories(fullPath);
        }
      }
      
      // Check if directory is now empty (after recursive cleanup)
      const finalEntries = await fs.readdir(dirPath);
      if (finalEntries.length === 0 && !this.isProtectedDirectory(dirPath)) {
        await fs.rmdir(dirPath);
        console.log(`📁 Removed empty directory: ${dirPath}`);
      }
    } catch (error) {
      // Ignore errors - directory might not be empty or might be protected
    }
  }

  private isProtectedDirectory(dirPath: string): boolean {
    // Don't delete the main directories themselves
    const protectedDirs = [
      '/outputs',
      '/app/uploads', 
      '/app/temp',
      '/app/files',
      '/tmp'
    ];
    
    return protectedDirs.some(protectedDir => 
      path.resolve(dirPath) === path.resolve(protectedDir)
    );
  }

  private async cleanupEditlyTempDirs() {
    // Clean up any editly-tmp-* directories that might be left behind
    try {
      const tempBase = process.env.TEMP_DIR || '/tmp';
      const entries = await fs.readdir(tempBase, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('editly-tmp-')) {
          const fullPath = path.join(tempBase, entry.name);
          try {
            await fs.rm(fullPath, { recursive: true, force: true });
            console.log(`🗑️  Removed editly temp directory: ${entry.name}`);
          } catch (error) {
            console.warn(`⚠️  Could not remove temp directory ${fullPath}:`, error.message);
          }
        }
      }
    } catch (error) {
      // Ignore if temp directory doesn't exist
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Manual cleanup method for API endpoint
  async manualCleanup(): Promise<{filesDeleted: number, sizeFreed: number}> {
    console.log('🧹 Manual cleanup triggered');
    
    let totalFilesDeleted = 0;
    let totalSizeFreed = 0;
    
    for (const dir of this.directories) {
      try {
        const result = await this.cleanupDirectory(dir);
        totalFilesDeleted += result.filesDeleted;
        totalSizeFreed += result.sizeFreed;
      } catch (error) {
        console.warn(`⚠️  Could not cleanup directory ${dir}:`, error.message);
      }
    }
    
    await this.cleanupEditlyTempDirs();
    
    return { filesDeleted: totalFilesDeleted, sizeFreed: totalSizeFreed };
  }

  // Get current disk usage
  async getDiskUsage(): Promise<{[directory: string]: {files: number, totalSize: number}}> {
    const usage: {[directory: string]: {files: number, totalSize: number}} = {};
    
    for (const dir of this.directories) {
      try {
        const files = await this.getFilesRecursively(dir);
        usage[dir] = {
          files: files.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0)
        };
      } catch (error) {
        usage[dir] = { files: 0, totalSize: 0 };
      }
    }
    
    return usage;
  }
}

export const cleanupService = new CleanupService();
