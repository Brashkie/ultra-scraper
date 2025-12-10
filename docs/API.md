# API Reference

Complete API documentation for Ultra Scraper v1.1.0

## Table of Contents

- [Factory Functions](#factory-functions)
- [Core Classes](#core-classes)
  - [Scraper](#scraper)
  - [BrowserPool](#browserpool)
  - [TaskQueue](#taskqueue)
- [Queue System](#queue-system)
- [Concurrency](#concurrency)
- [Anti-Bot Detection](#anti-bot-detection)
- [Strategies](#strategies)
- [Monitoring](#monitoring)
- [Types](#types)

---

## Factory Functions

### createScraper()

Creates a new Scraper instance with default or custom configuration.
```typescript
function createScraper(options?: ScraperOptions): Scraper
```

**Parameters:**
- `options` (optional): Configuration options for the scraper

**Returns:** `Scraper` instance

**Example:**
```typescript
import { createScraper } from 'ultra-scraper';

const scraper = createScraper({
  timeout: 10000,
  retries: 3,
  dynamic: true
});
```

**Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `retries` | `number` | `3` | Number of retry attempts |
| `dynamic` | `boolean` | `false` | Use browser for dynamic content |
| `headers` | `Record<string, string>` | `{}` | Default headers for requests |
| `proxy` | `string` | - | Proxy server URL |

---

### createQueue()

Creates a new TaskQueue with specified concurrency.
```typescript
function createQueue(concurrency: number, options?: QueueConfig): TaskQueue
```

**Parameters:**
- `concurrency`: Maximum number of concurrent tasks
- `options` (optional): Queue configuration

**Returns:** `TaskQueue` instance

**Example:**
```typescript
import { createQueue, TaskPriority } from 'ultra-scraper';

const queue = createQueue(5, {
  maxQueueSize: 1000,
  enableDeadLetter: true,
  maxRetries: 3
});

await queue.add({
  id: 'task-1',
  priority: TaskPriority.HIGH,
  execute: async () => {
    // Task logic
    return result;
  }
});
```

---

### createBrowserPool()

Creates a browser pool for parallel scraping.
```typescript
function createBrowserPool(size: number, config?: BrowserPoolConfig): BrowserPool
```

**Parameters:**
- `size`: Number of browser instances in the pool
- `config` (optional): Pool configuration

**Returns:** `BrowserPool` instance

**Example:**
```typescript
import { createBrowserPool } from 'ultra-scraper';

const pool = await createBrowserPool(3, {
  browserType: 'chromium',
  maxPages: 10,
  launchOptions: {
    headless: true,
    args: ['--no-sandbox']
  }
});

await pool.initialize();

const page = await pool.acquirePage();
await page.goto('https://example.com');
await pool.releasePage(page);
```

---

## Core Classes

### Scraper

Main class for web scraping operations.

#### Constructor
```typescript
new Scraper(options?: ScraperOptions)
```

#### Methods

##### get()

Fetches a webpage and returns its HTML content.
```typescript
async get(url: string, options?: RequestOptions): Promise<ScraperResponse>
```

**Example:**
```typescript
const response = await scraper.get('https://example.com');
console.log(response.html);
console.log(response.status);
console.log(response.responseTime);
```

**Response:**
```typescript
interface ScraperResponse {
  html: string;
  status: number;
  headers: Record<string, string>;
  responseTime: number;
  url: string;
}
```

##### query()

Fetches a page and returns a Cheerio instance for DOM manipulation.
```typescript
async query(url: string, selector?: string): Promise<CheerioAPI>
```

**Example:**
```typescript
const $ = await scraper.query('https://example.com');
const title = $('h1').text();
const links = $('a').map((i, el) => $(el).attr('href')).get();
```

##### extract()

Extracts structured data from a webpage.
```typescript
async extract<T>(url: string, schema: ExtractionSchema): Promise<T[]>
```

**Example:**
```typescript
const products = await scraper.extract('https://store.com/products', {
  name: 'h2.product-name',
  price: {
    selector: '.price',
    transform: (text) => parseFloat(text.replace('$', ''))
  },
  image: {
    selector: 'img',
    attr: 'src'
  }
});
```

---

### BrowserPool

Manages a pool of browser instances for efficient scraping.

#### Methods

##### initialize()

Initializes all browsers in the pool.
```typescript
async initialize(): Promise<void>
```

##### acquirePage()

Gets an available page from the pool.
```typescript
async acquirePage(options?: { timeout?: number }): Promise<Page>
```

**Example:**
```typescript
const page = await pool.acquirePage({ timeout: 5000 });

try {
  await page.goto('https://example.com');
  const content = await page.content();
} finally {
  await pool.releasePage(page);
}
```

##### releasePage()

Returns a page to the pool.
```typescript
async releasePage(page: Page): Promise<void>
```

##### getMetrics()

Gets pool statistics.
```typescript
getMetrics(): PoolMetrics
```

**Returns:**
```typescript
interface PoolMetrics {
  browserCount: number;
  totalPages: number;
  availablePages: number;
  utilization: number;
  averageResponseTime: number;
}
```

---

### TaskQueue

Priority-based task queue with concurrency control.

#### Methods

##### add()

Adds a task or tasks to the queue.
```typescript
async add(task: Task | Task[]): Promise<void>
```

**Example:**
```typescript
await queue.add({
  id: 'scrape-product',
  priority: TaskPriority.HIGH,
  execute: async () => {
    const data = await scraper.get('https://example.com/product');
    return data;
  }
});
```

##### addBatch()

Adds multiple tasks with batch processing.
```typescript
async addBatch(tasks: Task[], options?: BatchOptions): Promise<void>
```

**Example:**
```typescript
const urls = ['url1', 'url2', 'url3'];
const tasks = urls.map(url => ({
  id: url,
  execute: async () => await scraper.get(url)
}));

await queue.addBatch(tasks, {
  batchSize: 10,
  delayBetweenBatches: 1000
});
```

##### pause() / resume()

Controls queue processing.
```typescript
pause(): void
resume(): void
```

##### getStats()

Gets queue statistics.
```typescript
getStats(): QueueStats
```

**Returns:**
```typescript
interface QueueStats {
  totalAdded: number;
  totalProcessed: number;
  queueSize: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  averageProcessTime: number;
}
```

---

## Queue System

### PriorityQueue

Internal queue that orders tasks by priority.
```typescript
enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}
```

### DeadLetterQueue

Stores failed tasks for later analysis.
```typescript
const dlq = queue.getDeadLetterQueue();
const failedTasks = dlq.getAll();
const errorStats = dlq.getErrorStats();
```

### QueueScheduler

Schedule tasks with cron expressions.
```typescript
import { QueueScheduler, CronBuilder } from 'ultra-scraper';

const scheduler = new QueueScheduler(queue);

// Using cron expression
scheduler.schedule('daily-scrape', '0 0 * * *', async () => {
  return await scraper.get('https://example.com');
});

// Using CronBuilder
const cron = new CronBuilder()
  .everyDay()
  .at('08:00')
  .build();

scheduler.schedule('morning-task', cron, taskFunction);
```

---

## Concurrency

### RateLimiter

Controls request rate.
```typescript
import { RateLimiter } from 'ultra-scraper';

const limiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 1000,
  strategy: 'sliding-window'
});

await limiter.acquire();
// Make request
```

### LoadBalancer

Distributes requests across multiple targets.
```typescript
import { LoadBalancer } from 'ultra-scraper';

const balancer = new LoadBalancer({
  targets: [
    { url: 'https://api1.example.com', weight: 3 },
    { url: 'https://api2.example.com', weight: 2 }
  ],
  strategy: 'weighted-round-robin'
});

const target = balancer.getNext();
```

---

## Anti-Bot Detection

### AntiBotDetector

Detects anti-bot protections.
```typescript
import { AntiBotDetector } from 'ultra-scraper';

const detector = new AntiBotDetector();
const detection = await detector.detect(page);

if (detection.isBlocked) {
  console.log('Block type:', detection.blockType);
  console.log('Bypass strategy:', detection.bypassStrategy);
}
```

### StealthMode

Evades bot detection.
```typescript
import { StealthMode } from 'ultra-scraper';

const stealth = new StealthMode();
await stealth.apply(page);
```

---

## Strategies

### BackoffStrategy

Exponential backoff for retries.
```typescript
import { createExponentialBackoff } from 'ultra-scraper';

const backoff = createExponentialBackoff(1000, 30000);
const delay = backoff.calculate(attemptNumber);
```

### CircuitBreaker

Prevents cascading failures.
```typescript
import { createCircuitBreaker } from 'ultra-scraper';

const breaker = createCircuitBreaker(5, 60000);

try {
  await breaker.execute(async () => {
    return await scraper.get(url);
  });
} catch (error) {
  if (error.name === 'CircuitBreakerOpenError') {
    console.log('Circuit is open, requests blocked');
  }
}
```

### RetryStrategy

Smart retry logic.
```typescript
import { createRetryStrategy } from 'ultra-scraper';

const retry = createRetryStrategy(3);
const result = await retry.execute(async () => {
  return await scraper.get(url);
});
```

---

## Monitoring

### PerformanceMonitor

Tracks performance metrics.
```typescript
import { createPerformanceMonitor } from 'ultra-scraper';

const monitor = createPerformanceMonitor(60000);

monitor.recordRequest(responseTime, wasSuccessful);

const metrics = monitor.getMetrics();
console.log('P95 latency:', metrics.p95);
console.log('Throughput:', metrics.throughput);
```

### PoolAnalytics

Analyzes pool utilization.
```typescript
import { createPoolAnalytics } from 'ultra-scraper';

const analytics = createPoolAnalytics(5000);

analytics.on('highUtilization', (data) => {
  console.log('Pool utilization high:', data.utilization);
  // Scale up pool
});
```

---

## Types

### Core Types
```typescript
interface Task {
  id?: string;
  priority?: TaskPriority;
  execute: () => Promise<any>;
  retries?: number;
  timeout?: number;
  status?: TaskStatus;
}

interface ScraperOptions {
  timeout?: number;
  retries?: number;
  dynamic?: boolean;
  headers?: Record<string, string>;
  proxy?: string;
  userAgent?: string;
}

interface BrowserPoolConfig {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  minBrowsers?: number;
  maxBrowsers?: number;
  maxPages?: number;
  launchOptions?: LaunchOptions;
}
```

### Events

All major classes extend EventEmitter and emit various events:

**Scraper Events:**
- `beforeRequest` - Before making a request
- `afterRequest` - After receiving response
- `error` - On request error

**TaskQueue Events:**
- `taskAdded` - Task added to queue
- `taskStarted` - Task execution started
- `taskCompleted` - Task completed successfully
- `taskFailed` - Task failed
- `taskRetrying` - Task is being retried

**BrowserPool Events:**
- `browserCreated` - New browser instance created
- `pageAcquired` - Page acquired from pool
- `pageReleased` - Page returned to pool
- `scaleUp` - Pool is scaling up
- `scaleDown` - Pool is scaling down

---

## Error Handling

### Common Errors
```typescript
try {
  const response = await scraper.get(url);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Handle timeout
  } else if (error.code === 'INVALID_URL') {
    // Handle invalid URL
  } else if (error.code === 'RATE_LIMIT') {
    // Handle rate limit
  }
}
```

### Custom Error Types

- `ScraperError` - Base error class
- `TimeoutError` - Request timeout
- `RateLimitError` - Rate limit exceeded
- `CircuitBreakerOpenError` - Circuit breaker open
- `BrowserPoolError` - Pool-related errors

---

## Best Practices

### 1. Always Release Resources
```typescript
const page = await pool.acquirePage();
try {
  // Use page
} finally {
  await pool.releasePage(page);
}
```

### 2. Handle Errors Gracefully
```typescript
queue.on('taskFailed', async (event) => {
  console.error(`Task ${event.task.id} failed:`, event.error);
  // Log to monitoring system
});
```

### 3. Use Appropriate Concurrency
```typescript
// Don't overload target servers
const queue = createQueue(3); // Conservative concurrency
```

### 4. Monitor Performance
```typescript
const monitor = createPerformanceMonitor();
setInterval(() => {
  const metrics = monitor.getMetrics();
  console.log('Performance:', metrics);
}, 60000);
```

---

## Version History

See [CHANGELOG.md](../CHANGELOG.md) for detailed version history.

## License

MIT License - see [LICENSE](../LICENSE) for details.