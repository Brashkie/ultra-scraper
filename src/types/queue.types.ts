export enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled'
}

export interface Task {
  id?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  retries?: number;
  addedAt?: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  lastError?: Error;
  result?: any;
  metadata?: Record<string, any>;
  execute: () => Promise<any>;
}

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
  saveInterval?: number;
  compression?: boolean;
}

export interface QueueMetrics {
  totalAdded: number;
  totalProcessed: number;
  totalFailed: number;
  totalRetried: number;
  totalCancelled: number;
  queueSize: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  averageProcessTime: number;
  peakConcurrency: number;
  isPaused: boolean;
  isStopped: boolean;
}

export interface DeadLetterConfig {
  maxSize: number;
  retentionTime?: number; // Time to keep failed tasks in ms
  autoRetry?: {
    enabled: boolean;
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

export interface ScheduleConfig {
  type: 'once' | 'interval' | 'cron' | 'delayed';
  
  // For 'once' and 'delayed'
  executeAt?: Date | number;
  delay?: number;
  
  // For 'interval'
  interval?: number;
  maxExecutions?: number;
  
  // For 'cron'
  cronExpression?: string;
  timezone?: string;
  
  // Common
  priority?: TaskPriority;
  retryOnError?: boolean;
  maxRetries?: number;
  enabled?: boolean;
}

export interface ScheduledTask {
  id: string;
  name: string;
  config: ScheduleConfig;
  task: Task;
  nextExecution?: number;
  lastExecution?: number;
  executionCount: number;
  successCount: number;
  errorCount: number;
  isRunning: boolean;
  enabled: boolean;
  timer?: NodeJS.Timeout;
}

export interface PersistenceConfig {
  path: string;
  saveInterval?: number;
  compression?: boolean;
  maxFileSize?: number;
  backupCount?: number;
}

export interface TaskResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  retries: number;
}

export interface QueueState {
  pending: Task[];
  processing: Task[];
  completed: Task[];
  failed: Task[];
  retrying: Task[];
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[]; // Error types to retry
}

export interface TimeoutConfig {
  task: number; // Timeout per task
  queue: number; // Timeout for entire queue
  warning: number; // Warning threshold
}