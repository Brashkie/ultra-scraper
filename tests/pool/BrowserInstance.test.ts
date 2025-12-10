import { BrowserInstance } from '../../src/core/BrowserInstance';

describe('BrowserInstance', () => {
  let instance: BrowserInstance;

  beforeEach(async () => {
    instance = new BrowserInstance('test-instance', 'chromium', {
      maxPages: 5,
      maxIdleTime: 60000,
      maxLifetime: 300000,
      healthCheckInterval: 5000,
      crashRecovery: true,
      launchOptions: {
        headless: true
      }
    });

    await instance.initialize();
  });

  afterEach(async () => {
    try {
      await instance.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(instance.getId()).toBe('test-instance');
      expect(instance.isHealthy()).toBe(true);
      expect(instance.isInitialized()).toBe(true);
      expect(instance.getBrowserType()).toBe('chromium');
    });

    it('should have correct initial metrics', () => {
      const metrics = instance.getMetrics();
      
      expect(metrics.id).toBe('test-instance');
      expect(metrics.pageCount).toBe(0);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.isHealthy).toBe(true);
      expect(metrics.uptime).toBeGreaterThan(0);
    });
  });

  describe('Page Management', () => {
    it('should acquire and release pages', async () => {
      const page = await instance.acquirePage();
      expect(page).toBeDefined();

      const metrics = instance.getMetrics();
      expect(metrics.pageCount).toBe(1);
      expect(metrics.totalRequests).toBe(1);

      await instance.releasePage(page);

      const metricsAfter = instance.getMetrics();
      expect(metricsAfter.pageCount).toBe(0);
    });

    it('should respect max pages limit', async () => {
      const pages = [];

      // Acquire max pages (5)
      for (let i = 0; i < 5; i++) {
        pages.push(await instance.acquirePage());
      }

      expect(instance.getPageCount()).toBe(5);
      expect(instance.canAcquirePage()).toBe(false);

      // Should throw error when trying to acquire more
      await expect(instance.acquirePage()).rejects.toThrow('Max pages limit reached');

      // Release all pages
      for (const page of pages) {
        await instance.releasePage(page);
      }

      expect(instance.getPageCount()).toBe(0);
      expect(instance.canAcquirePage()).toBe(true);
    }, 15000);

    it('should handle page navigation', async () => {
      const page = await instance.acquirePage();
      
      await page.goto('https://example.com');
      const title = await page.title();
      
      expect(title).toContain('Example');

      await instance.releasePage(page);
    }, 10000);

    it('should track multiple page acquisitions', async () => {
      const page1 = await instance.acquirePage();
      const page2 = await instance.acquirePage();
      const page3 = await instance.acquirePage();

      expect(instance.getPageCount()).toBe(3);

      const metrics = instance.getMetrics();
      expect(metrics.totalRequests).toBe(3);

      await instance.releasePage(page1);
      await instance.releasePage(page2);
      await instance.releasePage(page3);

      expect(instance.getPageCount()).toBe(0);
    });
  });

  describe('Metrics and Tracking', () => {
    it('should track metrics correctly', async () => {
      const page = await instance.acquirePage();
      await page.goto('https://example.com');

      const metrics = instance.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.idleTime).toBeGreaterThanOrEqual(0);

      await instance.releasePage(page);
    }, 10000);

    it('should track failed requests', () => {
      instance.markRequestFailed();
      instance.markRequestFailed();

      const metrics = instance.getMetrics();
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.errorRate).toBe(1); // 2 failed / 2 total = 1 (100%)
    });

    it('should track successful requests', async () => {
      await instance.acquirePage();
      instance.markRequestSuccess();

      const metrics = instance.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.idleTime).toBeLessThan(1000);
    });

    it('should calculate error rate correctly', async () => {
      // 3 successful, 2 failed
      await instance.acquirePage();
      await instance.acquirePage();
      await instance.acquirePage();
      
      instance.markRequestFailed();
      instance.markRequestFailed();

      const metrics = instance.getMetrics();
      expect(metrics.totalRequests).toBe(5); // 3 from acquirePage + 2 from constructor
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.errorRate).toBe(2 / 5); // 0.4
    });

    it('should reset metrics', async () => {
      await instance.acquirePage();
      instance.markRequestFailed();

      let metrics = instance.getMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);

      instance.resetMetrics();

      metrics = instance.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.isHealthy).toBe(true);
    });
  });

  describe('Health Checks', () => {
    it('should perform health checks', async () => {
      const initialHealth = instance.isHealthy();
      expect(initialHealth).toBe(true);

      // Health should remain true for a healthy instance
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      const stillHealthy = instance.isHealthy();
      expect(stillHealthy).toBe(true);
    }, 10000);

    it('should detect unhealthy state with high error rate', () => {
      // Simular muchas requests fallidas
      for (let i = 0; i < 100; i++) {
        instance.markRequestFailed();
      }

      // Esto haría que errorRate > 0.5 en el próximo health check
      const metrics = instance.getMetrics();
      expect(metrics.errorRate).toBeGreaterThan(0.5);
    });

    it('should emit unhealthy event', (done) => {
      instance.once('unhealthy', (data) => {
        expect(data.browserId).toBe('test-instance');
        expect(data.reason).toBeDefined();
        done();
      });

      // Forzar estado unhealthy
      for (let i = 0; i < 100; i++) {
        instance.markRequestFailed();
      }

      // Esperar el próximo health check
    }, 15000);
  });

  describe('Cleanup', () => {
    it('should close all pages on close', async () => {
      const page1 = await instance.acquirePage();
      const page2 = await instance.acquirePage();

      expect(instance.getPageCount()).toBe(2);

      await instance.close();

      expect(instance.getPageCount()).toBe(0);
      expect(instance.isInitialized()).toBe(false);
    });

    it('should emit closed event', (done) => {
      instance.once('closed', (id) => {
        expect(id).toBe('test-instance');
        done();
      });

      instance.close();
    });

    it('should handle close gracefully even with errors', async () => {
      const page = await instance.acquirePage();
      
      // Close page manually (simulate error scenario)
      await page.close();

      // Should not throw
      await expect(instance.close()).resolves.not.toThrow();
    });
  });

  describe('Events', () => {
    it('should emit pageAcquired event', (done) => {
      instance.once('pageAcquired', (data) => {
        expect(data.browserId).toBe('test-instance');
        expect(data.pageCount).toBe(1);
        done();
      });

      instance.acquirePage();
    });

    it('should emit pageReleased event', async () => {
      const page = await instance.acquirePage();

      const promise = new Promise((resolve) => {
        instance.once('pageReleased', (data) => {
          expect(data.browserId).toBe('test-instance');
          expect(data.pageCount).toBe(0);
          resolve(true);
        });
      });

      await instance.releasePage(page);
      await promise;
    });

    it('should emit initialized event', () => {
      // Ya emitido en beforeEach, pero podemos verificar creando nueva instancia
      const newInstance = new BrowserInstance('test-2', 'chromium', {
        maxPages: 5,
        maxIdleTime: 60000,
        maxLifetime: 300000,
        healthCheckInterval: 5000
      });

      const promise = new Promise((resolve) => {
        newInstance.once('initialized', (id) => {
          expect(id).toBe('test-2');
          resolve(true);
        });
      });

      newInstance.initialize();

      return promise.then(async () => {
        await newInstance.close();
      });
    });
  });
});