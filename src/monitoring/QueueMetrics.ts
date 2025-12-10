export interface QueueMetricsData {
  // Tamaños
  currentSize: number;
  maxSize: number;
  peakSize: number;

  // Estado
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;

  // Performance
  totalProcessed: number;
  successRate: number;
  failureRate: number;
  averageWaitTime: number;
  averageProcessTime: number;

  // Throughput
  throughput: number; // tasks/second
  timeWindow: number;
}

export class QueueMetrics {
  private completed: number = 0;
  private failed: number = 0;
  private cancelled: number = 0;
  private peakSize: number = 0;
  private waitTimes: number[] = [];
  private processTimes: number[] = [];
  private windowStart: number = Date.now();
  private readonly maxSamples: number = 1000;

  constructor(private maxSize: number = 1000) {}

  /**
   * Actualiza el tamaño pico
   */
  updatePeakSize(currentSize: number): void {
    if (currentSize > this.peakSize) {
      this.peakSize = currentSize;
    }
  }

  /**
   * Registra una tarea completada
   */
  recordCompleted(waitTime: number, processTime: number): void {
    this.completed++;
    this.recordWaitTime(waitTime);
    this.recordProcessTime(processTime);
  }

  /**
   * Registra una tarea fallida
   */
  recordFailed(waitTime: number, processTime?: number): void {
    this.failed++;
    this.recordWaitTime(waitTime);
    
    if (processTime !== undefined) {
      this.recordProcessTime(processTime);
    }
  }

  /**
   * Registra una tarea cancelada
   */
  recordCancelled(): void {
    this.cancelled++;
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
  getMetrics(currentSize: number, processing: number): QueueMetricsData {
    this.updatePeakSize(currentSize);

    const totalProcessed = this.completed + this.failed;
    const successRate = totalProcessed > 0 ? this.completed / totalProcessed : 0;
    const failureRate = totalProcessed > 0 ? this.failed / totalProcessed : 0;

    const averageWaitTime = this.waitTimes.length > 0
      ? this.waitTimes.reduce((sum, t) => sum + t, 0) / this.waitTimes.length
      : 0;

    const averageProcessTime = this.processTimes.length > 0
      ? this.processTimes.reduce((sum, t) => sum + t, 0) / this.processTimes.length
      : 0;

    const elapsedSeconds = (Date.now() - this.windowStart) / 1000;
    const throughput = elapsedSeconds > 0 ? totalProcessed / elapsedSeconds : 0;

    return {
      currentSize,
      maxSize: this.maxSize,
      peakSize: this.peakSize,
      processing,
      completed: this.completed,
      failed: this.failed,
      cancelled: this.cancelled,
      totalProcessed,
      successRate: parseFloat(successRate.toFixed(3)),
      failureRate: parseFloat(failureRate.toFixed(3)),
      averageWaitTime: Math.round(averageWaitTime),
      averageProcessTime: Math.round(averageProcessTime),
      throughput: parseFloat(throughput.toFixed(2)),
      timeWindow: Date.now() - this.windowStart
    };
  }

  /**
   * Resetea las métricas
   */
  reset(): void {
    this.completed = 0;
    this.failed = 0;
    this.cancelled = 0;
    this.peakSize = 0;
    this.waitTimes = [];
    this.processTimes = [];
    this.windowStart = Date.now();
  }
}