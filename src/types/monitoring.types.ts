export interface MetricsSnapshot {
  timestamp: number;
  component: string;
  metrics: Record<string, any>;
}

export interface PerformanceMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
}

export interface QueueMetrics {
  totalAdded: number;
  totalProcessed: number;
  totalFailed: number;
  totalRetried: number;
  queueSize: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  averageProcessTime: number;
  peakConcurrency: number;
}

export interface ConcurrencyMetrics {
  totalExecuted: number;
  totalSuccess: number;
  totalErrors: number;
  totalTimeout: number;
  avgExecutionTime: number;
  peakConcurrency: number;
  currentConcurrency: number;
  activeCount: number;
  queueSize: number;
  successRate: number;
  errorRate: number;
}

export interface RateLimitMetrics {
  key: string;
  strategy: string;
  currentRate: number;
  requestsLastSecond?: number;
  requestsLastMinute?: number;
  requestsLastHour?: number;
  window?: {
    count: number;
    limit: number;
    remaining: number;
    resetAt: number;
  };
  tokenBucket?: {
    tokens: number;
    capacity: number;
    refillRate: number;
  };
  leakyBucket?: {
    queueSize: number;
    capacity: number;
    leakRate: number;
  };
}

export interface LoadBalancerMetrics {
  strategy: string;
  totalTargets: number;
  activeTargets: number;
  totalRequests: number;
  totalSuccessful: number;
  totalFailed: number;
  successRate: number;
  errorRate: number;
  targets: TargetMetrics[];
}

export interface TargetMetrics {
  targetId: string;
  url: string;
  activeConnections: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
  isHealthy: boolean;
  lastHealthCheck?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface AntiBotMetrics {
  totalDetections: number;
  detectionsByType: Record<string, number>;
  blockedRequests: number;
  bypassAttempts: number;
  successfulBypasses: number;
  failedBypasses: number;
  averageBypassTime: number;
  fingerprintRotations: number;
  captchasSolved: number;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: {
    percentage: number;
    loadAverage: number[];
  };
  activeProcesses: number;
}

export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    errorRate?: number;
    responseTime?: number;
    queueSize?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  actions: {
    log?: boolean;
    email?: boolean;
    webhook?: string;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  alerts?: AlertConfig;
  export?: {
    enabled: boolean;
    format: 'json' | 'csv' | 'prometheus';
    destination: string;
    interval: number;
  };
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
  unit?: string;
  description?: string;
}

export interface TimeSeriesData {
  metric: string;
  dataPoints: Array<{
    timestamp: number;
    value: number;
  }>;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'counter' | 'gauge' | 'table' | 'log';
  title: string;
  metric: string;
  config: Record<string, any>;
}

// ============================================
// TIPOS DESDE MONITORING CLASSES
// ============================================

// De PerformanceMonitor.ts
export interface PerformanceSnapshot {
  timestamp: number;
  metrics: PerformanceMetrics;
  windowMs: number;
}

// De PoolAnalytics.ts
export interface PoolUtilization {
  timestamp: number;
  utilizationRate: number;
  activeResources: number;
  totalResources: number;
  queueSize: number;
  waitingRequests: number;
}

export interface PoolTrend {
  averageUtilization: number;
  peakUtilization: number;
  minUtilization: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  recommendation: string;
}

// De PoolMetrics.ts
export interface PoolMetricsData {
  totalCapacity: number;
  activeResources: number;
  idleResources: number;
  utilizationRate: number;
  queueSize: number;
  maxQueueSize: number;
  queueUtilization: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  errorRate: number;
  averageWaitTime: number;
  averageProcessTime: number;
  maxWaitTime: number;
  minWaitTime: number;
  requestsPerSecond: number;
  timeWindow: number;
}

// De QueueAnalytics.ts
export interface QueueSnapshot {
  timestamp: number;
  size: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
  throughput: number;
}

export interface QueueTrend {
  growthRate: number;
  completionRate: number;
  failureRate: number;
  trend: 'growing' | 'shrinking' | 'stable';
  estimatedTimeToEmpty: number;
}

// De QueueMetrics.ts
export interface QueueMetricsData {
  currentSize: number;
  maxSize: number;
  peakSize: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalProcessed: number;
  successRate: number;
  failureRate: number;
  averageWaitTime: number;
  averageProcessTime: number;
  throughput: number;
  timeWindow: number;
}