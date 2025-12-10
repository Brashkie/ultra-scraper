import { ScraperPlugin, RequestConfig } from '../types';
import { logger } from '../utils/logger';

/**
 * Plugin para rotar proxys automáticamente
 */
export class ProxyRotationPlugin implements ScraperPlugin {
  name = 'ProxyRotation';
  private proxies: string[];
  private currentIndex = 0;

  constructor(proxies: string[]) {
    if (!proxies || proxies.length === 0) {
      throw new Error('Proxy list cannot be empty');
    }
    this.proxies = proxies;
  }

  beforeRequest = (config: RequestConfig): RequestConfig => {
    const proxy = this.getNextProxy();
    logger.debug(`Using proxy: ${proxy}`);
    return {
      ...config,
      proxy,
    };
  };

  private getNextProxy(): string {
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }
}

/**
 * Factory function para crear el plugin
 */
export function useProxyRotation(proxies: string[]): ScraperPlugin {
  return new ProxyRotationPlugin(proxies);
}
