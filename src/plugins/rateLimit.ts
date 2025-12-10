import { ScraperPlugin, RequestConfig } from '../types';
import { sleep } from '../utils/helpers';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
}

/**
 * Plugin para limitar la tasa de peticiones
 */
export class RateLimitPlugin implements ScraperPlugin {
  name = 'RateLimit';
  private lastRequestTime = 0;
  private minInterval: number;

  constructor(options: RateLimitOptions = {}) {
    if (options.requestsPerSecond) {
      this.minInterval = 1000 / options.requestsPerSecond;
    } else if (options.requestsPerMinute) {
      this.minInterval = 60000 / options.requestsPerMinute;
    } else {
      this.minInterval = 1000; // Default: 1 request per second
    }
  }

  beforeRequest = async (config: RequestConfig): Promise<RequestConfig> => {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      logger.debug(`Rate limiting: waiting ${waitTime}ms`);
      await sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
    return config;
  };
}

/**
 * Factory function para crear el plugin
 */
export function useRateLimit(options: RateLimitOptions = {}): ScraperPlugin {
  return new RateLimitPlugin(options);
}
