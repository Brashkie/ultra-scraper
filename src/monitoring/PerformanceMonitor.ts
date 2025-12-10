import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number; // requests per second
  errorRate: number;
  successRate: number;
  p50ResponseTime: number; // Percentile 50
  p95ResponseTime: number; // Percentile 95
  p99ResponseTime: number; // Percentile 99
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: PerformanceMetrics;
  windowMs: number;
}

export class PerformanceMonitor extends EventEmitter {
  private responseTimes: number[] = [];
  private requestCount: number = 0;
  private successCount: number = 0;
  private errorCount: number = 0;
  private minResponseTime: number = Infinity;
  private maxResponseTime: number = 0;
  private windowStart: number = Date.now();
  private readonly maxSamples: number = 10000;

  constructor(
    private windowMs: number = 60000, // 1 minuto por defecto
    private autoReset: boolean = true
  ) {
    super();

    if (autoReset) {
      setInterval(() => {
        this.reset();
      }, windowMs);
    }
  }

  /**
   * Registra una request exitosa
   */
  recordSuccess(responseTime: number): void {
    this.requestCount++;
    this.successCount++;
    this.recordResponseTime(responseTime);

    this.emit('success', { responseTime, metrics: this.getMetrics() });
  }

  /**
   * Registra una request fallida
   */
  recordError(responseTime?: number): void {
    this.requestCount++;
    this.errorCount++;

    if (responseTime !== undefined) {
      this.recordResponseTime(responseTime);
    }

    this.emit('error', { responseTime, metrics: this.getMetrics() });
  }

  /**
   * Registra un tiempo de respuesta
   */
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);

    // Limitar el número de muestras
    if (this.responseTimes.length > this.maxSamples) {
      this.responseTimes.shift();
    }

    // Actualizar min/max
    if (time < this.minResponseTime) {
      this.minResponseTime = time;
    }
    if (time > this.maxResponseTime) {
      this.maxResponseTime = time;
    }
  }

  /**
   * Calcula el percentil
   */
  private calculatePercentile(percentile: number): number {
    if (this.responseTimes.length === 0) return 0;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Obtiene las métricas actuales
   */
  getMetrics(): PerformanceMetrics {
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    const elapsedSeconds = (Date.now() - this.windowStart) / 1000;
    const throughput = elapsedSeconds > 0 ? this.requestCount / elapsedSeconds : 0;

    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    const successRate = this.requestCount > 0 ? this.successCount / this.requestCount : 0;

    return {
      requestCount: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      averageResponseTime: Math.round(averageResponseTime),
      minResponseTime: this.minResponseTime === Infinity ? 0 : this.minResponseTime,
      maxResponseTime: this.maxResponseTime,
      throughput: parseFloat(throughput.toFixed(2)),
      errorRate: parseFloat(errorRate.toFixed(4)),
      successRate: parseFloat(successRate.toFixed(4)),
      p50ResponseTime: this.calculatePercentile(50),
      p95ResponseTime: this.calculatePercentile(95),
      p99ResponseTime: this.calculatePercentile(99)
    };
  }

  /**
   * Obtiene un snapshot de las métricas
   */
  getSnapshot(): PerformanceSnapshot {
    return {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      windowMs: this.windowMs
    };
  }

  /**
   * Resetea las métricas
   */
  reset(): void {
    const snapshot = this.getSnapshot();

    this.responseTimes = [];
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.minResponseTime = Infinity;
    this.maxResponseTime = 0;
    this.windowStart = Date.now();

    this.emit('reset', snapshot);
  }

  /**
   * Obtiene estadísticas detalladas
   */
  getDetailedStats(): {
    metrics: PerformanceMetrics;
    samples: number;
    windowAge: number;
    windowMs: number;
  } {
    return {
      metrics: this.getMetrics(),
      samples: this.responseTimes.length,
      windowAge: Date.now() - this.windowStart,
      windowMs: this.windowMs
    };
  }
}