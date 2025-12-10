import { EventEmitter } from 'events';

interface ConcurrencyConfig {
  maxConcurrent: number;
  queueSize?: number;
  timeout?: number;
  priority?: boolean;
  adaptiveScaling?: {
    enabled: boolean;
    minConcurrent: number;
    maxConcurrent: number;
    scaleUpThreshold: number;   // Success rate to scale up (e.g., 0.9 = 90%)
    scaleDownThreshold: number;  // Error rate to scale down (e.g., 0.2 = 20%)
    evaluationWindow: number;    // Time window for evaluation (ms)
  };
}

interface Task<T> {
  id: string;
  priority?: number;
  execute: () => Promise<T>;
  timeout?: number;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export class ConcurrencyManager extends EventEmitter {
  private activeCount: number = 0;
  private queue: Task<any>[] = [];
  private results: Map<string, any> = new Map();
  private errors: Map<string, Error> = new Map();
  
  private currentConcurrency: number;
  private metrics = {
    totalExecuted: 0,
    totalSuccess: 0,
    totalErrors: 0,
    totalTimeout: 0,
    avgExecutionTime: 0,
    peakConcurrency: 0
  };

  private performanceHistory: Array<{
    timestamp: number;
    success: boolean;
    duration: number;
  }> = [];

  private scaleTimer: NodeJS.Timeout | null = null;

  constructor(private config: ConcurrencyConfig) {
    super();
    
    this.currentConcurrency = config.maxConcurrent;

    // Start adaptive scaling if enabled
    if (config.adaptiveScaling?.enabled) {
      this.startAdaptiveScaling();
    }
  }

  async execute<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add to queue
      const wrappedTask = {
        ...task,
        onSuccess: (result: T) => {
          task.onSuccess?.(result);
          resolve(result);
        },
        onError: (error: Error) => {
          task.onError?.(error);
          reject(error);
        }
      };

      this.addToQueue(wrappedTask);
      this.processQueue();
    });
  }

  async executeMany<T>(tasks: Task<T>[]): Promise<T[]> {
    return Promise.all(tasks.map(task => this.execute(task)));
  }

  async executeBatch<T>(
    tasks: Task<T>[],
    options?: {
      batchSize?: number;
      delayBetweenBatches?: number;
      stopOnError?: boolean;
    }
  ): Promise<T[]> {
    const batchSize = options?.batchSize || this.currentConcurrency;
    const delay = options?.delayBetweenBatches || 0;
    const stopOnError = options?.stopOnError || false;

    const results: T[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      try {
        const batchResults = await Promise.allSettled(
          batch.map(task => this.execute(task))
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            errors.push(result.reason);
            
            if (stopOnError) {
              throw new Error(`Batch execution stopped due to error: ${result.reason.message}`);
            }
          }
        }

        // Delay between batches
        if (delay > 0 && i + batchSize < tasks.length) {
          await this.sleep(delay);
        }

      } catch (error) {
        if (stopOnError) {
          throw error;
        }
      }
    }

    return results;
  }

  private addToQueue(task: Task<any>): void {
    // Check queue size limit
    if (this.config.queueSize && this.queue.length >= this.config.queueSize) {
      throw new Error('Queue is full');
    }

    // Add task
    if (this.config.priority && task.priority !== undefined) {
      // Insert by priority
      const index = this.queue.findIndex(t => 
        (t.priority || 0) < (task.priority || 0)
      );
      
      if (index === -1) {
        this.queue.push(task);
      } else {
        this.queue.splice(index, 0, task);
      }
    } else {
      // FIFO
      this.queue.push(task);
    }

    this.emit('taskQueued', { 
      taskId: task.id, 
      queueSize: this.queue.length 
    });
  }

  private async processQueue(): Promise<void> {
    while (this.activeCount < this.currentConcurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      this.processTask(task);
    }
  }

  private async processTask(task: Task<any>): Promise<void> {
    this.activeCount++;
    
    // Update peak concurrency
    if (this.activeCount > this.metrics.peakConcurrency) {
      this.metrics.peakConcurrency = this.activeCount;
    }

    this.emit('taskStarted', { 
      taskId: task.id, 
      activeCount: this.activeCount 
    });

    const startTime = Date.now();

    try {
      // Execute with timeout
      const timeout = task.timeout || this.config.timeout || 30000;
      const result = await this.executeWithTimeout(task.execute(), timeout);

      const duration = Date.now() - startTime;

      // Update metrics
      this.metrics.totalExecuted++;
      this.metrics.totalSuccess++;
      this.updateAvgExecutionTime(duration);

      // Store result
      this.results.set(task.id, result);

      // Record performance
      this.recordPerformance(true, duration);

      this.emit('taskCompleted', {
        taskId: task.id,
        duration,
        result
      });

      task.onSuccess?.(result);

    } catch (error) {
      const duration = Date.now() - startTime;

      // Update metrics
      this.metrics.totalExecuted++;
      this.metrics.totalErrors++;

      if (error instanceof TimeoutError) {
        this.metrics.totalTimeout++;
      }

      // Store error
      this.errors.set(task.id, error as Error);

      // Record performance
      this.recordPerformance(false, duration);

      this.emit('taskError', {
        taskId: task.id,
        duration,
        error
      });

      task.onError?.(error as Error);

    } finally {
      this.activeCount--;

      this.emit('taskFinished', {
        taskId: task.id,
        activeCount: this.activeCount
      });

      // Process next task
      this.processQueue();
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new TimeoutError(`Task timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  // Adaptive Scaling
  private startAdaptiveScaling(): void {
    const config = this.config.adaptiveScaling!;
    
    this.scaleTimer = setInterval(() => {
      this.evaluateAndScale();
    }, config.evaluationWindow);
  }

  private evaluateAndScale(): void {
    const config = this.config.adaptiveScaling!;
    const now = Date.now();
    const windowStart = now - config.evaluationWindow;

    // Filter recent performance data
    const recentPerformance = this.performanceHistory.filter(
      p => p.timestamp >= windowStart
    );

    if (recentPerformance.length === 0) return;

    // Calculate success rate
    const successCount = recentPerformance.filter(p => p.success).length;
    const successRate = successCount / recentPerformance.length;

    // Calculate average duration
    const avgDuration = recentPerformance.reduce((sum, p) => sum + p.duration, 0) / recentPerformance.length;

    // Decision to scale
    if (successRate >= config.scaleUpThreshold && 
        this.currentConcurrency < config.maxConcurrent) {
      // Scale up
      this.currentConcurrency = Math.min(
        this.currentConcurrency + 1,
        config.maxConcurrent
      );

      this.emit('scaledUp', {
        newConcurrency: this.currentConcurrency,
        successRate,
        avgDuration
      });
    } 
    else if (successRate <= config.scaleDownThreshold && 
             this.currentConcurrency > config.minConcurrent) {
      // Scale down
      this.currentConcurrency = Math.max(
        this.currentConcurrency - 1,
        config.minConcurrent
      );

      this.emit('scaledDown', {
        newConcurrency: this.currentConcurrency,
        successRate,
        avgDuration
      });
    }

    // Clean old performance data
    this.performanceHistory = recentPerformance;
  }

  private recordPerformance(success: boolean, duration: number): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      success,
      duration
    });

    // Limit history size
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }
  }

  // Metrics
  private updateAvgExecutionTime(duration: number): void {
    const total = this.metrics.totalExecuted;
    this.metrics.avgExecutionTime = 
      (this.metrics.avgExecutionTime * (total - 1) + duration) / total;
  }

  getMetrics() {
    const successRate = this.metrics.totalExecuted > 0
      ? this.metrics.totalSuccess / this.metrics.totalExecuted
      : 0;

    const errorRate = this.metrics.totalExecuted > 0
      ? this.metrics.totalErrors / this.metrics.totalExecuted
      : 0;

    return {
      ...this.metrics,
      currentConcurrency: this.currentConcurrency,
      activeCount: this.activeCount,
      queueSize: this.queue.length,
      successRate,
      errorRate
    };
  }

  getResult(taskId: string): any {
    return this.results.get(taskId);
  }

  getError(taskId: string): Error | undefined {
    return this.errors.get(taskId);
  }

  // Control
  setConcurrency(value: number): void {
    if (value < 1) {
      throw new Error('Concurrency must be at least 1');
    }

    this.currentConcurrency = value;
    this.emit('concurrencyChanged', { newValue: value });

    // Process queue if increased
    this.processQueue();
  }

  pause(): void {
    this.emit('paused');
    // Note: active tasks will complete, but no new tasks will start
  }

  resume(): void {
    this.emit('resumed');
    this.processQueue();
  }

  async clear(): Promise<void> {
    this.queue = [];
    this.results.clear();
    this.errors.clear();
    this.emit('cleared');
  }

  async shutdown(): Promise<void> {
    if (this.scaleTimer) {
      clearInterval(this.scaleTimer);
    }

    // Wait for active tasks
    while (this.activeCount > 0) {
      await this.sleep(100);
    }

    this.emit('shutdown');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}