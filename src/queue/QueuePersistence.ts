import * as fs from 'fs';
import * as path from 'path';
import { Task, TaskStatus, TaskPriority } from '../types';
import { EventEmitter } from 'events';

interface PersistenceConfig {
  path: string;
  saveInterval?: number; // Auto-save interval in ms
  compression?: boolean;
  maxFileSize?: number; // Max file size in bytes
  backupCount?: number; // Number of backups to keep
}

export class QueuePersistence extends EventEmitter {
  private savePath: string;
  private saveTimer: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;
  private tasks: Map<string, Task> = new Map();
  private isLoaded: boolean = false;

  constructor(private config: PersistenceConfig) {
    super();
    
    this.savePath = path.resolve(config.path);
    this.ensureDirectory();

    // Auto-save if configured
    if (config.saveInterval) {
      this.startAutoSave(config.saveInterval);
    }
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;

    try {
      if (!fs.existsSync(this.savePath)) {
        this.isLoaded = true;
        this.emit('loaded', { taskCount: 0, fromBackup: false });
        return;
      }

      const data = fs.readFileSync(this.savePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Restore tasks
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        for (const taskData of parsed.tasks) {
          const task = this.deserializeTask(taskData);
          this.tasks.set(task.id!, task);
        }
      }

      this.isLoaded = true;
      this.emit('loaded', { 
        taskCount: this.tasks.size,
        fromBackup: false 
      });

    } catch (error) {
      // Try to load from backup
      const loaded = await this.loadFromBackup();
      
      if (!loaded) {
        this.emit('loadError', error);
        // Start fresh
        this.tasks.clear();
        this.isLoaded = true;
      }
    }
  }

  async save(): Promise<void> {
    try {
      // Check file size limit
      if (this.config.maxFileSize && fs.existsSync(this.savePath)) {
        const stats = fs.statSync(this.savePath);
        if (stats.size > this.config.maxFileSize) {
          await this.rotate();
        }
      }

      const data = {
        version: '1.0',
        timestamp: Date.now(),
        tasks: Array.from(this.tasks.values()).map(task => 
          this.serializeTask(task)
        )
      };

      const json = JSON.stringify(data, null, 2);

      // Atomic write (write to temp, then rename)
      const tempPath = `${this.savePath}.tmp`;
      fs.writeFileSync(tempPath, json, 'utf-8');
      
      // Backup current file if exists
      if (fs.existsSync(this.savePath)) {
        await this.createBackup();
      }

      // Rename temp to actual
      fs.renameSync(tempPath, this.savePath);

      this.isDirty = false;
      this.emit('saved', { taskCount: this.tasks.size });

    } catch (error) {
      this.emit('saveError', error);
      throw error;
    }
  }

  async saveTask(task: Task): Promise<void> {
    this.tasks.set(task.id!, task);
    this.isDirty = true;

    // Immediate save for critical tasks
    if (task.priority === TaskPriority.CRITICAL) {
      await this.save();
    }
  }

