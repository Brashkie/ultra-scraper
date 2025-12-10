import { Browser, Page } from 'playwright';
import { EventEmitter } from 'events';

export interface HealthCheckConfig {
  interval: number;           // Intervalo entre checks (ms)
  timeout: number;            // Timeout para cada check (ms)
  unhealthyThreshold: number; // Fallos consecutivos para marcar como unhealthy
  healthyThreshold: number;   // Éxitos consecutivos para marcar como healthy
  checkMemory?: boolean;      // Verificar uso de memoria
  checkCPU?: boolean;         // Verificar uso de CPU
  maxMemoryMB?: number;       // Máximo de memoria permitido
}

export interface HealthCheckResult {
  isHealthy: boolean;
  timestamp: number;
  checks: {
    browserConnected: boolean;
    pagesResponsive: boolean;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  errors: string[];
}

export class BrowserHealthCheck extends EventEmitter {
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private isHealthy: boolean = true;
  private checkTimer: NodeJS.Timeout | null = null;
  private lastCheckResult: HealthCheckResult | null = null;

  constructor(
    private browser: Browser,
    private pages: Set<Page>,
    private config: HealthCheckConfig
  ) {
    super();
  }

  /**
   * Inicia el health check automático
   */
  start(): void {
    if (this.checkTimer) {
      return; // Ya está corriendo
    }

    this.checkTimer = setInterval(async () => {
      await this.performCheck();
    }, this.config.interval);

    this.emit('started');
  }

  /**
   * Detiene el health check automático
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      this.emit('stopped');
    }
  }

  /**
   * Ejecuta un health check manual
   */
  async performCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      isHealthy: true,
      timestamp: startTime,
      checks: {
        browserConnected: false,
        pagesResponsive: false
      },
      errors: []
    };

    try {
      // 1. Verificar conexión del navegador
      result.checks.browserConnected = await this.checkBrowserConnection();
      if (!result.checks.browserConnected) {
        result.errors.push('Browser is not connected');
        result.isHealthy = false;
      }

      // 2. Verificar páginas responsivas
      if (result.checks.browserConnected) {
        result.checks.pagesResponsive = await this.checkPagesResponsive();
        if (!result.checks.pagesResponsive) {
          result.errors.push('Pages are not responsive');
          result.isHealthy = false;
        }
      }

      // 3. Verificar memoria (opcional)
      if (this.config.checkMemory && result.checks.browserConnected) {
        const memoryCheck = await this.checkMemoryUsage();
        result.checks.memoryUsage = memoryCheck.usage;
        
        if (!memoryCheck.isHealthy) {
          result.errors.push(`Memory usage too high: ${memoryCheck.usage}MB`);
          result.isHealthy = false;
        }
      }

      // 4. Actualizar contadores
      if (result.isHealthy) {
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;

        // Marcar como healthy si alcanzamos el umbral
        if (this.consecutiveSuccesses >= this.config.healthyThreshold) {
          if (!this.isHealthy) {
            this.isHealthy = true;
            this.emit('healthy', result);
          }
        }
      } else {
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;

        // Marcar como unhealthy si alcanzamos el umbral
        if (this.consecutiveFailures >= this.config.unhealthyThreshold) {
          if (this.isHealthy) {
            this.isHealthy = false;
            this.emit('unhealthy', result);
          }
        }
      }

      this.lastCheckResult = result;
      this.emit('checkCompleted', result);

      return result;

    } catch (error) {
      result.isHealthy = false;
      result.errors.push(`Check failed: ${(error as Error).message}`);
      
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;

      if (this.consecutiveFailures >= this.config.unhealthyThreshold) {
        this.isHealthy = false;
        this.emit('unhealthy', result);
      }

      this.lastCheckResult = result;
      this.emit('checkFailed', { result, error });

      return result;
    }
  }

  /**
   * Verifica si el navegador está conectado
   */
  private async checkBrowserConnection(): Promise<boolean> {
    try {
      if (!this.browser) {
        return false;
      }

      // Verificar si el navegador está conectado
      return this.browser.isConnected();
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica si las páginas responden
   */
  private async checkPagesResponsive(): Promise<boolean> {
    try {
      if (this.pages.size === 0) {
        return true; // No hay páginas, considerarlo OK
      }

      // Verificar cada página con timeout
      const checks = Array.from(this.pages).map(async (page) => {
        try {
          // Ejecutar JavaScript simple para verificar responsividad
          await Promise.race([
            page.evaluate(() => 1 + 1),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
            )
          ]);
          return true;
        } catch {
          return false;
        }
      });

      const results = await Promise.all(checks);
      
      // Todas las páginas deben responder
      return results.every(r => r === true);

    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica el uso de memoria
   */
  private async checkMemoryUsage(): Promise<{ isHealthy: boolean; usage: number }> {
    try {
      // En un entorno real, usarías métricas del navegador
      // Por ahora, simulamos verificando el proceso de Node.js
      const usage = process.memoryUsage();
      const usageMB = Math.round(usage.heapUsed / 1024 / 1024);

      const maxMemory = this.config.maxMemoryMB || 500; // Default 500MB
      const isHealthy = usageMB < maxMemory;

      return { isHealthy, usage: usageMB };

    } catch (error) {
      return { isHealthy: true, usage: 0 };
    }
  }

  /**
   * Obtiene el estado actual de salud
   */
  getHealthStatus(): {
    isHealthy: boolean;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastCheckResult: HealthCheckResult | null;
  } {
    return {
      isHealthy: this.isHealthy,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastCheckResult: this.lastCheckResult
    };
  }

  /**
   * Resetea los contadores
   */
  reset(): void {
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.isHealthy = true;
    this.lastCheckResult = null;
    this.emit('reset');
  }

  /**
   * Destruye el health checker
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}