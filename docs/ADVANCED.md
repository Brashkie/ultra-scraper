# Documentación Avanzada

## Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Configuración Avanzada](#configuración-avanzada)
- [Creación de Plugins](#creación-de-plugins)
- [Manejo de Errores](#manejo-de-errores)
- [Optimización de Rendimiento](#optimización-de-rendimiento)
- [Casos de Uso](#casos-de-uso)

## Arquitectura

Ultra Scraper está construido con una arquitectura modular que separa las responsabilidades:

### Componentes Principales

```
┌─────────────────────────────────────────┐
│          Scraper (Core)                 │
│  - Orquestación                         │
│  - Sistema de eventos                   │
│  - Gestión de plugins                   │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼─────┐   ┌─────▼──────┐
│ HttpClient │   │ BrowserClient│
│ (Estático) │   │  (Dinámico) │
└────────────┘   └─────────────┘
```

### HttpClient

Maneja peticiones HTTP estáticas usando Axios:
- Peticiones rápidas
- Bajo consumo de recursos
- Ideal para contenido estático

### BrowserClient

Maneja contenido dinámico usando Playwright:
- Ejecuta JavaScript
- Espera elementos dinámicos
- Simula navegación real

## Configuración Avanzada

### Headers Personalizados

```typescript
const scraper = createScraper({
  headers: {
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'es-ES,es;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  }
});
```

### Configuración de Proxys

```typescript
// Proxy simple
const scraper = createScraper({
  proxy: 'http://proxy.example.com:8080'
});

// Proxy con autenticación
const scraper = createScraper({
  proxy: 'http://user:pass@proxy.example.com:8080'
});

// Proxy SOCKS
const scraper = createScraper({
  proxy: 'socks5://proxy.example.com:1080'
});
```

### Configuración de Reintentos

```typescript
const scraper = createScraper({
  retries: 5,                    // Número de reintentos
  retryDelay: 2000,              // Delay inicial (ms)
  // El delay usa backoff exponencial automáticamente
});
```

## Creación de Plugins

### Estructura de un Plugin

```typescript
import { ScraperPlugin, RequestConfig, ScraperResponse } from 'ultra-scraper';

export class MyCustomPlugin implements ScraperPlugin {
  name = 'MyCustomPlugin';

  // Ejecutado antes de cada petición
  beforeRequest = async (config: RequestConfig): Promise<RequestConfig> => {
    // Modificar configuración
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Custom-Header': 'value'
      }
    };
  };

  // Ejecutado después de cada petición exitosa
  afterRequest = async (response: ScraperResponse): Promise<ScraperResponse> => {
    // Procesar respuesta
    console.log(`Response received: ${response.status}`);
    return response;
  };

  // Ejecutado cuando ocurre un error
  onError = async (error: Error): Promise<void> => {
    console.error('Error occurred:', error);
  };
}

// Factory function
export function useMyCustomPlugin() {
  return new MyCustomPlugin();
}
```

### Plugin de Cache

```typescript
export class CachePlugin implements ScraperPlugin {
  name = 'Cache';
  private cache = new Map<string, ScraperResponse>();
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  beforeRequest = async (config: RequestConfig): Promise<RequestConfig> => {
    const cached = this.cache.get(config.url);
    if (cached && Date.now() - cached.responseTime < this.ttl) {
      throw new CacheHitError(cached);
    }
    return config;
  };

  afterRequest = async (response: ScraperResponse): Promise<ScraperResponse> => {
    this.cache.set(response.url, response);
    return response;
  };
}
```

### Plugin de Cookies

```typescript
export class CookiePlugin implements ScraperPlugin {
  name = 'Cookies';
  private cookies = new Map<string, string>();

  beforeRequest = (config: RequestConfig): RequestConfig => {
    const cookieHeader = Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    return {
      ...config,
      headers: {
        ...config.headers,
        'Cookie': cookieHeader
      }
    };
  };

  afterRequest = (response: ScraperResponse): ScraperResponse => {
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      this.parseCookies(setCookie);
    }
    return response;
  };

  private parseCookies(setCookie: string): void {
    // Parse and store cookies
  }
}
```

## Manejo de Errores

### Tipos de Errores

```typescript
import { ScraperError } from 'ultra-scraper';

try {
  const data = await scraper.get(url);
} catch (error) {
  if (error instanceof ScraperError) {
    console.error('Scraper error:', error.message);
    console.error('Status code:', error.statusCode);
    console.error('URL:', error.url);
  } else if (error.code === 'ENOTFOUND') {
    console.error('DNS resolution failed');
  } else if (error.code === 'ECONNREFUSED') {
    console.error('Connection refused');
  } else if (error.code === 'ETIMEDOUT') {
    console.error('Request timeout');
  }
}
```

### Manejo Global de Errores

```typescript
const scraper = createScraper();

scraper.on('error', (error) => {
  // Log a sistema de monitoreo
  logger.error('Scraping failed', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Enviar notificación
  sendAlert(error);
});
```

## Optimización de Rendimiento

### Scraping Paralelo

```typescript
async function scrapeMultipleUrls(urls: string[]) {
  const scraper = createScraper({
    retries: 2,
    timeout: 10000
  });

  try {
    // Scraping en paralelo con límite
    const results = await Promise.allSettled(
      urls.map(url => scraper.get(url))
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  } finally {
    await scraper.close();
  }
}
```

### Uso Eficiente de Memoria

```typescript
// ❌ Malo - carga todo en memoria
const allData = await Promise.all(
  urls.map(url => scraper.get(url))
);

// ✅ Bueno - procesa en lotes
async function scrapeInBatches(urls: string[], batchSize: number = 10) {
  const results = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(url => scraper.get(url))
    );
    results.push(...batchResults);
    
    // Limpiar memoria si es necesario
    if (global.gc) global.gc();
  }
  
  return results;
}
```

### Rate Limiting Inteligente

```typescript
import { useRateLimit } from 'ultra-scraper';

// Básico
scraper.use(useRateLimit({ requestsPerSecond: 5 }));

// Por dominio
class SmartRateLimitPlugin implements ScraperPlugin {
  name = 'SmartRateLimit';
  private domainTimers = new Map<string, number>();

  beforeRequest = async (config: RequestConfig): Promise<RequestConfig> => {
    const domain = new URL(config.url).hostname;
    const lastRequest = this.domainTimers.get(domain) || 0;
    const timeSince = Date.now() - lastRequest;
    
    // Diferente rate limit por dominio
    const minInterval = this.getIntervalForDomain(domain);
    
    if (timeSince < minInterval) {
      await sleep(minInterval - timeSince);
    }
    
    this.domainTimers.set(domain, Date.now());
    return config;
  };

  private getIntervalForDomain(domain: string): number {
    // Lógica personalizada por dominio
    if (domain.includes('api')) return 500;
    if (domain.includes('heavy')) return 2000;
    return 1000;
  }
}
```

## Casos de Uso

### E-commerce Scraping

```typescript
async function scrapeProducts(url: string) {
  const scraper = createScraper({
    dynamic: true, // Para precios dinámicos
    waitForSelector: '.product-price'
  });

  const products = await scraper.extract(url, {
    selector: '.product-card',
    fields: {
      name: {
        selector: '.product-name',
        attr: 'text'
      },
      price: {
        selector: '.product-price',
        attr: 'text',
        transform: (price) => parseFloat(price.replace(/[^0-9.]/g, ''))
      },
      rating: {
        selector: '.rating',
        attr: 'data-rating',
        transform: (rating) => parseFloat(rating),
        default: 0
      },
      inStock: {
        selector: '.stock-status',
        attr: 'text',
        transform: (text) => text.includes('In Stock')
      },
      image: {
        selector: 'img',
        attr: 'src'
      },
      url: {
        selector: 'a',
        attr: 'href'
      }
    }
  });

  await scraper.close();
  return products;
}
```

### News Aggregator

```typescript
async function aggregateNews(sources: string[]) {
  const scraper = createScraper();
  
  scraper.use(useRateLimit({ requestsPerSecond: 2 }));
  scraper.use(useRandomUserAgent());

  const allNews = [];

  for (const source of sources) {
    const articles = await scraper.extract(source, {
      selector: 'article',
      limit: 10,
      fields: {
        title: {
          selector: 'h2',
          attr: 'text'
        },
        summary: {
          selector: '.summary',
          attr: 'text'
        },
        author: {
          selector: '.author',
          attr: 'text',
          default: 'Unknown'
        },
        date: {
          selector: 'time',
          attr: 'datetime',
          transform: (date) => new Date(date)
        },
        url: {
          selector: 'a',
          attr: 'href'
        }
      }
    });

    allNews.push(...articles);
  }

  await scraper.close();
  return allNews;
}
```

### Social Media Monitoring

```typescript
async function monitorHashtag(hashtag: string) {
  const scraper = createScraper({
    dynamic: true,
    waitTime: 2000
  });

  const posts = await scraper.extract(`https://example.com/hashtag/${hashtag}`, {
    selector: '.post',
    fields: {
      username: {
        selector: '.username',
        attr: 'text'
      },
      content: {
        selector: '.post-content',
        attr: 'text'
      },
      likes: {
        selector: '.likes-count',
        attr: 'text',
        transform: (count) => parseInt(count.replace(/\D/g, ''))
      },
      timestamp: {
        selector: 'time',
        attr: 'datetime',
        transform: (date) => new Date(date)
      }
    }
  });

  await scraper.close();
  return posts;
}
```

## Mejores Prácticas

1. **Siempre cierra el scraper**: Usa `await scraper.close()` para liberar recursos
2. **Usa rate limiting**: Respeta los servidores ajenos
3. **Maneja errores apropiadamente**: No asumas que todo funcionará
4. **Respeta robots.txt**: Verifica las políticas de scraping
5. **Usa User-Agents reales**: No te identifiques como bot si no es necesario
6. **Cachea cuando sea posible**: Reduce peticiones innecesarias
7. **Monitorea tu scraping**: Usa logging y métricas

## Recursos Adicionales

- [Playwright Documentation](https://playwright.dev/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Axios Documentation](https://axios-http.com/)
