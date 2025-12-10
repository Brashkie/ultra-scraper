import { EventEmitter } from 'events';

export interface PoolUtilization {
  timestamp: number;
  utilizationRate: number; // 0-1
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

export class PoolAnalytics extends EventEmitter {
  private utilizationHistory: PoolUtilization[] = [];
  private readonly maxHistorySize: number = 1000;

  constructor(
    private sampleInterval: number = 5000 // Sample cada 5 segundos
  ) {
    super();
  }

  /**
   * Registra una muestra de utilización
   */
  recordUtilization(
    activeResources: number,
    totalResources: number,
    queueSize: number = 0,
    waitingRequests: number = 0
  ): void {
    const utilizationRate = totalResources > 0 ? activeResources / totalResources : 0;

    const sample: PoolUtilization = {
      timestamp: Date.now(),
      utilizationRate,
      activeResources,
      totalResources,
      queueSize,
      waitingRequests
    };

    this.utilizationHistory.push(sample);

    // Limitar tamaño del historial
    if (this.utilizationHistory.length > this.maxHistorySize) {
      this.utilizationHistory.shift();
    }

    this.emit('sample', sample);

    // Alertas
    if (utilizationRate > 0.9) {
      this.emit('highUtilization', sample);
    } else if (utilizationRate < 0.2) {
      this.emit('lowUtilization', sample);
    }
  }

  /**
   * Analiza tendencias del pool
   */
  analyzeTrends(windowMinutes: number = 5): PoolTrend {
    const windowMs = windowMinutes * 60 * 1000;
    const now = Date.now();

    // Filtrar muestras recientes
    const recentSamples = this.utilizationHistory.filter(
      s => now - s.timestamp <= windowMs
    );

    if (recentSamples.length === 0) {
      return {
        averageUtilization: 0,
        peakUtilization: 0,
        minUtilization: 0,
        trend: 'stable',
        recommendation: 'No data available'
      };
    }

    // Calcular estadísticas
    const utilizations = recentSamples.map(s => s.utilizationRate);
    const averageUtilization = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
    const peakUtilization = Math.max(...utilizations);
    const minUtilization = Math.min(...utilizations);

    // Detectar tendencia
    const trend = this.detectTrend(recentSamples);

    // Generar recomendación
    const recommendation = this.generateRecommendation(
      averageUtilization,
      peakUtilization,
      trend
    );

    return {
      averageUtilization: parseFloat(averageUtilization.toFixed(3)),
      peakUtilization: parseFloat(peakUtilization.toFixed(3)),
      minUtilization: parseFloat(minUtilization.toFixed(3)),
      trend,
      recommendation
    };
  }

  /**
   * Detecta la tendencia de utilización
   */
  private detectTrend(samples: PoolUtilization[]): 'increasing' | 'decreasing' | 'stable' {
    if (samples.length < 2) return 'stable';

    // Dividir en dos mitades
    const midpoint = Math.floor(samples.length / 2);
    const firstHalf = samples.slice(0, midpoint);
    const secondHalf = samples.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.utilizationRate, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.utilizationRate, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    if (difference > 0.1) return 'increasing';
    if (difference < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Genera recomendación basada en métricas
   */
  private generateRecommendation(
    avgUtilization: number,
    peakUtilization: number,
    trend: string
  ): string {
    if (peakUtilization > 0.95 || (avgUtilization > 0.8 && trend === 'increasing')) {
      return 'Consider scaling up: High utilization detected';
    }

    if (avgUtilization < 0.3 && trend === 'decreasing') {
      return 'Consider scaling down: Low utilization detected';
    }

    if (avgUtilization > 0.7 && avgUtilization < 0.85) {
      return 'Optimal utilization range';
    }

    if (trend === 'increasing' && avgUtilization > 0.6) {
      return 'Monitor closely: Utilization is increasing';
    }

    return 'Current capacity is appropriate';
  }

  /**
   * Obtiene el historial de utilización
   */
  getHistory(limit?: number): PoolUtilization[] {
    if (limit) {
      return this.utilizationHistory.slice(-limit);
    }
    return [...this.utilizationHistory];
  }

  /**
   * Limpia el historial
   */
  clearHistory(): void {
    this.utilizationHistory = [];
    this.emit('historyCleared');
  }

  /**
   * Obtiene estadísticas del historial
   */
  getHistoryStats(): {
    samples: number;
    oldestSample: number;
    newestSample: number;
    timespan: number;
  } {
    if (this.utilizationHistory.length === 0) {
      return {
        samples: 0,
        oldestSample: 0,
        newestSample: 0,
        timespan: 0
      };
    }

    const oldest = this.utilizationHistory[0].timestamp;
    const newest = this.utilizationHistory[this.utilizationHistory.length - 1].timestamp;

    return {
      samples: this.utilizationHistory.length,
      oldestSample: oldest,
      newestSample: newest,
      timespan: newest - oldest
    };
  }
}