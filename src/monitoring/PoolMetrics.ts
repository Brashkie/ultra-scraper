export interface PoolMetricsData {
  // Capacidad
  totalCapacity: number;
  activeResources: number;
  idleResources: number;
  utilizationRate: number;

  // Queue
  queueSize: number;
  maxQueueSize: number;
  queueUtilization: number;

  // Performance
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  errorRate: number;

  // Timing
  averageWaitTime: number;
  averageProcessTime: number;
  maxWaitTime: number;
  minWaitTime: number;

  // Tendencias
  requestsPerSecond: number;
  timeWindow: number;
}

export class PoolMetrics {
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private waitTimes: number[] = [];
  private processTimes: number[] = [];
  private windowStart: number = Date.now();
  private readonly maxSamples: number = 1000;

  constructor(
    private totalCapacity: number,
    private maxQueueSize: number = 1000
  ) {}

  /**
   * Registra una request exitosa
   */
  recordSuccess(waitTime: number, processTime: number): void {
    this.totalRequests++;
    this.successfulRequests++;
    this.recordWaitTime(waitTime);
    this.recordProcessTime(processTime);
  }

  /**
   * Registra una request fallida
   */
  recordFailure(waitTime: number, processTime?: number): void {
    this.totalRequests++;
    this.failedRequests++;
    this.recordWaitTime(waitTime);
    
    if (processTime !== undefined) {
      this.recordProcessTime(processTime);
    }
  }

  /**
   * Registra tiempo de espera
   */
  private recordWaitTime(time: number): void {
    this.waitTimes.push(time);
    if (this.waitTimes.length > this.maxSamples) {
      this.waitTimes.shift();
    }
  }

  /**
   * Registra tiempo de procesamiento
   */
  private recordProcessTime(time: number): void {
    this.processTimes.push(time);
    if (this.processTimes.length > this.maxSamples) {
      this.processTimes.shift();
    }
  }

  /**
   * Obtiene las métricas actuales
   */
  getMetrics(
    activeResources: number,
    queueSize: number
  ): PoolMetricsData {
    const idleResources = this.totalCapacity - activeResources;
    const utilizationRate = this.totalCapacity > 0 
      ? activeResources / this.totalCapacity 
      : 0;

    const queueUtilization = this.maxQueueSize > 0
      ? queueSize / this.maxQueueSize
      : 0;

    const successRate = this.totalRequests > 0
      ? this.successfulRequests / this.totalRequests
      : 0;

    const errorRate = this.totalRequests > 0
      ? this.failedRequests / this.totalRequests
      : 0;

    const averageWaitTime = this.waitTimes.length > 0
      ? this.waitTimes.reduce((sum, t) => sum + t, 0) / this.waitTimes.length
      : 0;

    const averageProcessTime = this.processTimes.length > 0
      ? this.processTimes.reduce((sum, t) => sum + t, 0) / this.processTimes.length
      : 0;

    const maxWaitTime = this.waitTimes.length > 0
      ? Math.max(...this.waitTimes)
      : 0;

    const minWaitTime = this.waitTimes.length > 0
      ? Math.min(...this.waitTimes)
      : 0;

    const elapsedSeconds = (Date.now() - this.windowStart) / 1000;
    const requestsPerSecond = elapsedSeconds > 0
      ? this.totalRequests / elapsedSeconds
      : 0;

    return {
      totalCapacity: this.totalCapacity,
      activeResources,
      idleResources,
      utilizationRate: parseFloat(utilizationRate.toFixed(3)),
      queueSize,
      maxQueueSize: this.maxQueueSize,
      queueUtilization: parseFloat(queueUtilization.toFixed(3)),
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      successRate: parseFloat(successRate.toFixed(3)),
      errorRate: parseFloat(errorRate.toFixed(3)),
      averageWaitTime: Math.round(averageWaitTime),
      averageProcessTime: Math.round(averageProcessTime),
      maxWaitTime,
      minWaitTime,
      requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
      timeWindow: Date.now() - this.windowStart
    };
  }

  /**
   * Resetea las métricas
   */
  reset(): void {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.waitTimes = [];
    this.processTimes = [];
    this.windowStart = Date.now();
  }

  /**
   * Actualiza la capacidad total
   */
  updateCapacity(newCapacity: number): void {
    this.totalCapacity = newCapacity;
  }
}