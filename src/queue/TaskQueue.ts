//src/queue/TaskQueue.ts
import { EventEmitter } from 'events';
import { Task, TaskPriority, TaskStatus, QueueConfig as QueueConfigType } from '../types';
import { PriorityQueue } from './PriorityQueue';
import { DeadLetterQueue } from './DeadLetterQueue';
import { QueuePersistence } from './QueuePersistence';

export interface QueueConfig {
  concurrency: number;
  maxQueueSize: number;
  enablePersistence: boolean;
  persistencePath?: string;
  enableDeadLetter: boolean;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export class TaskQueue extends EventEmitter {
  private priorityQueue: PriorityQueue;
  private deadLetterQueue: DeadLetterQueue;
  private persistence: QueuePersistence | null = null;
  
  private activeTasks: Set<string> = new Set();
  private completedTasks: Map<string, any> = new Map();
  private failedTasks: Map<string, Error> = new Map();
  
  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  
  private metrics = {
    totalAdded: 0,
    totalProcessed: 0,
    totalFailed: 0,
    totalRetried: 0,
    averageProcessTime: 0,
    peakConcurrency: 0
  };

  constructor(private config: QueueConfigType) {
    super();
    
    this.priorityQueue = new PriorityQueue();
    this.deadLetterQueue = new DeadLetterQueue(config.maxRetries);
    
    if (config.enablePersistence && config.persistencePath) {
      this.persistence = new QueuePersistence({
        path: config.persistencePath || './queue-data.json',
        saveInterval: config.saveInterval,
        compression: config.compression
      });
    }
  }

  /**
   * ✅ AGREGAR: Método cancel
   */
  cancel(taskId: string): boolean {
    // Si está en cola
    const removed = this.priorityQueue.remove(taskId);
    if (removed) {
      this.emit('taskCancelled', { taskId });
      return true;
    }

    // Si está activa, no se puede cancelar fácilmente
    if (this.activeTasks.has(taskId)) {
      this.emit('taskCancelling', { taskId });
      return false; // No se puede cancelar mientras está ejecutando
    }

    return false;
  }

  /**
   * ✅ AGREGAR: Método getMetrics (alias de getStats)
   */
  getMetrics() {
    return this.getStats();
  }

  async initialize(): Promise<void> {
    if (this.persistence) {
      await this.persistence.load();
      const savedTasks = this.persistence.getTasks();
      
      for (const task of savedTasks) {
        if (task.status === TaskStatus.PENDING || task.status === TaskStatus.RETRYING) {
          this.priorityQueue.enqueue(task);
        }
      }
      
      this.emit('restored', { taskCount: savedTasks.length });
    }
  }

  async add(task: Task | Task[]): Promise<void> {
    const tasks = Array.isArray(task) ? task : [task];

    for (const t of tasks) {
      // Validar tamaño de cola
      if (this.priorityQueue.size() >= this.config.maxQueueSize) {
        throw new Error('Queue is full');
      }

      // Asignar ID si no tiene
      if (!t.id) {
        t.id = this.generateTaskId();
      }

      // Asignar prioridad por defecto
      if (!t.priority) {
        t.priority = TaskPriority.NORMAL;
      }

      // Estado inicial
      t.status = TaskStatus.PENDING;
      t.addedAt = Date.now();
      t.retries = 0;

      this.priorityQueue.enqueue(t);
      this.metrics.totalAdded++;

      // Persistir
      if (this.persistence) {
        await this.persistence.saveTask(t);
      }

      this.emit('taskAdded', t);
    }

    // Auto-start processing
    if (!this.isProcessing && !this.isPaused) {
      this.start();
    }
  }

  async addBatch(tasks: Task[], options?: { 
    batchSize?: number; 
    delayBetweenBatches?: number;
  }): Promise<void> {
    const batchSize = options?.batchSize || 100;
    const delay = options?.delayBetweenBatches || 0;

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      await this.add(batch);
      
      if (delay > 0 && i + batchSize < tasks.length) {
        await this.sleep(delay);
      }
    }
  }

  start(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.isPaused = false;
    this.emit('started');
    
    this.processQueue();
  }

  pause(): void {
    this.isPaused = true;
    this.emit('paused');
  }

  resume(): void {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    this.emit('resumed');
    
    this.processQueue();
  }

  async stop(options?: { graceful?: boolean }): Promise<void> {
    this.isPaused = true;
    
    if (options?.graceful) {
      // Esperar a que terminen tareas activas
      while (this.activeTasks.size > 0) {
        await this.sleep(100);
      }
    }
    
    this.isProcessing = false;
    this.emit('stopped');
  }

  private async processQueue(): Promise<void> {
    while (this.isProcessing && !this.isPaused) {
      // Controlar concurrencia
      if (this.activeTasks.size >= this.config.concurrency) {
        await this.sleep(50);
        continue;
      }

      // Obtener siguiente tarea
      const task = this.priorityQueue.dequeue();
      if (!task) {
        // Cola vacía
        if (this.activeTasks.size === 0) {
          this.isProcessing = false;
          this.emit('idle');
        }
        await this.sleep(100);
        continue;
      }

      // Procesar tarea
      this.processTask(task);
    }
  }

