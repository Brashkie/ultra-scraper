import { ScraperPlugin, RequestConfig } from '../types';
import { getRandomUserAgent } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Plugin para usar User-Agent aleatorio en cada petición
 */
export class RandomUserAgentPlugin implements ScraperPlugin {
  name = 'RandomUserAgent';

  beforeRequest = (config: RequestConfig): RequestConfig => {
    const userAgent = getRandomUserAgent();
    logger.debug(`Using User-Agent: ${userAgent}`);

    return {
      ...config,
      headers: {
        ...config.headers,
        'User-Agent': userAgent,
      },
    };
  };
}

/**
 * Factory function para crear el plugin
 */
export function useRandomUserAgent(): ScraperPlugin {
  return new RandomUserAgentPlugin();
}
