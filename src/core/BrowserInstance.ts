import { Browser, Page, LaunchOptions } from 'playwright';
import { EventEmitter } from 'events';

export interface BrowserInstanceConfig {
  maxPages: number;
  maxIdleTime: number;
  maxLifetime: number;
  healthCheckInterval: number;
  crashRecovery?: boolean;
  launchOptions?: LaunchOptions;
}

export class BrowserInstance extends EventEmitter {
  private browser: Browser | null = null;
  private pages: Set<Page> = new Set();
  private createdAt: number = Date.now();
  private lastUsed: number = Date.now();
  private totalRequests: number = 0;
  private failedRequests: number = 0;
  private _isHealthy: boolean = true; // ✅ Renombrado con _ para evitar conflicto
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    private id: string,
    private browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium',
    private config: BrowserInstanceConfig
  ) {
    super();
    this.startHealthCheck();
  }

  async initialize(): Promise<void> {
    const { chromium, firefox, webkit } = await import('playwright');
    const browserTypes = { chromium, firefox, webkit };
    
    // Merge default options with user options
    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-blink-features=AutomationControlled'
      ],
      ...this.config.launchOptions
    };

    this.browser = await browserTypes[this.browserType].launch(launchOptions);

    this.emit('initialized', this.id);
  }

  async acquirePage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    if (this.pages.size >= this.config.maxPages) {
      throw new Error('Max pages limit reached');
    }

    const page = await this.browser.newPage();
    
    // Anti-detection
    await page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Chrome runtime
      (window as any).chrome = {
        runtime: {}
      };

      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => 
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);
    });

    this.pages.add(page);
    this.lastUsed = Date.now();
    this.totalRequests++;
    
    this.emit('pageAcquired', { browserId: this.id, pageCount: this.pages.size });
    
    return page;
  }

  async releasePage(page: Page): Promise<void> {
    try {
      await page.close();
    } catch (error) {
      // Page might already be closed
    }
    
    this.pages.delete(page);
    this.emit('pageReleased', { browserId: this.id, pageCount: this.pages.size });
  }

  async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Close all pages
    for (const page of this.pages) {
      try {
        await page.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    this.pages.clear();
    
    // Close browser
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.browser = null;
    }

    this.emit('closed', this.id);
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.checkHealth();
    }, this.config.healthCheckInterval);
  }

  private async checkHealth(): Promise<void> {
    try {
      // Check if browser is still alive
      if (!this.browser || !this.browser.isConnected()) {
        this._isHealthy = false;
        this.emit('unhealthy', { browserId: this.id, reason: 'disconnected' });
        return;
      }

      // Check idle time
      const idleTime = Date.now() - this.lastUsed;
      if (idleTime > this.config.maxIdleTime) {
        this.emit('idle', { browserId: this.id, idleTime });
      }

      // Check lifetime
      const lifetime = Date.now() - this.createdAt;
      if (lifetime > this.config.maxLifetime) {
        this.emit('expired', { browserId: this.id, lifetime });
      }

      // Check error rate
      const errorRate = this.totalRequests > 0 
        ? this.failedRequests / this.totalRequests 
        : 0;
      
      if (errorRate > 0.5) { // 50% error rate
        this._isHealthy = false;
        this.emit('unhealthy', { browserId: this.id, reason: 'high_error_rate', errorRate });
      }

    } catch (error) {
      this._isHealthy = false;
      this.emit('unhealthy', { browserId: this.id, reason: 'check_failed', error });
    }
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Obtiene el ID del browser
   */
  getId(): string {
    return this.id;
  }

  /**
   * Obtiene el número de páginas activas
   */
  getPageCount(): number {
    return this.pages.size;
  }

  /**
   * Verifica si el browser está healthy
   */
  isHealthy(): boolean {
    return this._isHealthy;
  }

  /**
   * Verifica si puede adquirir más páginas
   */
  canAcquirePage(): boolean {
    return this.pages.size < this.config.maxPages && this._isHealthy;
  }

  /**
   * Obtiene las métricas del browser
   */
  getMetrics() {
    return {
      id: this.id,
      pageCount: this.pages.size,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
      errorRate: this.totalRequests > 0 ? this.failedRequests / this.totalRequests : 0,
      uptime: Date.now() - this.createdAt,
      idleTime: Date.now() - this.lastUsed,
      isHealthy: this._isHealthy
    };
  }

  /**
   * Marca una request como fallida
   */
  markRequestFailed(): void {
    this.failedRequests++;
    this.totalRequests++;
  }

  /**
   * Marca una request como exitosa
   */
  markRequestSuccess(): void {
    this.lastUsed = Date.now();
  }

  /**
   * Resetea las métricas
   */
  resetMetrics(): void {
    this.totalRequests = 0;
    this.failedRequests = 0;
    this._isHealthy = true;
  }

  /**
   * Obtiene el tipo de browser
   */
  getBrowserType(): string {
    return this.browserType;
  }

  /**
   * Verifica si el browser está inicializado
   */
  isInitialized(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}