  private async processTask(task: Task): Promise<void> {
    this.activeTasks.add(task.id!);
    task.status = TaskStatus.PROCESSING;
    task.startedAt = Date.now();

    this.emit('taskStarted', task);

    // Update peak concurrency
    if (this.activeTasks.size > this.metrics.peakConcurrency) {
      this.metrics.peakConcurrency = this.activeTasks.size;
    }

    try {
      // Timeout wrapper
      const result = await this.executeWithTimeout(task);
      
      task.status = TaskStatus.COMPLETED;
      task.completedAt = Date.now();
      task.result = result;

      this.completedTasks.set(task.id!, result);
      this.metrics.totalProcessed++;

      // Update average process time
      const processTime = task.completedAt - task.startedAt!;
      this.metrics.averageProcessTime = 
        (this.metrics.averageProcessTime * (this.metrics.totalProcessed - 1) + processTime) / 
        this.metrics.totalProcessed;

      this.emit('taskCompleted', { task, result });

      // Persistir resultado
      if (this.persistence) {
        await this.persistence.updateTask(task);
      }

    } catch (error) {
      await this.handleTaskError(task, error as Error);
    } finally {
      this.activeTasks.delete(task.id!);
    }
  }

  private async executeWithTimeout(task: Task): Promise<any> {
    return Promise.race([
      task.execute(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Task timeout')), this.config.timeout)
      )
    ]);
  }

  private async handleTaskError(task: Task, error: Error): Promise<void> {
    task.retries = (task.retries || 0) + 1;
    task.lastError = error;

    this.emit('taskError', { task, error });

    // Retry logic
    if (task.retries < this.config.maxRetries) {
      task.status = TaskStatus.RETRYING;
      
      // Exponential backoff
      const delay = this.config.retryDelay * Math.pow(2, task.retries - 1);
      
      this.metrics.totalRetried++;
      this.emit('taskRetrying', { task, delay, attempt: task.retries });

      setTimeout(() => {
        this.priorityQueue.enqueue(task);
      }, delay);

    } else {
      // Max retries reached
      task.status = TaskStatus.FAILED;
      task.failedAt = Date.now();

      this.failedTasks.set(task.id!, error);
      this.metrics.totalFailed++;

      // Move to dead letter queue
      if (this.config.enableDeadLetter) {
        this.deadLetterQueue.add(task);
      }

      this.emit('taskFailed', { task, error });

      // Persistir fallo
      if (this.persistence) {
        await this.persistence.updateTask(task);
      }
    }
  }

  // Prioridades dinámicas
  async updatePriority(taskId: string, priority: TaskPriority): Promise<void> {
    const task = this.priorityQueue.findById(taskId);
    if (task) {
      task.priority = priority;
      this.priorityQueue.reorder();
      this.emit('priorityUpdated', { taskId, priority });
    }
  }

  async cancelTask(taskId: string): Promise<boolean> {
    // Si está en cola
    const removed = this.priorityQueue.remove(taskId);
    if (removed) {
      this.emit('taskCancelled', { taskId });
      return true;
    }

    // Si está activa, marcar para cancelación
    if (this.activeTasks.has(taskId)) {
      // Implementar lógica de cancelación
      this.emit('taskCancelling', { taskId });
      return true;
    }

    return false;
  }

  // Retry manual de tareas fallidas
  async retryFailed(taskId?: string): Promise<void> {
    if (taskId) {
      const task = this.deadLetterQueue.get(taskId);
      if (task) {
        task.retries = 0;
        task.status = TaskStatus.PENDING;
        this.priorityQueue.enqueue(task);
        this.deadLetterQueue.remove(taskId);
      }
    } else {
      // Retry all
      const tasks = this.deadLetterQueue.getAll();
      for (const task of tasks) {
        task.retries = 0;
        task.status = TaskStatus.PENDING;
        this.priorityQueue.enqueue(task);
      }
      this.deadLetterQueue.clear();
    }
  }

  // Limpieza
  async clear(options?: { 
    clearPending?: boolean; 
    clearCompleted?: boolean; 
    clearFailed?: boolean; 
  }): Promise<void> {
    const opts = {
      clearPending: true,
      clearCompleted: true,
      clearFailed: true,
      ...options
    };

    if (opts.clearPending) {
      this.priorityQueue.clear();
    }

    if (opts.clearCompleted) {
      this.completedTasks.clear();
    }

    if (opts.clearFailed) {
      this.failedTasks.clear();
      this.deadLetterQueue.clear();
    }

    if (this.persistence) {
      await this.persistence.clear();
    }

    this.emit('cleared');
  }

  // Getters
  getStats() {
    return {
      ...this.metrics,
      queueSize: this.priorityQueue.size(),
      activeCount: this.activeTasks.size,
      completedCount: this.completedTasks.size,
      failedCount: this.failedTasks.size,
      deadLetterCount: this.deadLetterQueue.size(),
      isProcessing: this.isProcessing,
      isPaused: this.isPaused
    };
  }

  getTask(taskId: string): Task | undefined {
    return this.priorityQueue.findById(taskId);
  }

  getCompletedTasks(): Map<string, any> {
    return this.completedTasks;
  }

  getFailedTasks(): Map<string, Error> {
    return this.failedTasks;
  }

  getDeadLetterQueue(): DeadLetterQueue {
    return this.deadLetterQueue;
  }

  // Utilidades
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown(): Promise<void> {
    await this.stop({ graceful: true });
    
    if (this.persistence) {
      await this.persistence.close();
    }

    this.emit('shutdown');
  }
}