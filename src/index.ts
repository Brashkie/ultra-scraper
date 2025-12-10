// ============================================
// CORE EXPORTS
// ============================================
export { Scraper } from './core/Scraper';
export { HttpClient } from './core/HttpClient';
export { BrowserClient } from './core/BrowserClient';
export { BrowserPool } from './core/BrowserPool';
export { BrowserInstance } from './core/BrowserInstance';
export { BrowserHealthCheck } from './core/BrowserHealthCheck';

// ============================================
// QUEUE SYSTEM
// ============================================
export { TaskQueue } from './queue/TaskQueue';
export { PriorityQueue } from './queue/PriorityQueue';
export { DeadLetterQueue } from './queue/DeadLetterQueue';
export { QueuePersistence } from './queue/QueuePersistence';
export { QueueScheduler, CronBuilder } from './queue/QueueScheduler';

// ============================================
// CONCURRENCY
// ============================================
export { ConcurrencyManager } from './concurrency/ConcurrencyManager';
export { RateLimiter } from './concurrency/RateLimiter';
export { LoadBalancer, Target } from './concurrency/LoadBalancer';
export { ThrottleManager } from './concurrency/ThrottleManager';

// ============================================
// ANTI-BOT DETECTION
// ============================================
export { AntiBotDetector } from './antibot/AntiBotDetector';
export { CloudflareDetector } from './antibot/CloudflareDetector';
export { CaptchaDetector, CaptchaInfo } from './antibot/CaptchaDetector';
export { FingerprintManager } from './antibot/FingerprintManager';
export { StealthMode } from './antibot/StealthMode';
export { BotBehaviorSimulator } from './antibot/BotBehaviorSimulator';

// ============================================
// STRATEGIES
// ============================================
export { BackoffStrategy, BackoffType } from './strategies/BackoffStrategy';
export { CircuitBreaker, CircuitState, CircuitBreakerOpenError } from './strategies/CircuitBreaker';
export { RetryStrategy } from './strategies/RetryStrategy';
export { PoolStrategy, StrategyType } from './strategies/PoolStrategy';
export { RoundRobin } from './strategies/RoundRobin';
export { LeastUsed } from './strategies/LeastUsed';

// ============================================
// MONITORING
// ============================================
export { PerformanceMonitor } from './monitoring/PerformanceMonitor';
export { PoolAnalytics } from './monitoring/PoolAnalytics';
export { PoolMetrics } from './monitoring/PoolMetrics';
export { QueueAnalytics } from './monitoring/QueueAnalytics';
export { QueueMetrics } from './monitoring/QueueMetrics';

// ============================================
// PLUGINS
// ============================================
export * from './plugins';

// ============================================
// TYPES
// ============================================
export * from './types';
export * from './types/queue.types';
export * from './types/antibot.types';
export * from './types/pool.types';
export * from './types/monitoring.types';

// Named exports for convenience - QUEUE TYPES
export {
  Task,
  TaskPriority,
  TaskStatus,
  QueueConfig,
  ScheduleConfig,
  ScheduledTask,
  PersistenceConfig,
  TaskResult,
  QueueState,
  RetryPolicy,
  TimeoutConfig
} from './types/queue.types';

// Named exports for convenience - ANTI-BOT TYPES
export {
  BlockType,
  BlockDetection,
  BypassStrategy,
  BypassResult,
  FingerprintProfile,
  AntiBotConfig
} from './types/antibot.types';

// Named exports for convenience - POOL TYPES
export {
  BrowserPoolConfig,
  BrowserInstanceConfig,
  BrowserMetrics,
  HealthCheckResult
} from './types/pool.types';

// Named exports for convenience - MONITORING TYPES
export {
  MetricsSnapshot,
  PerformanceMetrics,
  PerformanceSnapshot,
  ConcurrencyMetrics,
  RateLimitMetrics,
  LoadBalancerMetrics,
  TargetMetrics,
  AntiBotMetrics,
  SystemMetrics,
  MonitoringConfig,
  MetricType,
  Metric,
  TimeSeriesData,
  PoolUtilization,
  PoolTrend,
  PoolMetricsData,
  QueueSnapshot,
  QueueTrend,
  QueueMetricsData
} from './types/monitoring.types';

// ============================================
// UTILS
// ============================================
export { logger } from './utils/logger';
export * from './utils/helpers';

