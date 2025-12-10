import { EventEmitter } from 'events';

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
  growthRate: number; // tasks/second
  completionRate: number; // tasks/second
  failureRate: number; // 0-1
  trend: 'growing' | 'shrinking' | 'stable';
  estimatedTimeToEmpty: number; // seconds
}

export class QueueAnalytics extends EventEmitter {
  private snapshots: QueueSnapshot[] = [];
  private readonly maxSnapshots: number = 500;

  constructor() {
    super();
  }

  /**
   * Registra un snapshot de la cola
   */
  recordSnapshot(
    size: number,
    processing: number,
    completed: number,
    failed: number,
    averageWaitTime: number,
    throughput: number
  ): void {
    const snapshot: QueueSnapshot = {
      timestamp: Date.now(),
      size,
      processing,
      completed,
      failed,
      averageWaitTime,
      throughput
    };

    this.snapshots.push(snapshot);

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.emit('snapshot', snapshot);
  }

  /**
   * Analiza tendencias de la cola
   */
  analyzeTrends(windowMinutes: number = 5): QueueTrend {
    const windowMs = windowMinutes * 60 * 1000;
    const now = Date.now();

    const recentSnapshots = this.snapshots.filter(
      s => now - s.timestamp <= windowMs
    );

    if (recentSnapshots.length < 2) {
      return {
        growthRate: 0,
        completionRate: 0,
        failureRate: 0,
        trend: 'stable',
        estimatedTimeToEmpty: 0
      };
    }

    // Calcular tasas
    const first = recentSnapshots[0];
    const last = recentSnapshots[recentSnapshots.length - 1];
    const elapsedSeconds = (last.timestamp - first.timestamp) / 1000;

    const growthRate = elapsedSeconds > 0
      ? (last.size - first.size) / elapsedSeconds
      : 0;

    const completionRate = elapsedSeconds > 0
      ? (last.completed - first.completed) / elapsedSeconds
      : 0;

    const totalTasks = last.completed + last.failed;
    const failureRate = totalTasks > 0 ? last.failed / totalTasks : 0;

    // Determinar tendencia
    let trend: 'growing' | 'shrinking' | 'stable';
    if (growthRate > 1) {
      trend = 'growing';
    } else if (growthRate < -1) {
      trend = 'shrinking';
    } else {
      trend = 'stable';
    }

    // Estimar tiempo para vaciar
    const estimatedTimeToEmpty = completionRate > 0 && last.size > 0
      ? last.size / completionRate
      : 0;

    return {
      growthRate: parseFloat(growthRate.toFixed(2)),
      completionRate: parseFloat(completionRate.toFixed(2)),
      failureRate: parseFloat(failureRate.toFixed(3)),
      trend,
      estimatedTimeToEmpty: Math.round(estimatedTimeToEmpty)
    };
  }

  /**
   * Obtiene el historial de snapshots
   */
  getHistory(limit?: number): QueueSnapshot[] {
    if (limit) {
      return this.snapshots.slice(-limit);
    }
    return [...this.snapshots];
  }

  /**
   * Limpia el historial
   */
  clearHistory(): void {
    this.snapshots = [];
    this.emit('historyCleared');
  }
}