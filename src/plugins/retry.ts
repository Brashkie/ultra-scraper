import { ScraperPlugin, ScraperResponse } from '../types';
import { shouldRetry } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Plugin para manejar reintentos en respuestas con errores
 */
export class RetryPlugin implements ScraperPlugin {
  name = 'Retry';

  afterRequest = (response: ScraperResponse): ScraperResponse => {
    if (shouldRetry(response.status)) {
      logger.warn(`Response status ${response.status} suggests retry might be needed`);
    }
    return response;
  };

  onError = async (error: Error): Promise<void> => {
    logger.error(`Request failed: ${error.message}`);
  };
}

/**
 * Factory function para crear el plugin
 */
export function useRetry(): ScraperPlugin {
  return new RetryPlugin();
}
