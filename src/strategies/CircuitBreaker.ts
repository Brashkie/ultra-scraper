import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject all requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Número de fallos para abrir circuito
  successThreshold: number;      // Número de éxitos para cerrar circuito
  timeout: number;               // Tiempo en OPEN antes de intentar HALF_OPEN (ms)
  monitoringPeriod?: number;     // Ventana de tiempo para contar fallos (ms)
  halfOpenMaxAttempts?: number;  // Intentos permitidos en HALF_OPEN
  resetTimeout?: number;         // Tiempo para resetear contadores en CLOSED
}

interface CircuitMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  stateChanges: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private metrics: CircuitMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    stateChanges: 0
  };

  private openTimer?: NodeJS.Timeout;
  private resetTimer?: NodeJS.Timeout;
  private halfOpenAttempts: number = 0;

  constructor(private config: CircuitBreakerConfig) {
    super();
    
    // Defaults
    this.config.monitoringPeriod = this.config.monitoringPeriod || 60000;
    this.config.halfOpenMaxAttempts = this.config.halfOpenMaxAttempts || 3;
    this.config.resetTimeout = this.config.resetTimeout || 60000;
  }

  /**
   * Ejecuta una función con circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Verificar estado del circuito
    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts!) {
        throw new CircuitBreakerOpenError('Circuit breaker HALF_OPEN limit reached');
      }
      this.halfOpenAttempts++;
    }

    this.metrics.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Maneja un intento exitoso
   */
  private onSuccess(): void {
    this.metrics.successfulRequests++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Si tenemos suficientes éxitos en HALF_OPEN, cerrar circuito
      if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
        this.close();
      }
    }

    this.emit('success', {
      state: this.state,
      consecutiveSuccesses: this.metrics.consecutiveSuccesses
    });
  }

  /**
   * Maneja un intento fallido
   */
  private onFailure(): void {
    this.metrics.failedRequests++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Cualquier fallo en HALF_OPEN vuelve a abrir el circuito
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      // Si superamos el umbral de fallos, abrir circuito
      if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
        this.open();
      }
    }

    this.emit('failure', {
      state: this.state,
      consecutiveFailures: this.metrics.consecutiveFailures
    });
  }

  /**
   * Abre el circuito (bloquea todas las peticiones)
   */
  private open(): void {
    if (this.state === CircuitState.OPEN) return;

    this.state = CircuitState.OPEN;
    this.metrics.stateChanges++;
    this.halfOpenAttempts = 0;

    this.emit('stateChange', {
      from: CircuitState.CLOSED,
      to: CircuitState.OPEN,
      reason: `${this.metrics.consecutiveFailures} consecutive failures`
    });

    // Programar transición a HALF_OPEN
    this.openTimer = setTimeout(() => {
      this.halfOpen();
    }, this.config.timeout);
  }

  /**
   * Pone el circuito en HALF_OPEN (prueba si el servicio se recuperó)
   */
  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.metrics.stateChanges++;
    this.halfOpenAttempts = 0;
    this.metrics.consecutiveSuccesses = 0;

    this.emit('stateChange', {
      from: CircuitState.OPEN,
      to: CircuitState.HALF_OPEN,
      reason: 'Timeout reached, testing service'
    });
  }

  /**
   * Cierra el circuito (operación normal)
   */
  private close(): void {
    if (this.state === CircuitState.CLOSED) return;

    this.state = CircuitState.CLOSED;
    this.metrics.stateChanges++;
    this.metrics.consecutiveFailures = 0;
    this.halfOpenAttempts = 0;

    this.emit('stateChange', {
      from: CircuitState.HALF_OPEN,
      to: CircuitState.CLOSED,
      reason: `${this.metrics.consecutiveSuccesses} consecutive successes`
    });

    // Programar reset de métricas
    this.scheduleReset();
  }

  /**
   * Programa el reset de métricas
   */
  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.CLOSED) {
        this.metrics.consecutiveFailures = 0;
        this.metrics.consecutiveSuccesses = 0;
        this.emit('metricsReset');
      }
    }, this.config.resetTimeout);
  }

  /**
   * Fuerza el estado del circuito (para testing)
   */
  forceState(state: CircuitState): void {
    this.state = state;
    this.metrics.stateChanges++;
    this.emit('stateChange', {
      from: this.state,
      to: state,
      reason: 'Forced state change'
    });
  }

  /**
   * Obtiene el estado actual
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Obtiene las métricas
   */
  getMetrics(): CircuitMetrics & { state: CircuitState } {
    const errorRate = this.metrics.totalRequests > 0
      ? this.metrics.failedRequests / this.metrics.totalRequests
      : 0;

    const successRate = this.metrics.totalRequests > 0
      ? this.metrics.successfulRequests / this.metrics.totalRequests
      : 0;

    return {
      ...this.metrics,
      state: this.state,
      errorRate,
      successRate
    } as any;
  }

  /**
   * Verifica si el circuito está abierto
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Resetea todas las métricas
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      stateChanges: 0
    };

    if (this.openTimer) clearTimeout(this.openTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);

    this.state = CircuitState.CLOSED;
    this.halfOpenAttempts = 0;

    this.emit('reset');
  }

  /**
   * Limpieza
   */
  destroy(): void {
    if (this.openTimer) clearTimeout(this.openTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.removeAllListeners();
  }
}

/**
 * Error cuando el circuit breaker está abierto
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}