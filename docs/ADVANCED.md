# Advanced Usage Guide

Advanced techniques and patterns for Ultra Scraper v1.1.0

## Table of Contents

- [Custom Plugins](#custom-plugins)
- [Advanced Queue Patterns](#advanced-queue-patterns)
- [Browser Pool Optimization](#browser-pool-optimization)
- [Performance Tuning](#performance-tuning)
- [Error Recovery](#error-recovery)
- [Distributed Scraping](#distributed-scraping)
- [Memory Management](#memory-management)
- [Security Best Practices](#security-best-practices)

---

## Custom Plugins

### Creating a Plugin

Plugins allow you to extend Ultra Scraper's functionality.
```typescript
import { Plugin, ScraperContext } from 'ultra-scraper';

class CustomHeaderPlugin implements Plugin {
  name = 'custom-headers';

  async beforeRequest(context: ScraperContext): Promise<void> {
    // Add custom headers
    context.options.headers = {
      ...context.options.headers,
      'X-Custom-Header': 'my-value',
      'X-Request-ID': generateRequestId()
    };
  }

  async afterRequest(context: ScraperContext): Promise<void> {
    // Log response time
    console.log(`Request to ${context.url} took ${context.responseTime}ms`);
  }

  async onError(context: ScraperContext, error: Error): Promise<void> {
    // Custom error handling
    await logToMonitoring(error, context);
  }
}

// Use plugin
const scraper = createScraper();
scraper.use(new CustomHeaderPlugin());
```

### Plugin Lifecycle
```typescript
interface Plugin {
  name: string;
  beforeRequest?(context: ScraperContext): Promise<void>;
  afterRequest?(context: ScraperContext): Promise<void>;
  onError?(context: ScraperContext, error: Error): Promise<void>;
}
```

### Example: Request Caching Plugin
```typescript
class CachePlugin implements Plugin {
  name = 'cache';
  private cache = new Map<string, CacheEntry>();
  private ttl: number;

  constructor(ttl: number = 300000) { // 5 minutes default
    this.ttl = ttl;
  }

  async beforeRequest(context: ScraperContext): Promise<void> {
    const cached = this.cache.get(context.url);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      // Return cached response
      context.response = cached.data;
      context.skipRequest = true;
      console.log(`Cache HIT: ${context.url}`);
    }
  }

  async afterRequest(context: ScraperContext): Promise<void> {
    if (context.response) {
      this.cache.set(context.url, {
        data: context.response,
        timestamp: Date.now()
      });
      console.log(`Cache SET: ${context.url}`);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Usage
const cache = new CachePlugin(600000); // 10 minutes
scraper.use(cache);

// Clear cache when needed
cache.clear();
```

### Example: Rate Limiting Plugin
```typescript
class SmartRateLimitPlugin implements Plugin {
  name = 'smart-rate-limit';
  private domains = new Map<string, RateLimiter>();

  async beforeRequest(context: ScraperContext): Promise<void> {
    const domain = new URL(context.url).hostname;
    
    let limiter = this.domains.get(domain);
    if (!limiter) {
      limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000
      });
      this.domains.set(domain, limiter);
    }

    await limiter.acquire();
  }

  async onError(context: ScraperContext, error: Error): Promise<void> {
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      const domain = new URL(context.url).hostname;
      const limiter = this.domains.get(domain);
      
      if (limiter) {
        // Reduce rate for this domain
        limiter.updateRate(5, 1000);
        console.log(`Reduced rate for ${domain}`);
      }
    }
  }
}
```

---

## Advanced Queue Patterns

### Priority-Based Processing
```typescript
import { createQueue, TaskPriority } from 'ultra-scraper';

const queue = createQueue(5);

// Critical tasks (process first)
await queue.add({
  id: 'critical-data',
  priority: TaskPriority.CRITICAL,
  execute: async () => {
    return await scraper.get('https://api.example.com/critical');
  }
});

// Normal tasks
await queue.add({
  id: 'normal-data',
  priority: TaskPriority.NORMAL,
  execute: async () => {
    return await scraper.get('https://api.example.com/data');
  }
});

// Background tasks (process last)
await queue.add({
  id: 'background-job',
  priority: TaskPriority.LOW,
  execute: async () => {
    return await scraper.get('https://api.example.com/stats');
  }
});
```

### Dynamic Priority Adjustment
```typescript
// Start with normal priority
const taskId = 'adjustable-task';
await queue.add({
  id: taskId,
  priority: TaskPriority.NORMAL,
  execute: async () => {
    return await scraper.get(url);
  }
});

// Upgrade to high priority based on conditions
if (urgentCondition) {
  await queue.updatePriority(taskId, TaskPriority.HIGH);
}
```

### Batch Processing with Dependencies
```typescript
class DependentTaskManager {
  constructor(private queue: TaskQueue) {}

  async processDependencies(tasks: DependentTask[]) {
    const results = new Map<string, any>();
    
    // Process in dependency order
    const sorted = this.topologicalSort(tasks);
    
    for (const task of sorted) {
      await this.queue.add({
        id: task.id,
        execute: async () => {
          // Wait for dependencies
          const depResults = task.dependencies.map(
            depId => results.get(depId)
          );
          
          const result = await task.execute(depResults);
          results.set(task.id, result);
          return result;
        }
      });
    }
    
    return results;
  }

  private topologicalSort(tasks: DependentTask[]): DependentTask[] {
    // Implementation of topological sort
    // ...
  }
}

// Usage
const manager = new DependentTaskManager(queue);

await manager.processDependencies([
  {
    id: 'fetch-categories',
    dependencies: [],
    execute: async () => await scraper.get('/categories')
  },
  {
    id: 'fetch-products',
    dependencies: ['fetch-categories'],
    execute: async (deps) => {
      const categories = deps[0];
      return await scraper.get(`/products?cat=${categories[0].id}`);
    }
  }
]);
```

### Queue Persistence
```typescript
import { TaskQueue, QueuePersistence } from 'ultra-scraper';

const queue = createQueue(5, {
  enablePersistence: true,
  persistencePath: './queue-state.json',
  saveInterval: 5000, // Save every 5 seconds
  compression: true
});

// Queue state is automatically saved
await queue.add({ /* task */ });

// On restart, tasks are restored
await queue.initialize(); // Loads saved tasks

// Manual save/load
const persistence = new QueuePersistence({
  path: './backup-queue.json'
});

await persistence.save(queue.getStats());
const savedTasks = await persistence.load();
```

---

## Browser Pool Optimization

### Dynamic Pool Scaling
```typescript
import { createBrowserPool } from 'ultra-scraper';

const pool = createBrowserPool(2, {
  minBrowsers: 2,
  maxBrowsers: 10,
  maxPages: 5,
  autoScale: true,
  scaleUpThreshold: 0.8,  // Scale up at 80% utilization
  scaleDownThreshold: 0.3  // Scale down at 30% utilization
});

await pool.initialize();

// Monitor scaling events
pool.on('scaleUp', (data) => {
  console.log(`Scaled up to ${data.newSize} browsers`);
});

pool.on('scaleDown', (data) => {
  console.log(`Scaled down to ${data.newSize} browsers`);
});

// Manual scaling
await pool.scale(5); // Scale to 5 browsers
```

### Page Pooling Strategy
```typescript
class PagePoolManager {
  private pool: BrowserPool;
  private pagePool: Page[] = [];
  private maxPoolSize = 20;

  constructor(pool: BrowserPool) {
    this.pool = pool;
  }

  async acquirePage(): Promise<Page> {
    // Try to get from pool first
    if (this.pagePool.length > 0) {
      return this.pagePool.pop()!;
    }

    // Acquire new page from browser pool
    return await this.pool.acquirePage();
  }

  async releasePage(page: Page): Promise<void> {
    // Clear cookies and cache
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto('about:blank');

    // Add to pool if not full
    if (this.pagePool.length < this.maxPoolSize) {
      this.pagePool.push(page);
    } else {
      await this.pool.releasePage(page);
    }
  }

  async cleanup(): Promise<void> {
    for (const page of this.pagePool) {
      await this.pool.releasePage(page);
    }
    this.pagePool = [];
  }
}
```

### Browser Context Isolation
```typescript
import { BrowserPool } from 'ultra-scraper';

const pool = createBrowserPool(3);
await pool.initialize();

// Create isolated contexts for different sessions
async function scrapeWithSession(sessionData: any) {
  const page = await pool.acquirePage();
  
  try {
    // Set session cookies
    await page.context().addCookies(sessionData.cookies);
    
    // Set localStorage
    await page.evaluate((data) => {
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });
    }, sessionData.localStorage);

    // Perform scraping
    await page.goto('https://example.com/protected');
    const data = await page.evaluate(() => {
      return document.querySelector('.data')?.textContent;
    });

    return data;
  } finally {
    await pool.releasePage(page);
  }
}

// Use with multiple sessions
const sessions = [session1, session2, session3];
const results = await Promise.all(
  sessions.map(session => scrapeWithSession(session))
);
```

---

## Performance Tuning

### Request Batching
```typescript
class BatchScraper {
  private scraper: Scraper;
  private batchSize = 10;
  private delayBetweenBatches = 1000;

  constructor(scraper: Scraper) {
    this.scraper = scraper;
  }

  async scrapeUrls(urls: string[]): Promise<ScraperResponse[]> {
    const results: ScraperResponse[] = [];
    
    for (let i = 0; i < urls.length; i += this.batchSize) {
      const batch = urls.slice(i, i + this.batchSize);
      
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1}`);
      
      const batchResults = await Promise.all(
        batch.map(url => this.scraper.get(url))
      );
      
      results.push(...batchResults);
      
      // Delay between batches
      if (i + this.batchSize < urls.length) {
        await this.delay(this.delayBetweenBatches);
      }
    }
    
    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const batchScraper = new BatchScraper(scraper);
const urls = ['url1', 'url2', /* ... 100 urls */];
const results = await batchScraper.scrapeUrls(urls);
```

### Connection Pooling
```typescript
import { Agent } from 'https';

const agent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

const scraper = createScraper({
  httpAgent: agent,
  httpsAgent: agent
});

// Reuse connections for better performance
for (const url of urls) {
  await scraper.get(url);
}

// Cleanup
agent.destroy();
```

### Parallel Processing with Workers
```typescript
import { Worker } from 'worker_threads';

class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: any[] = [];
  private availableWorkers: Worker[] = [];

  constructor(workerCount: number, workerScript: string) {
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
      
      worker.on('message', (result) => {
        this.handleWorkerResult(worker, result);
      });
    }
  }

  async execute(task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = this.availableWorkers.pop();
      
      if (worker) {
        worker.postMessage(task);
        worker.once('message', resolve);
        worker.once('error', reject);
      } else {
        this.taskQueue.push({ task, resolve, reject });
      }
    });
  }

  private handleWorkerResult(worker: Worker, result: any): void {
    if (this.taskQueue.length > 0) {
      const { task, resolve, reject } = this.taskQueue.shift();
      worker.postMessage(task);
      worker.once('message', resolve);
      worker.once('error', reject);
    } else {
      this.availableWorkers.push(worker);
    }
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map(w => w.terminate()));
  }
}
```

---

## Error Recovery

### Exponential Backoff with Jitter
```typescript
class SmartRetry {
  private baseDelay = 1000;
  private maxDelay = 30000;
  private maxRetries = 5;

  async execute<T>(
    fn: () => Promise<T>,
    options?: { retries?: number }
  ): Promise<T> {
    const maxRetries = options?.retries ?? this.maxRetries;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          this.maxDelay
        );
        
        // Add jitter (±25%)
        const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
        const delay = Math.floor(exponentialDelay + jitter);

        console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retry = new SmartRetry();

const result = await retry.execute(async () => {
  return await scraper.get('https://flaky-api.example.com');
});
```

### Circuit Breaker Pattern
```typescript
import { CircuitBreaker, CircuitState } from 'ultra-scraper';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenRequests: 3
});

