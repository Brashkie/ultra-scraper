import { BrowserInstance } from './BrowserInstance';
import { EventEmitter } from 'events';
import { Page, LaunchOptions } from 'playwright';

// Importar desde types
import { BrowserPoolConfig as PoolConfig } from '../types/pool.types';

// Usar el tipo importado O redefinir con launchOptions
export interface BrowserPoolConfig {
  minBrowsers: number;
  maxBrowsers: number;
  maxPagesPerBrowser: number;
  browserType: 'chromium' | 'firefox' | 'webkit';
  launchOptions?: LaunchOptions; // ✅ AGREGAR ESTA LÍNEA
  autoScale?: boolean;
  scaleUpThreshold?: number;
  scaleDownThreshold?: number;
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

// Configuración interna para BrowserInstance
interface BrowserInstanceConfig {
  maxPages: number;
  maxIdleTime: number;
  maxLifetime: number;
  healthCheckInterval: number;
  crashRecovery?: boolean;
  launchOptions?: LaunchOptions;
}

export class BrowserPool extends EventEmitter {
  private browsers: Map<string, BrowserInstance> = new Map();
  private waitQueue: Array<{
    resolve: (page: Page) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private isInitialized: boolean = false;
  private currentBrowserIndex: number = 0;
  private scaleTimer: NodeJS.Timeout | null = null;

  constructor(private config: BrowserPoolConfig) {
    super();
    
    // Defaults
    this.config.autoScale = this.config.autoScale !== false;
    this.config.scaleUpThreshold = this.config.scaleUpThreshold || 0.8;
    this.config.scaleDownThreshold = this.config.scaleDownThreshold || 0.2;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create minimum browsers
    for (let i = 0; i < this.config.minBrowsers; i++) {
      await this.createBrowser();
    }

    // Start auto-scaling
    if (this.config.autoScale) {
      this.startAutoScaling();
    }

    this.isInitialized = true;
    this.emit('initialized', { browserCount: this.browsers.size });
  }

  private async createBrowser(): Promise<BrowserInstance> {
    const browserConfig: BrowserInstanceConfig = {
      maxPages: this.config.maxPagesPerBrowser,
      maxIdleTime: 300000,
      maxLifetime: 1800000,
      healthCheckInterval: 30000,
      crashRecovery: true as boolean,
      launchOptions: this.config.launchOptions // ✅ Pasar launchOptions
    } as BrowserInstanceConfig;

    const browserId = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const browser = new BrowserInstance(
      browserId,              // 1er parámetro: id
      this.config.browserType, // 2do parámetro: browserType
      browserConfig           // 3er parámetro: config
    );

    // Event listeners
    browser.on('unhealthy', () => this.handleUnhealthyBrowser(browserId));
    browser.on('expired', () => this.handleExpiredBrowser(browserId));
    browser.on('idle', () => this.handleIdleBrowser(browserId));

    await browser.initialize();
    this.browsers.set(browserId, browser);

    this.emit('browserCreated', { browserId, totalBrowsers: this.browsers.size });

    return browser;
  }

  async acquirePage(): Promise<Page> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Try to get available browser
    const browser = this.getAvailableBrowser();

    if (browser) {
      try {
        const page = await browser.acquirePage();
        this.processWaitQueue(); // Process any waiting requests
        return page;
      } catch (error) {
        // browser.markRequestFailed(); // Si existe este método
        throw error;
      }
    }

    // No available browser
    if (this.browsers.size < this.config.maxBrowsers) {
      // Scale up
      const newBrowser = await this.createBrowser();
      this.emit('scaledUp', { browserCount: this.browsers.size });
      return await newBrowser.acquirePage();
    }

    // Wait in queue
    return new Promise((resolve, reject) => {
      this.waitQueue.push({
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.emit('queueing', { queueSize: this.waitQueue.length });

      // Timeout after 30 seconds
      setTimeout(() => {
        const index = this.waitQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
          reject(new Error('Timeout waiting for available browser'));
        }
      }, 30000);
    });
  }

  async releasePage(page: Page): Promise<void> {
    // Find the browser that owns this page
    for (const [, browser] of this.browsers) {
      try {
        await browser.releasePage(page);
        this.processWaitQueue();
        return;
      } catch {
        continue;
      }
    }
  }

  private getAvailableBrowser(): BrowserInstance | null {
    const availableBrowsers = Array.from(this.browsers.values())
      .filter(b => b.canAcquirePage()); // ✅ Ahora existe

    if (availableBrowsers.length === 0) return null;

    this.currentBrowserIndex = (this.currentBrowserIndex + 1) % availableBrowsers.length;
    return availableBrowsers[this.currentBrowserIndex];
  }

  private async processWaitQueue(): Promise<void> {
    while (this.waitQueue.length > 0) {
      const browser = this.getAvailableBrowser();
      if (!browser) break;

      const request = this.waitQueue.shift();
      if (!request) break;

      try {
        const page = await browser.acquirePage();
        request.resolve(page);
      } catch (error) {
        request.reject(error as Error);
      }
    }
  }

  // Auto-scaling
  private startAutoScaling(): void {
    this.scaleTimer = setInterval(() => {
      this.evaluateScaling();
    }, 10000); // Every 10 seconds
  }

  private async evaluateScaling(): Promise<void> {
    const metrics = this.getMetrics();
    const maxCapacity = metrics.browserCount * this.config.maxPagesPerBrowser;
    const utilizationRate = maxCapacity > 0 ? metrics.totalPages / maxCapacity : 0;

    // Scale up
    if (utilizationRate > (this.config.scaleUpThreshold || 0.8) && 
        this.browsers.size < this.config.maxBrowsers) {
      await this.createBrowser();
      this.emit('scaledUp', { browserCount: this.browsers.size });
    }

    // Scale down
    if (utilizationRate < (this.config.scaleDownThreshold || 0.2) && 
        this.browsers.size > this.config.minBrowsers) {
      await this.removeIdleBrowser();
      this.emit('scaledDown', { browserCount: this.browsers.size });
    }
  }

  private async removeIdleBrowser(): Promise<void> {
    for (const [id, browser] of this.browsers) {
      const metrics = browser.getMetrics();
      if (metrics.pageCount === 0) {
        await browser.close();
        this.browsers.delete(id);
        return;
      }
    }
  }

  // Health management
  private async handleUnhealthyBrowser(browserId: string): Promise<void> {
    const browser = this.browsers.get(browserId);
    if (!browser) return;

    await browser.close();
    this.browsers.delete(browserId);

    // Replace with new browser
    if (this.browsers.size < this.config.minBrowsers) {
      await this.createBrowser();
    }

    this.emit('browserReplaced', { browserId, totalBrowsers: this.browsers.size });
  }

  private async handleExpiredBrowser(browserId: string): Promise<void> {
    await this.handleUnhealthyBrowser(browserId);
  }

  private async handleIdleBrowser(browserId: string): Promise<void> {
    if (this.browsers.size > this.config.minBrowsers) {
      const browser = this.browsers.get(browserId);
      if (browser) {
        const metrics = browser.getMetrics();
        if (metrics.pageCount === 0) {
          await browser.close();
          this.browsers.delete(browserId);
        }
      }
    }
  }

  // Metrics
  getMetrics() {
    const browsers = Array.from(this.browsers.values());
    const allMetrics = browsers.map(b => b.getMetrics());

    return {
      browserCount: browsers.length,
      totalPages: allMetrics.reduce((sum, m) => sum + m.pageCount, 0),
      activePages: allMetrics.reduce((sum, m) => sum + m.pageCount, 0), // ✅ Usar pageCount
      queueSize: this.waitQueue.length,
      totalRequests: allMetrics.reduce((sum, m) => sum + m.totalRequests, 0),
      successfulRequests: allMetrics.reduce((sum, m) => sum + (m.totalRequests - m.failedRequests), 0),
      failedRequests: allMetrics.reduce((sum, m) => sum + m.failedRequests, 0),
      averageResponseTime: 0,
      browsers: allMetrics
    };
  }

  async close(): Promise<void> {
    if (this.scaleTimer) {
      clearInterval(this.scaleTimer);
    }

    for (const [, browser] of this.browsers) {
      await browser.close();
    }

    this.browsers.clear();
    this.waitQueue = [];
    this.isInitialized = false;

    this.emit('closed');
  }
}