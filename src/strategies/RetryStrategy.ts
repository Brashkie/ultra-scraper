import { BackoffStrategy, BackoffType, BackoffConfig } from './BackoffStrategy';

export interface RetryConfig {
  maxRetries: number;
  backoff: BackoffConfig;
  retryableErrors?: string[]; // Tipos de error que se pueden reintentar
  retryableStatusCodes?: number[]; // Códigos HTTP que se pueden reintentar
  onRetry?: (attempt: number, error: Error) => void | Promise<void>;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

export class RetryStrategy {
  private backoffStrategy: BackoffStrategy;

  constructor(private config: RetryConfig) {
    this.backoffStrategy = new BackoffStrategy(config.backoff);

    // Defaults
    this.config.retryableErrors = this.config.retryableErrors || [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'NetworkError',
      'TimeoutError'
    ];

    this.config.retryableStatusCodes = this.config.retryableStatusCodes || [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504  // Gateway Timeout
    ];
  }

  /**
   * Ejecuta una función con retry automático
   */
  async execute<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let totalDelay = 0;
    let attempt = 0;

    this.backoffStrategy.reset();

    while (attempt <= this.config.maxRetries) {
      attempt++;

      try {
        const result = await fn();
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDelay
        };

      } catch (error) {
        lastError = error as Error;

        // Verificar si el error es reintentable
        if (!this.isRetryableError(error as Error)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDelay
          };
        }

        // Si ya agotamos los reintentos, retornar error
        if (attempt > this.config.maxRetries) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDelay
          };
        }

        // Calcular delay y esperar
        const delay = this.backoffStrategy.next();
        totalDelay += delay;

        // Callback de retry
        if (this.config.onRetry) {
          await this.config.onRetry(attempt, lastError);
        }

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalDelay
    };
  }

  /**
   * Verifica si un error es reintentable
   */
  private isRetryableError(error: Error): boolean {
    // Verificar por código de error
    if (this.config.retryableErrors) {
      const errorCode = (error as any).code;
      if (errorCode && this.config.retryableErrors.includes(errorCode)) {
        return true;
      }

      // Verificar por nombre de error
      if (this.config.retryableErrors.includes(error.name)) {
        return true;
      }
    }

    // Verificar por código de estado HTTP
    if (this.config.retryableStatusCodes) {
      const statusCode = (error as any).response?.status || (error as any).statusCode;
      if (statusCode && this.config.retryableStatusCodes.includes(statusCode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Espera un tiempo determinado
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene la secuencia de delays que se usaría
   */
  getDelaySequence(): number[] {
    return this.backoffStrategy.calculateSequence(this.config.maxRetries);
  }
}