breaker.on('stateChange', (state: CircuitState) => {
  console.log(`Circuit breaker state: ${state}`);
  
  if (state === CircuitState.OPEN) {
    // Alert monitoring system
    sendAlert('Circuit breaker opened');
  }
});

async function resilientFetch(url: string) {
  try {
    return await breaker.execute(async () => {
      return await scraper.get(url);
    });
  } catch (error) {
    if (error.name === 'CircuitBreakerOpenError') {
      // Use fallback
      return await getFallbackData(url);
    }
    throw error;
  }
}
```

### Dead Letter Queue Monitoring
```typescript
const queue = createQueue(5, {
  enableDeadLetter: true,
  maxRetries: 3
});

const dlq = queue.getDeadLetterQueue();

// Monitor dead letter queue
dlq.on('taskAdded', (data) => {
  console.error(`Task failed permanently: ${data.taskId}`);
  
  // Send to monitoring
  sendToMonitoring({
    event: 'task_failed',
    taskId: data.taskId,
    error: data.error
  });
});

// Periodic DLQ analysis
setInterval(() => {
  const stats = dlq.getErrorStats();
  
  console.log('DLQ Error Statistics:');
  Object.entries(stats).forEach(([errorType, count]) => {
    console.log(`  ${errorType}: ${count}`);
  });
  
  // Retry recoverable errors
  const recoverableTasks = dlq.getAll().filter(task => 
    isRecoverable(task.lastError)
  );
  
  recoverableTasks.forEach(async task => {
    dlq.remove(task.id!);
    await queue.retryFailed(task.id!);
  });
}, 300000); // Every 5 minutes
```

---

## Distributed Scraping

### Redis-Based Queue
```typescript
import { createClient } from 'redis';

