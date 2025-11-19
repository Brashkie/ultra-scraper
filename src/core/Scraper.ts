import * as cheerio from 'cheerio';
import { CheerioAPI } from 'cheerio';
import {
  ScraperOptions,
  ScraperResponse,
  IScraper,
  ScraperPlugin,
  RequestConfig,
  ScraperEvent,
  EventListener,
  ExtractionSchema,
  ScraperError,
} from '../types';
import { HttpClient } from './HttpClient';
import { BrowserClient } from './BrowserClient';
import { isValidUrl, normalizeUrl, sanitizeText } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Clase principal del scraper
 */
export class Scraper implements IScraper {
  private httpClient: HttpClient;
  private browserClient: BrowserClient | null = null;
  private plugins: ScraperPlugin[] = [];
  private eventListeners: Map<ScraperEvent, EventListener[]> = new Map();
  private options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      dynamic: false,
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...options,
    };

    this.httpClient = new HttpClient(this.options);

    if (this.options.dynamic) {
      this.browserClient = new BrowserClient(this.options);
    }
  }

  /**
   * Obtiene el contenido de una URL
   */
  async get(url: string, options: Partial<ScraperOptions> = {}): Promise<ScraperResponse> {
    if (!isValidUrl(url)) {
      throw new ScraperError(`Invalid URL: ${url}`, 0, url);
    }

    const normalizedUrl = normalizeUrl(url);
    const mergedOptions = { ...this.options, ...options };

    // Crear configuración de petición
    const requestConfig: RequestConfig = {
      url: normalizedUrl,
      headers: mergedOptions.headers,
      timeout: mergedOptions.timeout,
      proxy: mergedOptions.proxy,
      retries: mergedOptions.retries,
    };

    // Ejecutar plugins beforeRequest
    let processedConfig = requestConfig;
    for (const plugin of this.plugins) {
      if (plugin.beforeRequest) {
        processedConfig = await plugin.beforeRequest(processedConfig);
      }
    }

    // Emitir evento beforeRequest
    await this.emit('beforeRequest', processedConfig);

    try {
      let response: ScraperResponse;

      // Determinar cliente a usar
      if (mergedOptions.dynamic || this.browserClient) {
        if (!this.browserClient) {
          this.browserClient = new BrowserClient(mergedOptions);
        }
        response = await this.browserClient.fetch(processedConfig.url, mergedOptions);
      } else {
        response = await this.httpClient.fetch(processedConfig.url, mergedOptions);
      }

      // Ejecutar plugins afterRequest
      let processedResponse = response;
      for (const plugin of this.plugins) {
        if (plugin.afterRequest) {
          processedResponse = await plugin.afterRequest(processedResponse);
        }
      }

      // Emitir evento afterRequest
      await this.emit('afterRequest', processedResponse);

      return processedResponse;
    } catch (error: any) {
      // Ejecutar plugins onError
      for (const plugin of this.plugins) {
        if (plugin.onError) {
          await plugin.onError(error);
        }
      }

      // Emitir evento error
      await this.emit('error', error);

      throw error;
    }
  }

  /**
   * Obtiene el contenido y lo parsea con Cheerio
   */
  async query(
    url: string,
    selector: string,
    options: Partial<ScraperOptions> = {}
  ): Promise<CheerioAPI> {
    const response = await this.get(url, options);
    const $ = cheerio.load(response.html);
    return $(selector) as any;
  }

  /**
   * Extrae datos estructurados según un esquema
   */
  async extract(
    url: string,
    schema: ExtractionSchema,
    options: Partial<ScraperOptions> = {}
  ): Promise<any[]> {
    const response = await this.get(url, options);
    const $ = cheerio.load(response.html);

    const results: any[] = [];
    const elements = $(schema.selector);

    elements.each((_index, element): void | false => {
      if (schema.limit && results.length >= schema.limit) {
        return false; // Break the loop
      }

      const item: any = {};

      for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
        const fieldElement = $(element).find(fieldConfig.selector);

        let value: any;

        if (fieldConfig.attr === 'text') {
          value = sanitizeText(fieldElement.text());
        } else if (fieldConfig.attr === 'html') {
          value = fieldElement.html();
        } else {
          value = fieldElement.attr(fieldConfig.attr);
        }

        // Aplicar transformación si existe
        if (fieldConfig.transform && value) {
          value = fieldConfig.transform(value);
        }

        // Usar valor por defecto si no hay valor
        if (!value && fieldConfig.default !== undefined) {
          value = fieldConfig.default;
        }

        item[fieldName] = value;
      }

      results.push(item);
    });

    return results;
  }

  /**
   * Registra un plugin
   */
  use(plugin: ScraperPlugin): void {
    logger.debug(`Registering plugin: ${plugin.name}`);
    this.plugins.push(plugin);
  }

  /**
   * Registra un listener de eventos
   */
  on(event: ScraperEvent, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Emite un evento
   */
  private async emit(event: ScraperEvent, ...args: any[]): Promise<void> {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        await listener(...args);
      }
    }
  }

  /**
   * Cierra el cliente de navegador si está activo
   */
  async close(): Promise<void> {
    if (this.browserClient) {
      await this.browserClient.close();
    }
  }
}
