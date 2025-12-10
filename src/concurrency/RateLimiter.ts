import { EventEmitter } from 'events';

interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burst?: number; // Burst capacity (token bucket)
  strategy?: 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';
  adaptive?: {
    enabled: boolean;
    targetErrorRate: number;
    increaseStep: number;
    decreaseStep: number;
    minRate: number;
    maxRate: number;
  };
}

interface RateLimitWindow {
  start: number;
  count: number;
  requests: number[];
}

export class RateLimiter extends EventEmitter {
  private windows: Map<string, RateLimitWindow> = new Map();
  private tokenBucket: {
    tokens: number;
    capacity: number;
    refillRate: number;
    lastRefill: number;
  } | null = null;

  private leakyBucket: {
    queue: Array<{ resolve: () => void; timestamp: number }>;
    capacity: number;
    leakRate: number;
    lastLeak: number;
  } | null = null;

  private currentRate: number;
  private adaptiveMetrics = {
    successCount: 0,
    errorCount: 0,
    totalRequests: 0,
    lastAdjustment: Date.now()
  };

  constructor(private config: RateLimitConfig) {
    super();

    // Initialize rate
    this.currentRate = config.requestsPerSecond || 
                      (config.requestsPerMinute ? config.requestsPerMinute / 60 : 1);

    // Initialize strategy-specific data structures
    this.initializeStrategy();

    // Start adaptive rate limiting if enabled
    if (config.adaptive?.enabled) {
      this.startAdaptiveRateLimiting();
    }
  }

  private initializeStrategy(): void {
    switch (this.config.strategy) {
      case 'token-bucket':
        this.initializeTokenBucket();
        break;
      
      case 'leaky-bucket':
        this.initializeLeakyBucket();
        break;
      
      case 'sliding-window':
      case 'fixed-window':
      default:
        // No additional initialization needed
        break;
    }
  }

  private initializeTokenBucket(): void {
    const capacity = this.config.burst || Math.ceil(this.currentRate * 2);
    
    this.tokenBucket = {
      tokens: capacity,
      capacity,
      refillRate: this.currentRate,
      lastRefill: Date.now()
    };

    // Start token refill
    this.startTokenRefill();
  }

  private startTokenRefill(): void {
    setInterval(() => {
      if (!this.tokenBucket) return;

      const now = Date.now();
      const elapsed = (now - this.tokenBucket.lastRefill) / 1000;
      const tokensToAdd = elapsed * this.tokenBucket.refillRate;

      this.tokenBucket.tokens = Math.min(
        this.tokenBucket.capacity,
        this.tokenBucket.tokens + tokensToAdd
      );

      this.tokenBucket.lastRefill = now;
    }, 100); // Refill every 100ms
  }

  private initializeLeakyBucket(): void {
    const capacity = this.config.burst || Math.ceil(this.currentRate * 10);
    
    this.leakyBucket = {
      queue: [],
      capacity,
      leakRate: this.currentRate,
      lastLeak: Date.now()
    };

    // Start bucket leak
    this.startBucketLeak();
  }

  private startBucketLeak(): void {
    setInterval(() => {
      if (!this.leakyBucket || this.leakyBucket.queue.length === 0) return;

      const now = Date.now();
      const elapsed = (now - this.leakyBucket.lastLeak) / 1000;
      const requestsToLeak = Math.floor(elapsed * this.leakyBucket.leakRate);

      for (let i = 0; i < requestsToLeak && this.leakyBucket.queue.length > 0; i++) {
        const request = this.leakyBucket.queue.shift();
        if (request) {
          request.resolve();
        }
      }

      this.leakyBucket.lastLeak = now;
    }, 100); // Leak every 100ms
  }