class DistributedQueue {
  private redis: RedisClient;
  private queueKey = 'scraper:queue';

  constructor(redisUrl: string) {
    this.redis = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async enqueue(task: Task): Promise<void> {
    await this.redis.rPush(this.queueKey, JSON.stringify(task));
  }

  async dequeue(): Promise<Task | null> {
    const data = await this.redis.lPop(this.queueKey);
    return data ? JSON.parse(data) : null;
  }

  async size(): Promise<number> {
    return await this.redis.lLen(this.queueKey);
  }
}

// Worker process
const queue = new DistributedQueue('redis://localhost:6379');
await queue.connect();

while (true) {
  const task = await queue.dequeue();
  
  if (task) {
    try {
      const result = await task.execute();
      await saveResult(result);
    } catch (error) {
      await queue.enqueue(task); // Re-queue on failure
    }
  } else {
    await sleep(1000); // Wait for new tasks
  }
}
```

### Multi-Node Coordination
```typescript
import { EventEmitter } from 'events';

class ClusterCoordinator extends EventEmitter {
  private nodeId: string;
  private nodes = new Map<string, NodeInfo>();

  constructor(nodeId: string) {
    super();
    this.nodeId = nodeId;
  }

  async registerNode(): Promise<void> {
    this.nodes.set(this.nodeId, {
      id: this.nodeId,
      heartbeat: Date.now(),
      load: 0
    });

    // Send heartbeat every 5 seconds
    setInterval(() => {
      this.sendHeartbeat();
    }, 5000);
  }

