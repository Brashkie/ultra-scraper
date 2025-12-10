import { EventEmitter } from 'events';

interface ThrottleConfig {
  maxPerSecond: number;
  maxPerMinute?: number;
  maxPerHour?: number;
  burstSize?: number;
  smoothing?: boolean; // Distribute requests evenly
}

export class ThrottleManager extends EventEmitter {
  private queue: Array<{
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    addedAt: number;
  }> = [];

  private requestTimestamps: number[] = [];
  private isProcessing: boolean = false;
  private nextExecutionTime: number = 0;

  constructor(private config: ThrottleConfig) {
    super();
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: fn,
        resolve,
        reject,
        addedAt: Date.now()
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Wait if needed
      if (now < this.nextExecutionTime) {
        await this.sleep(this.nextExecutionTime - now);
      }

      // Check if can execute
      if (await this.canExecute()) {
        const request = this.queue.shift();
        if (!request) break;

        this.executeRequest(request);
        this.recordRequest();

        // Calculate next execution time
        if (this.config.smoothing) {
          const delay = 1000 / this.config.maxPerSecond;
          this.nextExecutionTime = Date.now() + delay;
        }
      } else {
        // Wait before checking again
        await this.sleep(100);
      }
    }

    this.isProcessing = false;
  }

  private async executeRequest(request: {
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    addedAt: number;
  }): Promise<void> {
    try {
      const result = await request.execute();
      request.resolve(result);

      this.emit('executed', {
        waitTime: Date.now() - request.addedAt
      });
    } catch (error) {
      request.reject(error);
      
      this.emit('error', {
        error,
        waitTime: Date.now() - request.addedAt
      });
    }
  }

  private async canExecute(): Promise<boolean> {
    const now = Date.now();

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(t => 
      now - t < 60000 // Keep last minute
    );

    // Check per-second limit
    const lastSecond = this.requestTimestamps.filter(t => now - t < 1000);
    if (lastSecond.length >= this.config.maxPerSecond) {
      return false;
    }

    // Check per-minute limit
    if (this.config.maxPerMinute) {
      const lastMinute = this.requestTimestamps.filter(t => now - t < 60000);
      if (lastMinute.length >= this.config.maxPerMinute) {
        return false;
      }
    }

    // Check per-hour limit
    if (this.config.maxPerHour) {
      const lastHour = this.requestTimestamps.filter(t => now - t < 3600000);
      if (lastHour.length >= this.config.maxPerHour) {
        return false;
      }
    }

    return true;
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  getStats() {
    const now = Date.now();

    return {
      queueSize: this.queue.length,
      requestsLastSecond: this.requestTimestamps.filter(t => now - t < 1000).length,
      requestsLastMinute: this.requestTimestamps.filter(t => now - t < 60000).length,
      requestsLastHour: this.requestTimestamps.filter(t => now - t < 3600000).length,
      limits: {
        perSecond: this.config.maxPerSecond,
        perMinute: this.config.maxPerMinute,
        perHour: this.config.maxPerHour
      }
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}