// ============================================
// FACTORY FUNCTIONS
// ============================================
import { Scraper } from './core/Scraper';
import { ScraperOptions } from './types';
import { TaskQueue } from './queue/TaskQueue';
import { BrowserPool } from './core/BrowserPool';
import { BackoffStrategy, BackoffType } from './strategies/BackoffStrategy';
import { CircuitBreaker } from './strategies/CircuitBreaker';
import { RetryStrategy } from './strategies/RetryStrategy';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { PoolAnalytics } from './monitoring/PoolAnalytics';
import { QueueAnalytics } from './monitoring/QueueAnalytics';

/**
 * Crea una nueva instancia del scraper
 * @param options Opciones de configuración
 * @returns Instancia del scraper
 */
export function createScraper(options: ScraperOptions = {}): Scraper {
  return new Scraper(options);
}

/**
 * Crea una nueva instancia de TaskQueue con configuración por defecto
 * @param concurrency Número de tareas concurrentes
 * @returns Instancia de TaskQueue
 */
export function createQueue(concurrency: number = 5): TaskQueue {
  return new TaskQueue({
    concurrency,
    maxQueueSize: 1000,
    enablePersistence: false,
    enableDeadLetter: true,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000
  });
}

/**
 * Crea una nueva instancia de BrowserPool con configuración por defecto
 * @param maxBrowsers Número máximo de navegadores
 * @returns Instancia de BrowserPool
 */
export function createBrowserPool(maxBrowsers: number = 5): BrowserPool {
  return new BrowserPool({
    minBrowsers: 1,
    maxBrowsers,
    maxPagesPerBrowser: 5,
    browserType: 'chromium',
    autoScale: true,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.2,
    launchOptions: {
      headless: true
    }
  });
}

/**
 * Crea una estrategia de backoff exponencial
 * @param initialDelay Delay inicial en ms
 * @param maxDelay Delay máximo en ms
 * @returns Instancia de BackoffStrategy
 */
export function createExponentialBackoff(
  initialDelay: number = 1000,
  maxDelay: number = 30000
): BackoffStrategy {
  return new BackoffStrategy({
    type: BackoffType.EXPONENTIAL,
    initialDelay,
    maxDelay,
    multiplier: 2,
    jitter: true,
    jitterFactor: 0.1
  });
}

/**
 * Crea un circuit breaker con configuración por defecto
 * @param failureThreshold Número de fallos para abrir el circuito
 * @param timeout Tiempo en abierto antes de probar (ms)
 * @returns Instancia de CircuitBreaker
 */
export function createCircuitBreaker(
  failureThreshold: number = 5,
  timeout: number = 60000
): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold,
    successThreshold: 2,
    timeout,
    monitoringPeriod: 60000,
    halfOpenMaxAttempts: 3
  });
}

/**
 * Crea una estrategia de retry con backoff exponencial
 * @param maxRetries Número máximo de reintentos
 * @returns Instancia de RetryStrategy
 */
export function createRetryStrategy(maxRetries: number = 3): RetryStrategy {
  return new RetryStrategy({
    maxRetries,
    backoff: {
      type: BackoffType.EXPONENTIAL,
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true
    }
  });
}

/**
 * Crea un monitor de performance
 * @param windowMs Ventana de tiempo para métricas (ms)
 * @returns Instancia de PerformanceMonitor
 */
export function createPerformanceMonitor(windowMs: number = 60000): PerformanceMonitor {
  return new PerformanceMonitor(windowMs, true);
}

/**
 * Crea un analizador de pool
 * @param sampleInterval Intervalo de muestreo (ms)
 * @returns Instancia de PoolAnalytics
 */
export function createPoolAnalytics(sampleInterval: number = 5000): PoolAnalytics {
  return new PoolAnalytics(sampleInterval);
}

/**
 * Crea un analizador de queue
 * @returns Instancia de QueueAnalytics
 */
export function createQueueAnalytics(): QueueAnalytics {
  return new QueueAnalytics();
}

// ============================================
// VERSION INFO
// ============================================
export const VERSION = '1.1.0';
export const AUTHOR = 'Hepein Oficial';
export const DESCRIPTION = 'Sistema profesional de web scraping con capacidades anti-bot, gestión de concurrencia y extracción inteligente';

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  // Factory functions
  createScraper,
  createQueue,
  createBrowserPool,
  createExponentialBackoff,
  createCircuitBreaker,
  createRetryStrategy,
  createPerformanceMonitor,
  createPoolAnalytics,
  createQueueAnalytics,
  
  // Core classes
  Scraper,
  TaskQueue,
  BrowserPool,
  
  // Strategies
  BackoffStrategy,
  CircuitBreaker,
  RetryStrategy,
  
  // Monitoring
  PerformanceMonitor,
  PoolAnalytics,
  QueueAnalytics,
  
  // Info
  VERSION,
  AUTHOR,
  DESCRIPTION
};