  async distributeTask(task: Task): Promise<string> {
    // Find node with lowest load
    const targetNode = this.findLeastLoadedNode();
    
    if (targetNode === this.nodeId) {
      // Execute locally
      return 'local';
    } else {
      // Send to remote node
      await this.sendToNode(targetNode, task);
      return targetNode;
    }
  }

  private findLeastLoadedNode(): string {
    let minLoad = Infinity;
    let targetNode = this.nodeId;

    for (const [nodeId, info] of this.nodes) {
      if (info.load < minLoad && this.isNodeHealthy(info)) {
        minLoad = info.load;
        targetNode = nodeId;
      }
    }

    return targetNode;
  }

  private isNodeHealthy(node: NodeInfo): boolean {
    return Date.now() - node.heartbeat < 15000; // 15 seconds
  }

  private sendHeartbeat(): void {
    const node = this.nodes.get(this.nodeId)!;
    node.heartbeat = Date.now();
    this.emit('heartbeat', node);
  }

  private async sendToNode(nodeId: string, task: Task): Promise<void> {
    // Implementation depends on your communication protocol
    // (HTTP, WebSockets, message queue, etc.)
  }
}
```

---

## Memory Management

### Streaming Large Responses
```typescript
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

class StreamingScraper {
  async downloadLargeFile(url: string, outputPath: string): Promise<void> {
    const response = await fetch(url);
    
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const fileStream = createWriteStream(outputPath);
    
    await pipeline(
      response.body as any,
      fileStream
    );
    
    console.log(`Downloaded to ${outputPath}`);
  }

  async *streamPages(urls: string[]): AsyncGenerator<string> {
    for (const url of urls) {
      const html = await scraper.get(url);
      yield html.html;
      
      // Allow garbage collection
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}

// Usage
const streaming = new StreamingScraper();

// Download large file
await streaming.downloadLargeFile(
  'https://example.com/large-file.zip',
  './output/file.zip'
);

// Stream processing
for await (const html of streaming.streamPages(urls)) {
  const data = parseHtml(html);
  await saveToDatabase(data);
  // html is garbage collected after each iteration
}
```

### Memory-Efficient Data Processing
```typescript
class ChunkedProcessor {
  private chunkSize = 1000;

  async processLargeDataset(
    getData: () => AsyncGenerator<any>,
    processChunk: (chunk: any[]) => Promise<void>
  ): Promise<void> {
    let chunk: any[] = [];

    for await (const item of getData()) {
      chunk.push(item);

      if (chunk.length >= this.chunkSize) {
        await processChunk(chunk);
        chunk = []; // Clear for garbage collection
        
        // Force garbage collection (if --expose-gc flag is set)
        if (global.gc) {
          global.gc();
        }
      }
    }

    // Process remaining items
    if (chunk.length > 0) {
      await processChunk(chunk);
    }
  }
}

// Usage
const processor = new ChunkedProcessor();

await processor.processLargeDataset(
  async function* () {
    // Generator that yields data items
    for (const url of urls) {
      const data = await scraper.get(url);
      yield data;
    }
  },
  async (chunk) => {
    // Process chunk
    await database.insertMany(chunk);
  }
);
```

---

## Security Best Practices

### Request Signing
```typescript
import { createHmac } from 'crypto';

class SecureScraper {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private signRequest(url: string, timestamp: number): string {
    const message = `${url}:${timestamp}`;
    return createHmac('sha256', this.secretKey)
      .update(message)
      .digest('hex');
  }

  async secureGet(url: string): Promise<any> {
    const timestamp = Date.now();
    const signature = this.signRequest(url, timestamp);

    return await scraper.get(url, {
      headers: {
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature
      }
    });
  }
}
```

### API Key Rotation
```typescript
class APIKeyManager {
  private keys: string[] = [];
  private currentIndex = 0;
  private rotationInterval = 3600000; // 1 hour

  constructor(keys: string[]) {
    this.keys = keys;
    this.startRotation();
  }

  getCurrentKey(): string {
    return this.keys[this.currentIndex];
  }

  private startRotation(): void {
    setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      console.log(`Rotated to API key ${this.currentIndex + 1}`);
    }, this.rotationInterval);
  }

