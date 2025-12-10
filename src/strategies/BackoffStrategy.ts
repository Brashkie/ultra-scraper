export enum BackoffType {
  EXPONENTIAL = 'exponential',
  LINEAR = 'linear',
  CONSTANT = 'constant',
  FIBONACCI = 'fibonacci',
  DECORRELATED_JITTER = 'decorrelated_jitter'
}

export interface BackoffConfig {
  type: BackoffType;
  initialDelay: number;
  maxDelay: number;
  multiplier?: number; // Para exponencial (default: 2)
  increment?: number; // Para linear (default: 1000ms)
  jitter?: boolean; // Añadir randomness
  jitterFactor?: number; // 0-1, cuánto jitter añadir (default: 0.1)
}

export class BackoffStrategy {
  private attempt: number = 0;
  private fibSequence: number[] = [0, 1];

  constructor(private config: BackoffConfig) {
    // Defaults
    this.config.multiplier = this.config.multiplier || 2;
    this.config.increment = this.config.increment || 1000;
    this.config.jitterFactor = this.config.jitterFactor || 0.1;
  }

  /**
   * Calcula el delay para el siguiente intento
   */
  next(): number {
    this.attempt++;
    let delay: number;

    switch (this.config.type) {
      case BackoffType.EXPONENTIAL:
        delay = this.exponentialBackoff();
        break;

      case BackoffType.LINEAR:
        delay = this.linearBackoff();
        break;

      case BackoffType.CONSTANT:
        delay = this.config.initialDelay;
        break;

      case BackoffType.FIBONACCI:
        delay = this.fibonacciBackoff();
        break;

      case BackoffType.DECORRELATED_JITTER:
        delay = this.decorrelatedJitterBackoff();
        break;

      default:
        delay = this.exponentialBackoff();
    }

    // Aplicar jitter si está habilitado
    if (this.config.jitter) {
      delay = this.applyJitter(delay);
    }

    // Aplicar límite máximo
    delay = Math.min(delay, this.config.maxDelay);

    return delay;
  }

  /**
   * Backoff exponencial: delay * (multiplier ^ attempt)
   */
  private exponentialBackoff(): number {
    const multiplier = this.config.multiplier!;
    return this.config.initialDelay * Math.pow(multiplier, this.attempt - 1);
  }

  /**
   * Backoff linear: delay + (increment * attempt)
   */
  private linearBackoff(): number {
    const increment = this.config.increment!;
    return this.config.initialDelay + (increment * (this.attempt - 1));
  }

  /**
   * Backoff Fibonacci: sigue la secuencia de Fibonacci
   */
  private fibonacciBackoff(): number {
    while (this.fibSequence.length <= this.attempt) {
      const len = this.fibSequence.length;
      this.fibSequence.push(
        this.fibSequence[len - 1] + this.fibSequence[len - 2]
      );
    }

    return this.config.initialDelay * this.fibSequence[this.attempt];
  }

  /**
   * Decorrelated Jitter: reduce correlación entre intentos
   * Formula: random_between(initialDelay, previousDelay * 3)
   */
  private decorrelatedJitterBackoff(): number {
    const previousDelay = this.attempt === 1 
      ? this.config.initialDelay 
      : this.config.initialDelay * Math.pow(2, this.attempt - 2);

    const min = this.config.initialDelay;
    const max = previousDelay * 3;

    return Math.random() * (max - min) + min;
  }

  /**
   * Añade jitter (randomness) al delay
   */
  private applyJitter(delay: number): number {
    const jitterFactor = this.config.jitterFactor!;
    const jitter = delay * jitterFactor;
    const randomJitter = (Math.random() * 2 - 1) * jitter; // -jitter a +jitter
    
    return delay + randomJitter;
  }

  /**
   * Resetea el contador de intentos
   */
  reset(): void {
    this.attempt = 0;
  }

  /**
   * Obtiene el intento actual
   */
  getCurrentAttempt(): number {
    return this.attempt;
  }

  /**
   * Calcula todos los delays hasta maxAttempts
   */
  calculateSequence(maxAttempts: number): number[] {
    const sequence: number[] = [];
    this.reset();

    for (let i = 0; i < maxAttempts; i++) {
      sequence.push(this.next());
    }

    this.reset();
    return sequence;
  }
}