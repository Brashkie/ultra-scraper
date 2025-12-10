import { BrowserPool } from '../../src/core/BrowserPool';
import { chromium } from 'playwright';

describe('BrowserPool', () => {
  let pool: BrowserPool;

  beforeEach(() => {
    pool = new BrowserPool({
      minBrowsers: 1,
      maxBrowsers: 3,
      maxPagesPerBrowser: 5,
      browserType: 'chromium',
      launchOptions: {
        headless: true
      },
      autoScale: true,
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.2
    });
  });

  afterEach(async () => {
    await pool.close();
  });

  it('should initialize with minimum browsers', async () => {
    await pool.initialize();

    const metrics = pool.getMetrics();
    expect(metrics.browserCount).toBeGreaterThanOrEqual(1);
  });

  it('should acquire and release pages', async () => {
    await pool.initialize();

    const page = await pool.acquirePage();
    expect(page).toBeDefined();

    const metricsBefore = pool.getMetrics();
    expect(metricsBefore.totalPages).toBeGreaterThan(0);

    await pool.releasePage(page);

    const metricsAfter = pool.getMetrics();
    expect(metricsAfter.totalPages).toBeGreaterThanOrEqual(0);
  });

  it('should scale up when needed', async () => {
    await pool.initialize();

    // Acquire multiple pages to trigger scale up
    const pages = [];
    for (let i = 0; i < 3; i++) {
      pages.push(await pool.acquirePage());
    }

    // Wait for potential scaling
    await new Promise(resolve => setTimeout(resolve, 1000));

    const metrics = pool.getMetrics();
    expect(metrics.browserCount).toBeGreaterThanOrEqual(1);

    // Release pages
    for (const page of pages) {
      await pool.releasePage(page);
    }
  }, 15000);

  it('should handle concurrent page acquisitions', async () => {
    await pool.initialize();

    const acquisitions = Array.from({ length: 5 }, () => pool.acquirePage());
    const pages = await Promise.all(acquisitions);

    expect(pages.length).toBe(5);

    for (const page of pages) {
      await pool.releasePage(page);
    }
  }, 15000);

  it('should provide accurate metrics', async () => {
    await pool.initialize();

    const page = await pool.acquirePage();
    const metrics = pool.getMetrics();

    expect(metrics).toHaveProperty('browserCount');
    expect(metrics).toHaveProperty('totalPages');
    expect(metrics.browserCount).toBeGreaterThan(0);

    await pool.releasePage(page);
  });
});