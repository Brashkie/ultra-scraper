import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ScraperOptions, ScraperResponse, ScraperError } from '../types';
import { normalizeHeaders, sleep, exponentialBackoff } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Cliente HTTP para peticiones estáticas
 */
export class HttpClient {
  private axiosInstance: AxiosInstance;
  private options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...options,
    };

    this.axiosInstance = axios.create({
      timeout: this.options.timeout,
      headers: {
        'User-Agent':
          this.options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...this.options.headers,
      },
      validateStatus: () => true, // No lanzar error en status codes
    });
  }

  async fetch(url: string, config: Partial<ScraperOptions> = {}): Promise<ScraperResponse> {
    const mergedOptions = { ...this.options, ...config };
    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= (mergedOptions.retries || 0); attempt++) {
      try {
        if (attempt > 0) {
          const delay = exponentialBackoff(attempt - 1, mergedOptions.retryDelay);
          logger.info(`Retry attempt ${attempt} after ${delay}ms for ${url}`);
          await sleep(delay);
        }

        logger.debug(`Fetching ${url} (attempt ${attempt + 1})`);

        const axiosConfig: AxiosRequestConfig = {
          timeout: mergedOptions.timeout,
          headers: mergedOptions.headers,
        };

        if (mergedOptions.proxy) {
          const proxyUrl = new URL(mergedOptions.proxy);
          axiosConfig.proxy = {
            host: proxyUrl.hostname,
            port: parseInt(proxyUrl.port) || 8080,
            protocol: proxyUrl.protocol.replace(':', ''),
          };
        }

        const response: AxiosResponse = await this.axiosInstance.get(url, axiosConfig);
        const responseTime = Date.now() - startTime;

        logger.debug(`Response received: ${response.status} in ${responseTime}ms`);

        return {
          html: response.data,
          status: response.status,
          headers: normalizeHeaders(response.headers),
          url: response.request?.res?.responseUrl || url,
          responseTime,
        };
      } catch (error: any) {
        lastError = error;
        logger.error(`Error fetching ${url}:`, error.message);

        // No reintentar en ciertos errores
        if (error.code === 'ENOTFOUND' || error.code === 'INVALID_URL') {
          throw new ScraperError(`Failed to fetch ${url}: ${error.message}`, 0, url);
        }
      }
    }

    throw new ScraperError(
      `Failed to fetch ${url} after ${mergedOptions.retries} retries: ${lastError?.message}`,
      0,
      url
    );
  }

  updateOptions(options: Partial<ScraperOptions>): void {
    this.options = { ...this.options, ...options };

    if (options.headers || options.userAgent) {
      this.axiosInstance.defaults.headers.common = {
        ...this.axiosInstance.defaults.headers.common,
        'User-Agent': options.userAgent || this.options.userAgent,
        ...options.headers,
      };
    }
  }
}
