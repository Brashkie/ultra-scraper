import { LaunchOptions } from 'playwright';

export interface BrowserPoolConfig {
  minBrowsers: number;
  maxBrowsers: number;
  maxPagesPerBrowser: number;
  browserType: 'chromium' | 'firefox' | 'webkit';
  launchOptions?: LaunchOptions; // ✅ AGREGAR ESTA LÍNEA
  autoScale?: boolean;
  scaleUpThreshold?: number;
  scaleDownThreshold?: number;
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

export interface BrowserInstanceConfig {
  maxPages: number;
  maxIdleTime: number;
  maxLifetime: number;
  healthCheckInterval: number;
  crashRecovery?: boolean;
  launchOptions?: LaunchOptions; // Ya debería estar aquí
}

export interface BrowserMetrics {
  id: string;
  browserType: string;
  pageCount: number;
  activePages: number;
  totalRequests: number;
  failedRequests: number;
  errorRate: number;
  uptime: number;
  idleTime: number;
  isHealthy: boolean;
}

export interface PoolMetrics {
  browserCount: number;
  totalPages: number;
  activePages: number;
  queueSize: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  browsers: BrowserMetrics[];
}

export enum PoolStrategy {
  ROUND_ROBIN = 'round-robin',
  LEAST_USED = 'least-used',
  RANDOM = 'random',
  WEIGHTED = 'weighted'
}

export interface HealthCheckResult {
  isHealthy: boolean;
  timestamp: number;
  errors: string[];
  metrics: {
    memoryUsage?: number;
    cpuUsage?: number;
    pageCount: number;
    errorRate: number;
  };
}