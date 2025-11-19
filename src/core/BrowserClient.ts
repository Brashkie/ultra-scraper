import { chromium, Browser, Page } from 'playwright';
import { ScraperOptions, ScraperResponse, ScraperError } from '../types';
import { sleep } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Cliente de navegador para scraping dinámico
 */
export class BrowserClient {
  private browser: Browser | null = null;
  private options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      timeout: 30000,
      retries: 2,
      retryDelay: 2000,
      waitTime: 1000,
      ...options,
    };
  }

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      logger.debug('Launching browser...');
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async fetch(url: string, config: Partial<ScraperOptions> = {}): Promise<ScraperResponse> {
    const mergedOptions = { ...this.options, ...config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (mergedOptions.retries || 0); attempt++) {
      let page: Page | null = null;

      try {
        if (attempt > 0) {
          const delay = mergedOptions.retryDelay || 2000;
          logger.info(`Retry attempt ${attempt} after ${delay}ms for ${url}`);
          await sleep(delay);
        }

        const browser = await this.ensureBrowser();
        const context = await browser.newContext({
          userAgent:
            mergedOptions.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          extraHTTPHeaders: mergedOptions.headers || {},
        });

        page = await context.newPage();

        logger.debug(`Navigating to ${url} (attempt ${attempt + 1})`);

        const startTime = Date.now();
        const response = await page.goto(url, {
          timeout: mergedOptions.timeout,
          waitUntil: 'networkidle',
        });

        if (!response) {
          throw new Error('No response received');
        }

        // Esperar por selector específico si se proporciona
        if (mergedOptions.waitForSelector) {
          logger.debug(`Waiting for selector: ${mergedOptions.waitForSelector}`);
          await page.waitForSelector(mergedOptions.waitForSelector, {
            timeout: mergedOptions.timeout,
          });
        }

        // Tiempo de espera adicional
        if (mergedOptions.waitTime) {
          await sleep(mergedOptions.waitTime);
        }

        const html = await page.content();
        const status = response.status();
        const headers = response.headers();
        const finalUrl = page.url();
        const responseTime = Date.now() - startTime;

        await page.close();
        await context.close();

        logger.debug(`Response received: ${status} in ${responseTime}ms`);

        return {
          html,
          status,
          headers,
          url: finalUrl,
          responseTime,
        };
      } catch (error: any) {
        lastError = error;
        logger.error(`Error fetching ${url}:`, error.message);

        if (page) {
          await page.close().catch(() => {});
        }

        // No reintentar en timeout extremos
        if (error.message?.includes('Timeout') && attempt >= 1) {
          break;
        }
      }
    }

    throw new ScraperError(
      `Failed to fetch ${url} with browser after ${mergedOptions.retries} retries: ${lastError?.message}`,
      0,
      url
    );
  }

  async close(): Promise<void> {
    if (this.browser) {
      logger.debug('Closing browser...');
      await this.browser.close();
      this.browser = null;
    }
  }
}