  async acquire(key: string = 'default'): Promise<void> {
    this.adaptiveMetrics.totalRequests++;

    switch (this.config.strategy) {
      case 'token-bucket':
        await this.acquireTokenBucket();
        break;
      
      case 'leaky-bucket':
        await this.acquireLeakyBucket();
        break;
      
      case 'sliding-window':
        await this.acquireSlidingWindow(key);
        break;
      
      case 'fixed-window':
      default:
        await this.acquireFixedWindow(key);
        break;
    }

    this.emit('acquired', { key, strategy: this.config.strategy });
  }

  // Fixed Window Strategy
  private async acquireFixedWindow(key: string): Promise<void> {
    const now = Date.now();
    const windowSize = this.getWindowSize();
    const windowStart = Math.floor(now / windowSize) * windowSize;

    let window = this.windows.get(key);

    if (!window || window.start !== windowStart) {
      // New window
      window = {
        start: windowStart,
        count: 0,
        requests: []
      };
      this.windows.set(key, window);
    }

    const limit = this.getLimit(windowSize);

    if (window.count >= limit) {
      // Wait until next window
      const waitTime = windowStart + windowSize - now;
      await this.sleep(waitTime);
      return this.acquireFixedWindow(key);
    }

    window.count++;
    this.emit('windowUpdate', { key, count: window.count, limit });
  }

  // Sliding Window Strategy
  private async acquireSlidingWindow(key: string): Promise<void> {
    const now = Date.now();
    const windowSize = this.getWindowSize();
    const windowStart = now - windowSize;

    let window = this.windows.get(key);

    if (!window) {
      window = {
        start: now,
        count: 0,
        requests: []
      };
      this.windows.set(key, window);
    }

    // Remove old requests
    window.requests = window.requests.filter(t => t > windowStart);
    window.count = window.requests.length;

    const limit = this.getLimit(windowSize);

    if (window.count >= limit) {
      // Wait until oldest request expires
      const oldestRequest = Math.min(...window.requests);
      const waitTime = oldestRequest + windowSize - now + 1;
      
      await this.sleep(waitTime);
      return this.acquireSlidingWindow(key);
    }

    window.requests.push(now);
    window.count++;
    
    this.emit('windowUpdate', { key, count: window.count, limit });
  }

