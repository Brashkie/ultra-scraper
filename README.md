<div align="center">

# 🚀 Ultra Scraper

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)
![Tests](https://img.shields.io/badge/tests-passing-success.svg)
![Coverage](https://img.shields.io/badge/coverage-67%25-yellow.svg)

### 🌟 Sistema profesional de web scraping con capacidades anti-bot, gestión de concurrencia y extracción inteligente

**Ultra Scraper** es un motor de scraping universal diseñado para manejar cualquier tipo de sitio web: HTTP, HTTPS, estático, dinámico o protegido. Ofrece una API simple, rápida y modular, ideal para bots, automatización, análisis de datos y pipelines empresariales.

[Instalación](#-instalación) • [Guía Rápida](#-guía-rápida) • [Características](#-características) • [Ejemplos](#-ejemplos-completos) • [API](#-api-reference)

</div>

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Novedades v1.1.0](#-novedades-v110)
- [Instalación](#-instalación)
- [Guía Rápida](#-guía-rápida)
- [Uso Avanzado](#-uso-avanzado)
- [Características Avanzadas](#-características-avanzadas)
  - [Browser Pool](#browser-pool)
  - [Sistema de Colas](#sistema-de-colas)
  - [Anti-Bot Detection](#anti-bot-detection)
  - [Rate Limiting](#rate-limiting)
  - [Load Balancing](#load-balancing)
  - [Concurrency Manager](#concurrency-manager)
- [Plugins](#-plugins)
- [Ejemplos Completos](#-ejemplos-completos)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Changelog](#-changelog)
- [Contribuir](#-contribuir)
- [Roadmap](#-roadmap)
- [Licencia](#-licencia)

---

## ✨ Características

<table>
<tr>
<td width="50%">

### 🌐 Versatilidad
- ✅ Soporte para **HTTP** y **HTTPS**
- ✅ Scraping de contenido **estático** y **dinámico**
- ✅ Modo **headless** opcional (Playwright)
- ✅ Compatible con sitios protegidos
- ✅ TypeScript ready con IntelliSense completo

</td>
<td width="50%">

### ⚡ Rendimiento
- ✅ Parsers de **alto rendimiento** (Cheerio)
- ✅ **Auto-reintentos** con backoff exponencial
- ✅ Rotación de **user-agents** y **proxys**
- ✅ Sistema de **plugins** extensible
- ✅ Pool automático de navegadores

</td>
</tr>
<tr>
<td width="50%">

### 📊 Extracción de datos
- ✅ HTML, JSON, texto y atributos
- ✅ Imágenes, videos y archivos media
- ✅ Selectores CSS y XPath
- ✅ Extracción estructurada con schemas
- ✅ Transformaciones personalizadas

</td>
<td width="50%">

### 🛠️ Facilidad de uso
- ✅ API simple e intuitiva
- ✅ Factory functions para inicio rápido
- ✅ Configuración flexible
- ✅ Documentación completa con 30+ ejemplos
- ✅ Manejo robusto de errores

</td>
</tr>
</table>

### 🚀 **Características Profesionales v1.1.0**

<table>
<tr>
<td width="50%">

#### 🌐 Browser Pool Pro
- Pool automático de navegadores
- Auto-scaling inteligente
- Health monitoring en tiempo real
- Recuperación automática de crashes
- Estrategias: Round-robin, Least-used

#### 📋 Sistema de Colas Avanzado
- 4 niveles de prioridad (CRITICAL → LOW)
- Persistencia en disco automática
- Dead Letter Queue
- Scheduler con cron, interval, delayed
- Métricas en tiempo real

#### 🛡️ Anti-Bot Detection PRO
- Detección de Cloudflare (v1/v2/Turnstile)
- Soporte CAPTCHA (reCAPTCHA, hCaptcha, FunCaptcha)
- Fingerprint management realista
- 13 técnicas de evasión stealth
- Simulación de comportamiento humano

</td>
<td width="50%">

#### ⚡ Gestión de Concurrencia
- ConcurrencyManager con adaptive scaling
- RateLimiter con 4 estrategias:
  - Fixed Window
  - Sliding Window
  - Token Bucket
  - Leaky Bucket
- LoadBalancer con 6 estrategias
- ThrottleManager inteligente
- Circuit Breaker pattern

#### 📈 Monitoring & Analytics
- PerformanceMonitor con métricas P50/P95/P99
- PoolAnalytics con detección de tendencias
- QueueMetrics con throughput tracking
- Exportación de métricas
- Alertas configurables

#### 🔄 Resiliencia
- Retry strategies configurables
- Circuit breaker automático
- Health checks continuos
- Graceful degradation
- Backup automático de estado

</td>
</tr>
</table>

---

## 🎉 Novedades v1.1.0

### **✨ Agregado**
- 🎯 **Browser Pool System** - Gestión automática de múltiples navegadores con auto-scaling
- 📋 **Advanced Queue System** - 4 niveles de prioridad, persistencia y dead letter queue
- 🗓️ **Queue Scheduler** - Programación de tareas con soporte cron completo
- 🛡️ **Anti-Bot Detection PRO** - Detección y evasión de Cloudflare, WAF, CAPTCHAs
- 🎭 **Fingerprint Management** - Perfiles de navegador realistas y rotación automática
- 👤 **Bot Behavior Simulator** - Simulación de movimientos de mouse, scroll, typing
- 🔄 **Concurrency Manager** - Control avanzado con adaptive scaling
- ⏱️ **Rate Limiter Advanced** - 4 estrategias de rate limiting profesionales
- ⚖️ **Load Balancer** - 6 estrategias de distribución de carga
- 🔌 **Circuit Breaker** - Patrón de resiliencia para servicios inestables
- 📊 **Monitoring System** - Métricas, analytics y alertas en tiempo real

### **🔧 Mejorado**
- TypeScript 5.9.3 con types completos y exports organizados
- Cobertura de tests mejorada al 67%
- Documentación extensa con 30+ ejemplos prácticos
- CI/CD configurado con GitHub Actions
- Performance optimizado para alto volumen

### **🐛 Corregido**
- 66 errores de compilación TypeScript resueltos
- Problemas de tipos DOM en código de navegador
- Conflictos de nombres en tipos exportados
- Memory leaks en pools de larga duración
- Race conditions en queue system

---

## 📦 Instalación
```bash
# Instalación completa (recomendada)
npm install ultra-scraper

# Instalar navegadores de Playwright (solo si usarás scraping dinámico)
npx playwright install chromium
```

### Requisitos
- **Node.js** >= 16.0.0
- **npm** >= 7.0.0

**Nota:** Playwright se instala automáticamente. Los navegadores son opcionales si solo usas scraping HTTP.

---

## 🚀 Guía Rápida

### Scraping Simple
```typescript
import { createScraper } from "ultra-scraper";

const scraper = createScraper();

// Obtener contenido de una página
const response = await scraper.get("https://example.com");

console.log(response.html);     // HTML completo
console.log(response.status);   // 200
console.log(response.headers);  // Headers HTTP
console.log(response.responseTime); // 245ms
```

### Scraping con Selectores CSS
```typescript
import { createScraper } from "ultra-scraper";

const scraper = createScraper();

// Extraer elementos específicos
const $ = await scraper.query("https://example.com", "h1");
console.log($.text());  // Texto del h1

// Múltiples elementos
const $ = await scraper.query("https://example.com", "a");
$("a").each((i, elem) => {
  console.log($(elem).attr("href"));
});
```

### Extracción Estructurada
```typescript
const scraper = createScraper();

const products = await scraper.extract("https://shop.com/products", {
  selector: ".product",
  fields: {
    title: { selector: ".title", attr: "text" },
    price: { 
      selector: ".price", 
      attr: "text",
      transform: (val) => parseFloat(val.replace('$', ''))
    },
    image: { selector: "img", attr: "src" },
    link: { selector: "a", attr: "href" }
  },
  limit: 50
});

console.log(products);
// [
//   { title: "Product 1", price: 29.99, image: "...", link: "..." },
//   { title: "Product 2", price: 49.99, image: "...", link: "..." }
// ]
```

---

## 🔍 Uso Avanzado

### Scraping Dinámico (SPAs)

Para sitios web que cargan contenido con JavaScript:
```typescript
import { createScraper } from "ultra-scraper";

const scraper = createScraper({
  dynamic: true,          // Habilita navegador headless
  retries: 3,             // Número de reintentos
  timeout: 12000,         // Timeout en ms
  waitForSelector: ".content"  // Esperar elemento específico
});

const $ = await scraper.query("https://spa-website.com", ".dynamic-content");
console.log($.text());
```

### Configuración Completa de Opciones
```typescript
const scraper = createScraper({
  // Navegación
  dynamic: false,           // Usar navegador headless
  userAgent: "custom-ua",   // User-agent personalizado
  timeout: 10000,           // Timeout en milisegundos
  
  // Reintentos
  retries: 3,               // Número de reintentos
  retryDelay: 1000,         // Delay entre reintentos (ms)
  
  // Headers personalizados
  headers: {
    "Accept-Language": "es-ES",
    "Referer": "https://google.com"
  },
  
  // Proxy
  proxy: "http://proxy:8080",
  
  // Espera dinámica
  waitForSelector: ".loaded",
  waitTime: 2000
});
```

---

## 🎓 Características Avanzadas

### Browser Pool

Gestión automática de múltiples navegadores para scraping paralelo eficiente:
```typescript
import { createBrowserPool } from 'ultra-scraper';

const pool = createBrowserPool(10); // Max 10 navegadores
await pool.initialize();

// Adquirir página del pool
const page = await pool.acquirePage();

try {
  await page.goto('https://example.com');
  const content = await page.content();
  
  // Tu lógica de scraping...
  
} finally {
  // Liberar página de vuelta al pool
  await pool.releasePage(page);
}

// Métricas en tiempo real
const metrics = pool.getMetrics();
console.log(`Navegadores activos: ${metrics.browserCount}`);
console.log(`Páginas totales: ${metrics.totalPages}`);
console.log(`Requests exitosos: ${metrics.successfulRequests}`);

// Cerrar pool cuando termines
await pool.close();
```

**Configuración Avanzada:**
```typescript
import { BrowserPool } from 'ultra-scraper';

const pool = new BrowserPool({
  minBrowsers: 2,
  maxBrowsers: 10,
  maxPagesPerBrowser: 5,
  browserType: 'chromium',
  autoScale: true,
  scaleUpThreshold: 0.8,
  scaleDownThreshold: 0.2,
  launchOptions: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});
```

### Sistema de Colas

Gestión avanzada de tareas con prioridades y persistencia:
```typescript
import { createQueue, TaskPriority } from 'ultra-scraper';

const queue = createQueue(5); // 5 tareas concurrentes

// Agregar tarea con prioridad ALTA
await queue.add({
  id: 'scrape-homepage',
  priority: TaskPriority.HIGH,
  execute: async () => {
    const scraper = createScraper();
    return await scraper.get('https://example.com');
  }
});

// Agregar tarea CRÍTICA (se ejecuta primero)
await queue.add({
  id: 'scrape-urgent',
  priority: TaskPriority.CRITICAL,
  execute: async () => {
    return await scraper.get('https://urgent.example.com');
  }
});

// Agregar múltiples tareas con delay
const urls = ['https://example.com/page1', 'https://example.com/page2'];
const tasks = urls.map(url => ({
  id: `scrape-${url}`,
  execute: async () => await scraper.get(url)
}));

await queue.addBatch(tasks, 500); // 500ms de delay entre tareas

// Eventos
queue.on('taskCompleted', (event) => {
  console.log(`✅ Completado: ${event.taskId} en ${event.duration}ms`);
});

queue.on('taskError', (event) => {
  console.error(`❌ Error: ${event.taskId}`, event.error);
});

// Métricas
const metrics = queue.getMetrics();
console.log(`Procesadas: ${metrics.totalProcessed}`);
console.log(`Fallidas: ${metrics.totalFailed}`);
console.log(`Tasa de éxito: ${(1 - metrics.totalFailed / metrics.totalProcessed) * 100}%`);
```

**Queue Scheduler - Tareas Programadas:**
```typescript
import { QueueScheduler, CronBuilder } from 'ultra-scraper';

const scheduler = new QueueScheduler(queue);

// Ejecutar cada 5 minutos
scheduler.schedule(
  'periodic-scrape',
  'Scraping periódico de precios',
  () => ({
    id: `price-check-${Date.now()}`,
    execute: async () => await scraper.extract('https://shop.com/products', schema)
  }),
  {
    type: 'interval',
    interval: 5 * 60 * 1000
  }
);

// Todos los días a las 2 AM
scheduler.schedule(
  'daily-scrape',
  'Scraping diario',
  () => ({ execute: async () => await fullSiteScrape() }),
  {
    type: 'cron',
    cronExpression: CronBuilder.everyDay(2, 0)
  }
);

// Horario de oficina - Lunes a Viernes, 9 AM a 5 PM
scheduler.schedule(
  'business-hours-scrape',
  'Scraping en horario laboral',
  () => ({ execute: async () => await scraper.get('https://business.com') }),
  {
    type: 'cron',
    cronExpression: '0 9-17 * * 1-5'
  }
);
```

### Anti-Bot Detection

Detección y evasión automática de protecciones anti-bot:
```typescript
import { 
  AntiBotDetector, 
  StealthMode, 
  BotBehaviorSimulator 
} from 'ultra-scraper';
import { chromium } from 'playwright';

// Configuración completa
const detector = new AntiBotDetector({
  enableAutoDetection: true,
  enableAutoBypass: true,
  
  cloudflare: {
    enabled: true,
    waitForChallenge: true,
    maxWaitTime: 30000
  },
  
  captcha: {
    enabled: true,
    autoSolve: true,
    provider: '2captcha',
    apiKey: 'YOUR_2CAPTCHA_KEY'
  },
  
  fingerprint: {
    enabled: true,
    rotateOnBlock: true
  },
  
  humanBehavior: {
    enabled: true,
    mouseMovements: true,
    randomScrolling: true
  },
  
  stealth: {
    enabled: true,
    hideWebdriver: true
  }
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Aplicar stealth mode
const stealthMode = new StealthMode({ enabled: true });
await stealthMode.apply(page);

// Navegar con comportamiento humano
const behaviorSim = new BotBehaviorSimulator({ enabled: true });
await page.goto('https://protected-site.com');

// Detectar bloqueos
const block = await detector.detectBlock(page);
if (block) {
  console.log(`Bloqueado: ${block.type}`);
}

// Simular comportamiento humano
await behaviorSim.simulatePageView(page);
await behaviorSim.simulateClick(page, '.button');
```

### Rate Limiting

Control preciso de velocidad de requests:
```typescript
import { RateLimiter } from 'ultra-scraper';

// Estrategia Token Bucket
const limiter = new RateLimiter({
  requestsPerSecond: 10,
  burst: 20,
  strategy: 'token-bucket',
  adaptive: {
    enabled: true,
    targetErrorRate: 0.1,
    increaseStep: 1,
    decreaseStep: 2
  }
});

// Uso
await limiter.acquire();
const response = await fetch('https://api.example.com/data');
if (response.ok) limiter.recordSuccess();
else limiter.recordError();

// Estadísticas
const stats = limiter.getStats();
console.log(`Tasa actual: ${stats.currentRate} req/s`);
```

### Load Balancing

Distribución inteligente de carga:
```typescript
import { LoadBalancer } from 'ultra-scraper';

const balancer = new LoadBalancer({
  strategy: 'least-connections',
  healthCheck: { enabled: true, interval: 10000 }
});

// Agregar targets (proxies, mirrors, etc.)
balancer.addTarget({
  id: 'proxy-1',
  url: 'http://proxy1.com:8080',
  weight: 2
});

// Ejecutar con balanceo automático
const result = await balancer.executeRequest(
  async (target) => {
    const scraper = createScraper({ proxy: target.url });
    return await scraper.get('https://target-site.com');
  }
);

// Estadísticas
const stats = balancer.getAllStats();
console.log(`Tasa de éxito: ${stats.successRate * 100}%`);
```

### Concurrency Manager

Gestión inteligente con auto-scaling:
```typescript
import { ConcurrencyManager } from 'ultra-scraper';

const manager = new ConcurrencyManager({
  maxConcurrent: 10,
  adaptiveScaling: {
    enabled: true,
    minConcurrent: 2,
    maxConcurrent: 50
  }
});

// Ejecutar múltiples tareas
const urls = Array.from({ length: 100 }, (_, i) => `https://example.com/page${i}`);

const results = await manager.executeMany(
  urls.map((url, i) => ({
    id: `scrape-${i}`,
    execute: async () => await scraper.get(url)
  }))
);

// Eventos de scaling
manager.on('scaledUp', (event) => {
  console.log(`📈 Scaled to ${event.newConcurrency}`);
});

// Métricas
const metrics = manager.getMetrics();
console.log(`Tasa de éxito: ${metrics.successRate * 100}%`);
```

---

## 🧩 Plugins

### Plugins Incluidos

#### Rotación de Proxys
```typescript
import { createScraper } from "ultra-scraper";
import { proxyRotation } from "ultra-scraper/plugins";

const scraper = createScraper();

scraper.use(proxyRotation({
  proxies: [
    "http://proxy1.com:8080",
    "http://proxy2.com:8080",
    "http://proxy3.com:8080"
  ],
  rotateOnError: true
}));

// Los proxies se rotarán automáticamente
await scraper.get("https://example.com");
```

#### User-Agent Aleatorio
```typescript
import { randomUserAgent } from "ultra-scraper/plugins";

scraper.use(randomUserAgent({
  browsers: ['chrome', 'firefox', 'safari'],
  devices: ['desktop', 'mobile']
}));
```

#### Rate Limit
```typescript
import { rateLimit } from "ultra-scraper/plugins";

scraper.use(rateLimit({
  maxRequests: 5,
  windowMs: 1000 // 5 requests por segundo
}));
```

#### Retry Automático
```typescript
import { retry } from "ultra-scraper/plugins";

scraper.use(retry({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
}));
```

### Plugin Personalizado
```typescript
import { ScraperPlugin } from "ultra-scraper";

const customPlugin: ScraperPlugin = {
  name: "custom-logger",
  
  beforeRequest: async (config) => {
    console.log(`🚀 Request to: ${config.url}`);
    config.headers = { ...config.headers, 'X-Custom': 'value' };
    return config;
  },
  
  afterRequest: async (response) => {
    console.log(`✅ Response: ${response.status}`);
    return response;
  },
  
  onError: async (error) => {
    console.error(`❌ Error:`, error.message);
  }
};

scraper.use(customPlugin);
```

---

## 💡 Ejemplos Completos

### E-commerce Price Monitor
```typescript
import { createScraper, createQueue, QueueScheduler, CronBuilder } from 'ultra-scraper';

class PriceMonitor {
  private scraper = createScraper({ dynamic: true });
  private queue = createQueue(5);
  private scheduler = new QueueScheduler(this.queue);

  constructor() {
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.queue.on('taskCompleted', (event) => {
      if (event.result.priceChanged) {
        this.sendAlert(event.result);
      }
    });
  }

  async monitorProduct(url: string, targetPrice: number) {
    this.scheduler.schedule(
      `monitor-${url}`,
      `Price monitoring`,
      () => ({
        execute: async () => {
          const [product] = await this.scraper.extract(url, {
            selector: '.product',
            fields: {
              name: { selector: '.title', attr: 'text' },
              price: { 
                selector: '.price', 
                attr: 'text',
                transform: (v) => parseFloat(v.replace(/[$,]/g, ''))
              }
            }
          });

          return {
            product: product.name,
            currentPrice: product.price,
            priceChanged: product.price <= targetPrice
          };
        }
      }),
      {
        type: 'cron',
        cronExpression: CronBuilder.custom('0', '*', '*', '*', '*') // Cada hora
      }
    );
  }

  sendAlert(data: any) {
    console.log('🔔 PRICE ALERT!');
    console.log(`${data.product}: $${data.currentPrice}`);
  }

  async start() {
    await this.monitorProduct('https://shop.com/laptop', 999);
    await this.monitorProduct('https://shop.com/phone', 699);
    console.log('📊 Price monitor started!');
  }
}

const monitor = new PriceMonitor();
await monitor.start();
```

### News Aggregator con Load Balancing
```typescript
import { createScraper, LoadBalancer, RateLimiter } from 'ultra-scraper';

class NewsAggregator {
  private scraper = createScraper();
  private balancer = new LoadBalancer({ strategy: 'least-response-time' });
  private limiter = new RateLimiter({ requestsPerSecond: 5 });

  constructor() {
    // Agregar proxies
    ['proxy1', 'proxy2', 'proxy3'].forEach((name, i) => {
      this.balancer.addTarget({
        id: name,
        url: `http://${name}.example.com:8080`,
        weight: i + 1
      });
    });
  }

  async scrapeSource(url: string, schema: any) {
    await this.limiter.acquire();
    
    return await this.balancer.executeRequest(async (target) => {
      const scraper = createScraper({ proxy: target.url });
      return await scraper.extract(url, schema);
    });
  }

  async aggregateNews() {
    const sources = [
      { name: 'TechNews', url: 'https://tech.example.com', schema: {...} },
      { name: 'Business', url: 'https://business.example.com', schema: {...} }
    ];

    const allArticles = [];

    for (const source of sources) {
      try {
        const articles = await this.scrapeSource(source.url, source.schema);
        allArticles.push(...articles);
        console.log(`✅ ${source.name}: ${articles.length} articles`);
      } catch (error) {
        console.error(`❌ ${source.name}:`, error);
      }
    }

    return allArticles;
  }
}

const aggregator = new NewsAggregator();
const articles = await aggregator.aggregateNews();
console.log(`Total: ${articles.length} articles`);
```

---

## 📖 API Reference

### Factory Functions

| Función | Descripción | Ejemplo |
|---------|-------------|---------|
| `createScraper(options?)` | Crea instancia de Scraper | `createScraper({ dynamic: true })` |
| `createQueue(concurrency?)` | Crea TaskQueue | `createQueue(5)` |
| `createBrowserPool(max?)` | Crea BrowserPool | `createBrowserPool(10)` |
| `createExponentialBackoff()` | Crea BackoffStrategy | `createExponentialBackoff(1000, 30000)` |
| `createCircuitBreaker()` | Crea CircuitBreaker | `createCircuitBreaker(5, 60000)` |
| `createRetryStrategy()` | Crea RetryStrategy | `createRetryStrategy(3)` |

### Core Classes

#### Scraper

| Método | Descripción | Retorna |
|--------|-------------|---------|
| `get(url, options?)` | Obtiene HTML | `Promise<ScraperResponse>` |
| `query(url, selector, options?)` | Obtiene Cheerio API | `Promise<CheerioAPI>` |
| `extract(url, schema, options?)` | Extrae datos estructurados | `Promise<any[]>` |
| `use(plugin)` | Registra un plugin | `void` |

#### BrowserPool

| Método | Descripción |
|--------|-------------|
| `initialize()` | Inicializa el pool |
| `acquirePage()` | Obtiene página |
| `releasePage(page)` | Libera página |
| `getMetrics()` | Obtiene métricas |
| `close()` | Cierra el pool |

#### TaskQueue

| Método | Descripción |
|--------|-------------|
| `add(task)` | Agrega tarea |
| `addBatch(tasks, delay?)` | Agrega múltiples |
| `pause()` | Pausa procesamiento |
| `resume()` | Reanuda |
| `getMetrics()` | Obtiene métricas |
| `shutdown()` | Apaga gracefully |

---

## 🧪 Testing
```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Cobertura de código
npm run test:coverage

# Tests específicos
npm test -- --grep "BrowserPool"
```

---

## 🐛 Troubleshooting

### Error: "playwright not installed"
```bash
npm install playwright
npx playwright install chromium
```

### Rate limit exceeded
```typescript
const scraper = createScraper({
  timeout: 60000,
  retries: 5
});
```

### Cloudflare Challenge no resuelve
```typescript
const detector = new AntiBotDetector({
  cloudflare: {
    maxWaitTime: 60000 // Aumentar a 60s
  }
});
```

### Memory leaks
```typescript
const pool = createBrowserPool(5);
try {
  const page = await pool.acquirePage();
  // ... tu código
} finally {
  await pool.releasePage(page); // Siempre liberar
}
```

---

## 📝 Changelog

### v1.1.0 (2025-01-02) - MAJOR UPDATE

#### 🎉 Nuevas Características
- ✅ Browser Pool System con auto-scaling
- ✅ Advanced Queue System (4 prioridades, persistencia)
- ✅ Anti-Bot Detection PRO (Cloudflare, CAPTCHA)
- ✅ Concurrency Manager con adaptive scaling
- ✅ Rate Limiter (4 estrategias)
- ✅ Load Balancer (6 estrategias)
- ✅ Circuit Breaker pattern
- ✅ Monitoring & Analytics

#### 🔧 Mejoras
- TypeScript 5.9.3
- Tests 67% coverage
- CI/CD GitHub Actions
- 30+ ejemplos

#### 🐛 Correcciones
- 66 errores TypeScript
- Tipos DOM
- Memory leaks
- Race conditions

### v1.0.3 (2024-12-15)
- Primera versión estable

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add: nueva característica'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Abre Pull Request

### Desarrollo Local
```bash
git clone https://github.com/Brashkie/ultra-scraper.git
cd ultra-scraper
npm install
npm run build
npm test
```

---

## 📝 Roadmap

- [ ] Soporte para WebSockets
- [ ] Integración con bases de datos
- [ ] Cache inteligente de respuestas
- [ ] CAPTCHA solving con IA
- [ ] CLI para scraping desde terminal
- [ ] Dashboard de monitoreo web
- [ ] Integración con LangChain
- [ ] Scraping de archivos PDF
- [ ] API REST para scraping remoto

---

## 📄 Licencia

Apache-2.0 License - ver [LICENSE](LICENSE)

Copyright © 2025 [Hepein Oficial](https://github.com/Brashkie)

---

## 🙏 Agradecimientos

- [Playwright](https://playwright.dev/) - Browser automation
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Axios](https://axios-http.com/) - HTTP client
- Comunidad open source

---

## 📞 Soporte

- 📧 Email: support@ultra-scraper.com
- 🐛 Issues: [GitHub Issues](https://github.com/Brashkie/ultra-scraper/issues)
- 📖 Docs: [Documentation](https://github.com/Brashkie/ultra-scraper/wiki)

---

## 🔗 Enlaces

- [NPM Package](https://www.npmjs.com/package/ultra-scraper)
- [GitHub](https://github.com/Brashkie/ultra-scraper)
- [Changelog](https://github.com/Brashkie/ultra-scraper/releases)
- [Contributing Guide](CONTRIBUTING.md)

---

<div align="center">

**[⬆ Volver arriba](#-ultra-scraper)**

Hecho con ❤️ por [Hepein Oficial](https://github.com/Brashkie)

⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!

</div>