  async updateTask(task: Task): Promise<void> {
    if (this.tasks.has(task.id!)) {
      this.tasks.set(task.id!, task);
      this.isDirty = true;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    if (this.tasks.delete(taskId)) {
      this.isDirty = true;
    }
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  async clear(): Promise<void> {
    this.tasks.clear();
    this.isDirty = true;
    await this.save();
  }

  // Auto-save functionality
  private startAutoSave(interval: number): void {
    this.saveTimer = setInterval(async () => {
      if (this.isDirty) {
        await this.save();
      }
    }, interval);
  }

  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // Backup management
  private async createBackup(): Promise<void> {
    const backupPath = `${this.savePath}.backup`;
    
    if (fs.existsSync(this.savePath)) {
      fs.copyFileSync(this.savePath, backupPath);
    }

    // Rotate backups if needed
    if (this.config.backupCount && this.config.backupCount > 1) {
      await this.rotateBackups();
    }
  }

  private async rotateBackups(): Promise<void> {
    const maxBackups = this.config.backupCount || 5;

    // Shift existing backups
    for (let i = maxBackups - 1; i > 0; i--) {
      const oldPath = `${this.savePath}.backup${i > 1 ? i - 1 : ''}`;
      const newPath = `${this.savePath}.backup${i}`;

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    // Delete oldest if exists
    const oldestPath = `${this.savePath}.backup${maxBackups}`;
    if (fs.existsSync(oldestPath)) {
      fs.unlinkSync(oldestPath);
    }
  }

  private async loadFromBackup(): Promise<boolean> {
    const backupPath = `${this.savePath}.backup`;

    if (!fs.existsSync(backupPath)) {
      return false;
    }

    try {
      const data = fs.readFileSync(backupPath, 'utf-8');
      const parsed = JSON.parse(data);

      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        for (const taskData of parsed.tasks) {
          const task = this.deserializeTask(taskData);
          this.tasks.set(task.id!, task);
        }
      }

      this.isLoaded = true;
      this.emit('loaded', { 
        taskCount: this.tasks.size,
        fromBackup: true 
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // File rotation
  private async rotate(): Promise<void> {
    const timestamp = Date.now();
    const rotatedPath = `${this.savePath}.${timestamp}`;

    if (fs.existsSync(this.savePath)) {
      fs.renameSync(this.savePath, rotatedPath);
    }

    this.emit('rotated', { oldPath: rotatedPath });
  }

  // Serialization
  private serializeTask(task: Task): any {
    return {
      id: task.id,
      priority: task.priority,
      status: task.status,
      url: (task as any).url,
      retries: task.retries,
      addedAt: task.addedAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      failedAt: task.failedAt,
      lastError: task.lastError ? {
        name: task.lastError.name,
        message: task.lastError.message,
        stack: task.lastError.stack
      } : undefined,
      result: task.result,
      metadata: (task as any).metadata
    };
  }

  private deserializeTask(data: any): Task {
    const task: any = {
      id: data.id,
      priority: data.priority,
      status: data.status,
      url: data.url,
      retries: data.retries || 0,
      addedAt: data.addedAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      failedAt: data.failedAt,
      metadata: data.metadata,
      result: data.result,
      execute: async () => {
        throw new Error('Task execution not restored');
      }
    };

    if (data.lastError) {
      const error = new Error(data.lastError.message);
      error.name = data.lastError.name;
      error.stack = data.lastError.stack;
      task.lastError = error;
    }

    return task as Task;
  }

  // Statistics
  getStats() {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      byStatus: {
        pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
        processing: tasks.filter(t => t.status === TaskStatus.PROCESSING).length,
        completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        failed: tasks.filter(t => t.status === TaskStatus.FAILED).length,
        retrying: tasks.filter(t => t.status === TaskStatus.RETRYING).length
      },
      fileSize: fs.existsSync(this.savePath) 
        ? fs.statSync(this.savePath).size 
        : 0,
      isDirty: this.isDirty,
      isLoaded: this.isLoaded
    };
  }

  // Cleanup
  async close(): Promise<void> {
    this.stopAutoSave();

    if (this.isDirty) {
      await this.save();
    }

    this.emit('closed');
  }

  // Export/Import
  async export(outputPath: string): Promise<void> {
    const data = {
      version: '1.0',
      exportedAt: Date.now(),
      tasks: Array.from(this.tasks.values()).map(task => 
        this.serializeTask(task)
      )
    };

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async import(inputPath: string): Promise<void> {
    const data = fs.readFileSync(inputPath, 'utf-8');
    const parsed = JSON.parse(data);

    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      for (const taskData of parsed.tasks) {
        const task = this.deserializeTask(taskData);
        this.tasks.set(task.id!, task);
      }
    }

    this.isDirty = true;
    await this.save();
  }
}