  // Token Bucket Strategy
  private async acquireTokenBucket(): Promise<void> {
    if (!this.tokenBucket) {
      throw new Error('Token bucket not initialized');
    }

    // Refill tokens
    const now = Date.now();
    const elapsed = (now - this.tokenBucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.tokenBucket.refillRate;

    this.tokenBucket.tokens = Math.min(
      this.tokenBucket.capacity,
      this.tokenBucket.tokens + tokensToAdd
    );
    this.tokenBucket.lastRefill = now;

    // Check if token available
    if (this.tokenBucket.tokens >= 1) {
      this.tokenBucket.tokens -= 1;
      this.emit('tokenConsumed', { 
        remaining: this.tokenBucket.tokens,
        capacity: this.tokenBucket.capacity
      });
      return;
    }

    // Wait for token
    const waitTime = (1 - this.tokenBucket.tokens) / this.tokenBucket.refillRate * 1000;
    await this.sleep(waitTime);
    return this.acquireTokenBucket();
  }

  // Leaky Bucket Strategy
  private async acquireLeakyBucket(): Promise<void> {
    if (!this.leakyBucket) {
      throw new Error('Leaky bucket not initialized');
    }

    // Check if bucket is full
    if (this.leakyBucket.queue.length >= this.leakyBucket.capacity) {
      throw new Error('Rate limit exceeded: bucket is full');
    }

    // Add to queue
    return new Promise((resolve) => {
      this.leakyBucket!.queue.push({
        resolve,
        timestamp: Date.now()
      });
    });
  }

  // Adaptive Rate Limiting
  private startAdaptiveRateLimiting(): void {
    setInterval(() => {
      this.adjustAdaptiveRate();
    }, 10000); // Evaluate every 10 seconds
  }

  private adjustAdaptiveRate(): void {
    const config = this.config.adaptive;
    if (!config) return;

    const { successCount, errorCount, totalRequests } = this.adaptiveMetrics;

    if (totalRequests === 0) return;

    const errorRate = errorCount / totalRequests;

    // Adjust rate based on error rate
    if (errorRate > config.targetErrorRate) {
      // Too many errors, decrease rate
      this.currentRate = Math.max(
        config.minRate,
        this.currentRate - config.decreaseStep
      );

      this.emit('rateDecreased', {
        newRate: this.currentRate,
        errorRate,
        reason: 'high_error_rate'
      });

    } else if (errorRate < config.targetErrorRate * 0.5) {
      // Low error rate, can increase
      this.currentRate = Math.min(
        config.maxRate,
        this.currentRate + config.increaseStep
      );

      this.emit('rateIncreased', {
        newRate: this.currentRate,
        errorRate,
        reason: 'low_error_rate'
      });
    }

    // Reset metrics
    this.adaptiveMetrics = {
      successCount: 0,
      errorCount: 0,
      totalRequests: 0,
      lastAdjustment: Date.now()
    };

    // Update token bucket if using it
    if (this.tokenBucket) {
      this.tokenBucket.refillRate = this.currentRate;
    }

    // Update leaky bucket if using it
    if (this.leakyBucket) {
      this.leakyBucket.leakRate = this.currentRate;
    }
  }

  recordSuccess(): void {
    this.adaptiveMetrics.successCount++;
  }

  recordError(): void {
    this.adaptiveMetrics.errorCount++;
  }

  // Rate limit for multiple keys (domains, IPs, etc.)
  async acquireForDomain(domain: string): Promise<void> {
    return this.acquire(domain);
  }

  async acquireForIP(ip: string): Promise<void> {
    return this.acquire(`ip:${ip}`);
  }

  // Utilities
  private getWindowSize(): number {
    if (this.config.requestsPerSecond) {
      return 1000;
    } else if (this.config.requestsPerMinute) {
      return 60000;
    } else if (this.config.requestsPerHour) {
      return 3600000;
    } else if (this.config.requestsPerDay) {
      return 86400000;
    }
    return 1000; // Default to 1 second
  }

  private getLimit(windowSize: number): number {
    const seconds = windowSize / 1000;

    if (this.config.requestsPerSecond) {
      return Math.ceil(this.config.requestsPerSecond * seconds);
    } else if (this.config.requestsPerMinute) {
      return Math.ceil(this.config.requestsPerMinute * seconds / 60);
    } else if (this.config.requestsPerHour) {
      return Math.ceil(this.config.requestsPerHour * seconds / 3600);
    } else if (this.config.requestsPerDay) {
      return Math.ceil(this.config.requestsPerDay * seconds / 86400);
    }

    return 1;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Stats
  getStats(key: string = 'default') {
    const window = this.windows.get(key);
    const windowSize = this.getWindowSize();
    const limit = this.getLimit(windowSize);

    return {
      key,
      strategy: this.config.strategy,
      currentRate: this.currentRate,
      window: window ? {
        count: window.count,
        limit,
        remaining: limit - window.count,
        resetAt: window.start + windowSize
      } : null,
      tokenBucket: this.tokenBucket ? {
        tokens: this.tokenBucket.tokens,
        capacity: this.tokenBucket.capacity,
        refillRate: this.tokenBucket.refillRate
      } : null,
      leakyBucket: this.leakyBucket ? {
        queueSize: this.leakyBucket.queue.length,
        capacity: this.leakyBucket.capacity,
        leakRate: this.leakyBucket.leakRate
      } : null,
      adaptive: this.config.adaptive?.enabled ? {
        ...this.adaptiveMetrics,
        currentRate: this.currentRate
      } : null
    };
  }

  reset(key?: string): void {
    if (key) {
      this.windows.delete(key);
    } else {
      this.windows.clear();
    }

    if (this.tokenBucket) {
      this.tokenBucket.tokens = this.tokenBucket.capacity;
    }

    if (this.leakyBucket) {
      this.leakyBucket.queue = [];
    }
  }
}