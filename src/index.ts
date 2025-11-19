
// Core
export { Scraper } from './core/Scraper';
export { HttpClient } from './core/HttpClient';
export { BrowserClient } from './core/BrowserClient';

// Types
export * from './types';

// Plugins
export * from './plugins';

// Utils
export { logger, LogLevel } from './utils/logger';
export * from './utils/helpers';

// Factory function
import { Scraper } from './core/Scraper';
import { ScraperOptions } from './types';

/**
 * Crea una nueva instancia del scraper
 * @param options Opciones de configuración
 * @returns Instancia del scraper
 */
export function createScraper(options: ScraperOptions = {}): Scraper {
  return new Scraper(options);
}

// Default export
export default {
  createScraper,
  Scraper,
};