  async fetchWithRotation(url: string): Promise<any> {
    const apiKey = this.getCurrentKey();
    
    return await scraper.get(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
  }
}

// Usage
const keyManager = new APIKeyManager([
  'key1',
  'key2',
  'key3'
]);

const result = await keyManager.fetchWithRotation('https://api.example.com');
```

### Data Sanitization
```typescript
import DOMPurify from 'isomorphic-dompurify';

class SecureDataExtractor {
  sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
      ALLOWED_ATTR: []
    });
  }

  async extractSafeData(url: string): Promise<any> {
    const response = await scraper.get(url);
    const $ = cheerio.load(response.html);

    // Extract and sanitize
    const data = {
      title: this.sanitizeText($('title').text()),
      content: this.sanitizeHtml($('.content').html() || ''),
      metadata: {
        author: this.sanitizeText($('meta[name="author"]').attr('content') || ''),
        description: this.sanitizeText($('meta[name="description"]').attr('content') || '')
      }
    };

    return data;
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[^\w\s.-]/g, '') // Remove special characters
      .trim();
  }
}
```

---

## Monitoring and Observability

### Structured Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'scraper-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'scraper-combined.log' })
  ]
});

class ObservableScraper {
  async fetch(url: string): Promise<any> {
    const startTime = Date.now();
    const requestId = generateId();

    logger.info('Request started', {
      requestId,
      url,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await scraper.get(url);
      
      logger.info('Request completed', {
        requestId,
        url,
        duration: Date.now() - startTime,
        status: result.status
      });

      return result;
    } catch (error) {
      logger.error('Request failed', {
        requestId,
        url,
        duration: Date.now() - startTime,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }
}
```

### Metrics Collection
```typescript
import { Counter, Histogram, Registry } from 'prom-client';

const registry = new Registry();

const requestCounter = new Counter({
  name: 'scraper_requests_total',
  help: 'Total number of scraping requests',
  labelNames: ['status', 'url'],
  registers: [registry]
});

const requestDuration = new Histogram({
  name: 'scraper_request_duration_seconds',
  help: 'Duration of scraping requests',
  labelNames: ['url'],
  registers: [registry]
});

class MetricsScraper {
  async fetch(url: string): Promise<any> {
    const timer = requestDuration.startTimer({ url });

    try {
      const result = await scraper.get(url);
      requestCounter.inc({ status: 'success', url });
      return result;
    } catch (error) {
      requestCounter.inc({ status: 'error', url });
      throw error;
    } finally {
      timer();
    }
  }

  getMetrics(): string {
    return registry.metrics();
  }
}
```

---

## Testing Strategies

### Mock Server for Testing
```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('https://test.example.com/api/data', (req, res, ctx) => {
    return res(
      ctx.json({
        data: 'mocked response'
      })
    );
  })
);

describe('Scraper Tests', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should fetch data', async () => {
    const result = await scraper.get('https://test.example.com/api/data');
    expect(result.data).toBe('mocked response');
  });
});
```

---

## Conclusion

These advanced patterns enable you to build robust, scalable, and efficient scraping systems. Combine them based on your specific needs and always monitor performance and reliability.

For more information, see:
- [API Documentation](./API.md)
- [Anti-Bot Guide](./ANTI_BOT.md)
- [Queue System Guide](./QUEUE_SYSTEM.md)