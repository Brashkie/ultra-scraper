# 🚀 Ultra Scraper

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)
![Tests](https://img.shields.io/badge/tests-passing-success.svg)
![Coverage](https://img.shields.io/badge/coverage-67%25-yellow.svg)

**Sistema profesional de web scraping con capacidades anti-bot, gestión de concurrencia y extracción inteligente**

[Características](#-características) •
[Instalación](#-instalación) •
[Guía Rápida](#-guía-rápida) •
[Documentación](#-documentación) •
[Ejemplos](#-ejemplos) •
[API](#-api-reference)

</div>

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Instalación](#-instalación)
- [Guía Rápida](#-guía-rápida)
- [Características Avanzadas](#-características-avanzadas)
  - [Browser Pool](#browser-pool)
  - [Sistema de Colas](#sistema-de-colas)
  - [Anti-Bot Detection](#anti-bot-detection)
  - [Rate Limiting](#rate-limiting)
  - [Load Balancing](#load-balancing)
- [Ejemplos Completos](#-ejemplos-completos)
- [Plugins](#-plugins)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)
- [Changelog](#-changelog)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## ✨ Características

### 🎯 **Core Features**
- ✅ **Scraping HTTP y Dinámico** - Soporte para sitios estáticos (Cheerio) y SPAs (Playwright)
- ✅ **TypeScript Completo** - 100% type-safe con IntelliSense completo
- ✅ **Sistema de Plugins** - Arquitectura extensible con middleware
- ✅ **Extracción Estructurada** - Schemas declarativos para datos complejos
- ✅ **Manejo de Errores Robusto** - Retry automático con backoff exponencial

### 🚀 **Características Avanzadas v1.1.0**

#### 🌐 **Browser Pool Pro**
- Pool automático de navegadores con auto-scaling
- Health monitoring en tiempo real
- Estrategias: Round-robin, Least-used
- Recuperación automática de crashes

#### 📋 **Sistema de Colas Avanzado**
- 4 niveles de prioridad (CRITICAL, HIGH, NORMAL, LOW)
- Persistencia en disco con backups automáticos
- Dead Letter Queue para tareas fallidas
- Scheduler con soporte cron, interval, delayed

#### 🛡️ **Anti-Bot Detection PRO**
- Detección automática de Cloudflare (v1/v2/Turnstile)
- Soporte para reCAPTCHA v2/v3, hCaptcha, FunCaptcha, GeeTest
- Fingerprint management con perfiles realistas
- 13 técnicas de evasión stealth
- Simulación de comportamiento humano

#### ⚡ **Gestión de Concurrencia**
- ConcurrencyManager con adaptive scaling
- RateLimiter con 4 estrategias (fixed-window, sliding-window, token-bucket, leaky-bucket)
- LoadBalancer con 6 estrategias de distribución
- ThrottleManager inteligente

---

## 📦 Instalación
```bash
# Todo en uno
npm install ultra-scraper

# Instalar navegadores de Playwright (requerido para scraping dinámico)
npx playwright install chromium
```

**Nota:** Si solo usarás scraping HTTP (sin JavaScript), puedes omitir la instalación de navegadores.

---

## 🚀 Guía Rápida

### Ejemplo Básico - HTTP Scraping
```typescript
import { Scraper } from 'ultra-scraper';

const scraper = new Scraper();

// Obtener HTML completo
const response = await scraper.get('https://example.com');
console.log(response.html);
console.log(response.status); // 200
console.log(response.responseTime); // 245ms

// Consultar con selector CSS
const $ = await scraper.query('https://example.com', 'body');
const title = $('h1').text();
console.log(title);
```

### Extracción Estructurada
```typescript
import { Scraper } from 'ultra-scraper';

const scraper = new Scraper();

const products = await scraper.extract('https://shop.example.com/products', {
  selector: '.product-card',
  fields: {
    title: { selector: '.title', attr: 'text' },
    price: { 
      selector: '.price', 
      attr: 'text',
      transform: (val) => parseFloat(val.replace('$', ''))
    },
    image: { selector: 'img', attr: 'src' },
    url: { selector: 'a', attr: 'href' },
    inStock: { 
      selector: '.stock', 
      attr: 'text',
      transform: (val) => val === 'In Stock'
    }
  },
  limit: 50
});

console.log(products);
/*
[
  {
    title: "Product 1",
    price: 29.99,
    image: "https://...",
    url: "/product/1",
    inStock: true
  },
  ...
]
*/
```

### Scraping Dinámico (SPAs)
```typescript
const scraper = new Scraper({ dynamic: true });

// Esperar por selector específico
const response = await scraper.get('https://spa.example.com', {
  waitForSelector: '.content-loaded',
  waitTime: 2000 // Esperar 2 segundos adicionales
});

// Extraer datos renderizados con JavaScript
const data = await scraper.extract('https://spa.example.com/products', {
  selector: '.dynamic-product',
  fields: {
    name: { selector: '.name', attr: 'text' },
    rating: { selector: '.rating', attr: 'data-score' }
  }
});
```

---

## 🎓 Características Avanzadas

### Browser Pool

Gestión automática de múltiples navegadores para scraping paralelo eficiente:
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
    args: ['--no-sandbox']
  }
});

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

### Sistema de Colas

Gestión avanzada de tareas con prioridades y persistencia:
```typescript
import { TaskQueue, TaskPriority } from 'ultra-scraper';

const queue = new TaskQueue({
  concurrency: 5,
  maxQueueSize: 1000,
  enablePersistence: true,
  persistencePath: './scraping-queue.json',
  enableDeadLetter: true,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
});

// Agregar tarea con prioridad ALTA
await queue.add({
  id: 'scrape-homepage',
  priority: TaskPriority.HIGH,
  execute: async () => {
    const scraper = new Scraper();
    return await scraper.get('https://example.com');
  }
});

// Agregar tarea CRÍTICA
await queue.add({
  id: 'scrape-urgent',
  priority: TaskPriority.CRITICAL,
  execute: async () => {
    // Esta tarea se ejecutará antes que las de prioridad normal/baja
    return await scraper.get('https://urgent.example.com');
  }
});

// Agregar múltiples tareas con delay
const urls = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3'
];

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
console.log(`Tasa de éxito: ${(metrics.totalProcessed - metrics.totalFailed) / metrics.totalProcessed * 100}%`);

// Shutdown graceful
await queue.shutdown();
```

### Queue Scheduler - Tareas Programadas
```typescript
import { TaskQueue, QueueScheduler, CronBuilder } from 'ultra-scraper';

const queue = new TaskQueue({
  concurrency: 3,
  maxQueueSize: 500,
  enablePersistence: true
});

const scheduler = new QueueScheduler(queue);

// 1. Ejecutar una vez en el futuro
scheduler.schedule(
  'scrape-once',
  'Scrape especial de navidad',
  () => ({
    id: 'christmas-scrape',
    execute: async () => {
      return await scraper.get('https://sales.example.com');
    }
  }),
  {
    type: 'once',
    executeAt: new Date('2025-12-25 00:00:00')
  }
);

// 2. Ejecutar cada 5 minutos
scheduler.schedule(
  'periodic-scrape',
  'Scraping periódico de precios',
  () => ({
    id: `price-check-${Date.now()}`,
    execute: async () => {
      return await scraper.extract('https://shop.com/products', priceSchema);
    }
  }),
  {
    type: 'interval',
    interval: 5 * 60 * 1000, // 5 minutos
    maxExecutions: 100 // Detener después de 100 ejecuciones
  }
);

// 3. Ejecutar con cron - Todos los días a las 2 AM
scheduler.schedule(
  'daily-scrape',
  'Scraping diario completo',
  () => ({
    id: `daily-${new Date().toISOString()}`,
    execute: async () => {
      // Scraping intensivo
      return await fullSiteScrape();
    }
  }),
  {
    type: 'cron',
    cronExpression: CronBuilder.everyDay(2, 0), // 2:00 AM
    priority: TaskPriority.HIGH,
    retryOnError: true,
    maxRetries: 3
  }
);

// 4. Horario de oficina - Lunes a Viernes, 9 AM a 5 PM
scheduler.schedule(
  'business-hours-scrape',
  'Scraping en horario laboral',
  () => ({
    id: `business-${Date.now()}`,
    execute: async () => {
      return await scraper.get('https://business.example.com');
    }
  }),
  {
    type: 'cron',
    cronExpression: '0 9-17 * * 1-5', // Cada hora de 9-17, Lun-Vie
    priority: TaskPriority.NORMAL
  }
);

// Obtener estadísticas
const stats = scheduler.getAllStats();
console.log(`Tareas programadas: ${stats.totalTasks}`);
console.log(`Tareas activas: ${stats.enabledTasks}`);
console.log(`Total de ejecuciones: ${stats.totalExecutions}`);

// Trigger manual
await scheduler.trigger('daily-scrape');

// Deshabilitar/habilitar
scheduler.disableTask('periodic-scrape');
scheduler.enableTask('periodic-scrape');
```

### Anti-Bot Detection

Detección y evasión automática de protecciones anti-bot:
```typescript
import { 
  AntiBotDetector, 
  StealthMode, 
  BotBehaviorSimulator,
  FingerprintManager 
} from 'ultra-scraper';

// Configuración completa
const detector = new AntiBotDetector({
  enableAutoDetection: true,
  enableAutoBypass: true,
  maxBypassAttempts: 3,
  
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
    rotateOnBlock: true,
    consistentSession: true
  },
  
  humanBehavior: {
    enabled: true,
    mouseMovements: true,
    randomScrolling: true,
    randomDelays: true,
    typingSpeed: 10
  },
  
  stealth: {
    enabled: true,
    hideWebdriver: true,
    hideAutomation: true,
    spoofPermissions: true,
    spoofWebGL: true,
    spoofCanvas: true
  }
});

// Uso con Playwright
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Aplicar stealth mode
const stealthMode = new StealthMode({
  enabled: true,
  hideWebdriver: true,
  hideAutomation: true,
  spoofPermissions: true
});

await stealthMode.apply(page);

// Aplicar fingerprint realista
const fingerprintManager = detector.getFingerprintManager();
const fingerprint = fingerprintManager.generateFingerprint();
await fingerprintManager.applyFingerprint(page, fingerprint);

// Navegar con comportamiento humano
const behaviorSim = new BotBehaviorSimulator({
  enabled: true,
  mouseMovements: true,
  randomScrolling: true,
  randomDelays: true,
  typingSpeed: 10
});

await page.goto('https://protected-site.com');

// Detectar bloqueos
const blockDetection = await detector.detectBlock(page);

if (blockDetection) {
  console.log(`Bloqueo detectado: ${blockDetection.type}`);
  console.log(`Confianza: ${blockDetection.confidence * 100}%`);
  
  // Auto-bypass si está habilitado
  // O implementar tu propia lógica
}

// Simular comportamiento humano
await behaviorSim.simulatePageView(page);

// Hacer click como humano
await behaviorSim.simulateClick(page, '.button');

// Llenar formulario como humano
await behaviorSim.simulateFormFilling(page, [
  { selector: '#email', value: 'user@example.com' },
  { selector: '#password', value: 'securepass123' }
]);

await browser.close();
```

### Rate Limiting Avanzado

Control preciso de velocidad de requests:
```typescript
import { RateLimiter } from 'ultra-scraper';

// Estrategia Token Bucket - Permite bursts
const limiter = new RateLimiter({
  requestsPerSecond: 10,
  burst: 20, // Permite hasta 20 requests instantáneos
  strategy: 'token-bucket',
  adaptive: {
    enabled: true,
    targetErrorRate: 0.1, // 10% de errores
    increaseStep: 1,
    decreaseStep: 2,
    minRate: 1,
    maxRate: 50
  }
});

// Uso básico
await limiter.acquire(); // Espera si es necesario
const response = await fetch('https://api.example.com/data');

if (response.ok) {
  limiter.recordSuccess();
} else {
  limiter.recordError();
}

// Rate limiting por dominio
await limiter.acquireForDomain('example.com');
await limiter.acquireForDomain('api.example.com');

// Estadísticas
const stats = limiter.getStats();
console.log(`Tasa actual: ${stats.currentRate} req/s`);
console.log(`Tokens disponibles: ${stats.tokenBucket?.tokens}`);
```

### Load Balancing

Distribución inteligente de carga entre múltiples targets:
```typescript
import { LoadBalancer, Target } from 'ultra-scraper';

const loadBalancer = new LoadBalancer({
  strategy: 'least-connections',
  healthCheck: {
    enabled: true,
    interval: 10000, // Cada 10 segundos
    timeout: 5000,
    unhealthyThreshold: 3,
    healthyThreshold: 2
  },
  stickySession: {
    enabled: true,
    ttl: 3600000 // 1 hora
  }
});

// Agregar targets (proxies, mirrors, APIs, etc.)
loadBalancer.addTarget({
  id: 'proxy-1',
  url: 'http://proxy1.example.com:8080',
  weight: 2, // Mayor peso = más requests
  maxConnections: 50
});

loadBalancer.addTarget({
  id: 'proxy-2',
  url: 'http://proxy2.example.com:8080',
  weight: 1,
  maxConnections: 30
});

loadBalancer.addTarget({
  id: 'proxy-3',
  url: 'http://proxy3.example.com:8080',
  weight: 3,
  maxConnections: 100
});

// Ejecutar request con balanceo automático
const result = await loadBalancer.executeRequest(
  async (target) => {
    const scraper = new Scraper({ proxy: target.url });
    return await scraper.get('https://target-site.com');
  },
  'user-123' // Session key para sticky sessions
);

// Estadísticas por target
const allStats = loadBalancer.getAllStats();
console.log(`Total requests: ${allStats.totalRequests}`);
console.log(`Tasa de éxito: ${allStats.successRate * 100}%`);
console.log(`Targets saludables: ${allStats.activeTargets}/${allStats.totalTargets}`);

// Estadísticas individuales
const stats = loadBalancer.getStats('proxy-1');
console.log(`Proxy 1 - Conexiones activas: ${stats?.activeConnections}`);
console.log(`Proxy 1 - Tiempo promedio: ${stats?.avgResponseTime}ms`);
```

### Concurrency Manager

Gestión inteligente de tareas concurrentes con auto-scaling:
```typescript
import { ConcurrencyManager } from 'ultra-scraper';

const manager = new ConcurrencyManager({
  maxConcurrent: 10,
  queueSize: 1000,
  timeout: 30000,
  priority: true,
  adaptiveScaling: {
    enabled: true,
    minConcurrent: 2,
    maxConcurrent: 50,
    scaleUpThreshold: 0.9, // 90% de éxito
    scaleDownThreshold: 0.7, // 70% de éxito
    evaluationWindow: 10000 // Evaluar cada 10s
  }
});

// Ejecutar tarea única
const result = await manager.execute({
  id: 'task-1',
  priority: 1,
  execute: async () => {
    return await scraper.get('https://example.com');
  }
});

// Ejecutar múltiples tareas en paralelo
const urls = Array.from({ length: 100 }, (_, i) => 
  `https://example.com/page${i + 1}`
);

const results = await manager.executeMany(
  urls.map((url, i) => ({
    id: `scrape-${i}`,
    priority: Math.random() > 0.5 ? 1 : 2,
    execute: async () => await scraper.get(url)
  }))
);

// Ejecutar en batches con control fino
const batchResults = await manager.executeBatch(
  urls.map((url, i) => ({
    id: `batch-${i}`,
    execute: async () => await scraper.get(url)
  })),
  {
    batchSize: 10,
    delayBetweenBatches: 1000,
    stopOnError: false
  }
);

// Eventos de scaling
manager.on('scaledUp', (event) => {
  console.log(`📈 Scaled up to ${event.newConcurrency} concurrent tasks`);
});

manager.on('scaledDown', (event) => {
  console.log(`📉 Scaled down to ${event.newConcurrency} concurrent tasks`);
});

// Métricas
const metrics = manager.getMetrics();
console.log(`Concurrencia actual: ${metrics.currentConcurrency}`);
console.log(`Tareas activas: ${metrics.activeCount}`);
console.log(`Cola: ${metrics.queueSize}`);
console.log(`Tasa de éxito: ${metrics.successRate * 100}%`);
console.log(`Tiempo promedio: ${metrics.avgExecutionTime}ms`);
```

---

## 🎨 Plugins

### Plugins Incluidos

#### 1. Proxy Rotation
```typescript
import { Scraper } from 'ultra-scraper';
import { proxyRotation } from 'ultra-scraper/plugins';

const scraper = new Scraper();

scraper.use(proxyRotation({
  proxies: [
    'http://proxy1.example.com:8080',
    'http://proxy2.example.com:8080',
    'http://proxy3.example.com:8080'
  ],
  rotateOnError: true
}));

// Los proxies se rotarán automáticamente
const response = await scraper.get('https://example.com');
```

#### 2. Random User Agent
```typescript
import { randomUserAgent } from 'ultra-scraper/plugins';

scraper.use(randomUserAgent({
  browsers: ['chrome', 'firefox', 'safari'],
  devices: ['desktop', 'mobile'],
  operatingSystems: ['windows', 'macos', 'linux']
}));
```

#### 3. Rate Limit
```typescript
import { rateLimit } from 'ultra-scraper/plugins';

scraper.use(rateLimit({
  maxRequests: 10,
  windowMs: 1000 // 10 requests por segundo
}));
```

#### 4. Retry
```typescript
import { retry } from 'ultra-scraper/plugins';

scraper.use(retry({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
}));
```

### Crear Plugin Personalizado
```typescript
import { ScraperPlugin } from 'ultra-scraper';

const customPlugin: ScraperPlugin = {
  name: 'custom-logger',
  
  beforeRequest: async (config) => {
    console.log(`🚀 Request to: ${config.url}`);
    
    // Modificar config si es necesario
    config.headers = {
      ...config.headers,
      'X-Custom-Header': 'my-value'
    };
    
    return config;
  },
  
  afterRequest: async (response) => {
    console.log(`✅ Response: ${response.status} in ${response.responseTime}ms`);
    
    // Modificar response si es necesario
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

### E-commerce Price Monitoring
```typescript
import { Scraper, TaskQueue, QueueScheduler, CronBuilder } from 'ultra-scraper';

class PriceMonitor {
  private scraper: Scraper;
  private queue: TaskQueue;
  private scheduler: QueueScheduler;

  constructor() {
    this.scraper = new Scraper({ dynamic: true });
    
    this.queue = new TaskQueue({
      concurrency: 5,
      maxQueueSize: 1000,
      enablePersistence: true,
      persistencePath: './price-monitor-queue.json',
      maxRetries: 3,
      retryDelay: 2000
    });
    
    this.scheduler = new QueueScheduler(this.queue);
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.queue.on('taskCompleted', (event) => {
      console.log(`✅ Monitored: ${event.result.product}`);
      
      // Enviar alerta si el precio bajó
      if (event.result.priceChanged) {
        this.sendPriceAlert(event.result);
      }
    });
  }

  async monitorProduct(url: string, targetPrice: number) {
    // Programar monitoreo cada hora
    this.scheduler.schedule(
      `monitor-${url}`,
      `Price monitoring for ${url}`,
      () => ({
        id: `check-${Date.now()}`,
        execute: async () => {
          const data = await this.scraper.extract(url, {
            selector: '.product',
            fields: {
              name: { selector: '.product-title', attr: 'text' },
              price: { 
                selector: '.price', 
                attr: 'text',
                transform: (val) => parseFloat(val.replace(/[$,]/g, ''))
              },
              inStock: { selector: '.stock-status', attr: 'text' }
            }
          });

          const product = data[0];
          const priceChanged = product.price <= targetPrice;

          return {
            product: product.name,
            currentPrice: product.price,
            targetPrice,
            priceChanged,
            inStock: product.inStock,
            timestamp: new Date().toISOString()
          };
        }
      }),
      {
        type: 'cron',
        cronExpression: CronBuilder.custom('0', '*', '*', '*', '*'), // Cada hora
        priority: 'high' as any,
        retryOnError: true
      }
    );
  }

  sendPriceAlert(data: any) {
    console.log('🔔 PRICE ALERT!');
    console.log(`Product: ${data.product}`);
    console.log(`Current: $${data.currentPrice}`);
    console.log(`Target: $${data.targetPrice}`);
    console.log(`Savings: $${data.targetPrice - data.currentPrice}`);
    
    // Aquí podrías enviar email, SMS, webhook, etc.
  }

  async start() {
    // Monitorear múltiples productos
    await this.monitorProduct('https://shop.com/laptop', 999);
    await this.monitorProduct('https://shop.com/phone', 699);
    await this.monitorProduct('https://shop.com/headphones', 299);
    
    console.log('📊 Price monitor started!');
  }
}

// Uso
const monitor = new PriceMonitor();
await monitor.start();
```

### News Aggregator con Load Balancing
```typescript
import { 
  Scraper, 
  LoadBalancer, 
  RateLimiter,
  TaskQueue 
} from 'ultra-scraper';

class NewsAggregator {
  private scraper: Scraper;
  private loadBalancer: LoadBalancer;
  private rateLimiter: RateLimiter;
  private queue: TaskQueue;

  constructor() {
    this.scraper = new Scraper();
    
    // Setup load balancer con múltiples proxies
    this.loadBalancer = new LoadBalancer({
      strategy: 'least-response-time',
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      }
    });

    // Agregar proxies
    ['proxy1', 'proxy2', 'proxy3'].forEach((name, i) => {
      this.loadBalancer.addTarget({
        id: name,
        url: `http://${name}.example.com:8080`,
        weight: i + 1
      });
    });

    // Rate limiting adaptativo
    this.rateLimiter = new RateLimiter({
      requestsPerSecond: 5,
      strategy: 'token-bucket',
      burst: 10,
      adaptive: {
        enabled: true,
        targetErrorRate: 0.05,
        increaseStep: 1,
        decreaseStep: 2,
        minRate: 1,
        maxRate: 20
      }
    });

    // Queue para procesar artículos
    this.queue = new TaskQueue({
      concurrency: 10,
      maxQueueSize: 5000,
      enablePersistence: true
    });
  }

  async scrapeNewsSource(sourceUrl: string, schema: any) {
    // Adquirir rate limit
    await this.rateLimiter.acquire();

    // Ejecutar con load balancing
    const articles = await this.loadBalancer.executeRequest(
      async (target) => {
        const scraper = new Scraper({ proxy: target.url });
        return await scraper.extract(sourceUrl, schema);
      }
    );

    this.rateLimiter.recordSuccess();
    return articles;
  }

  async aggregateNews() {
    const sources = [
      {
        name: 'TechNews',
        url: 'https://technews.example.com',
        schema: {
          selector: '.article',
          fields: {
            title: { selector: 'h2', attr: 'text' },
            summary: { selector: '.summary', attr: 'text' },
            url: { selector: 'a', attr: 'href' },
            author: { selector: '.author', attr: 'text' },
            date: { selector: '.date', attr: 'text' }
          },
          limit: 20
        }
      },
      {
        name: 'BusinessDaily',
        url: 'https://business.example.com',
        schema: {
          selector: '.news-item',
          fields: {
            title: { selector: '.headline', attr: 'text' },
            summary: { selector: '.description', attr: 'text' },
            url: { selector: 'a', attr: 'href' }
          }
        }
      }
    ];

    const allArticles = [];

    for (const source of sources) {
      try {
        console.log(`📰 Scraping ${source.name}...`);
        const articles = await this.scrapeNewsSource(source.url, source.schema);
        
        articles.forEach(article => {
          article.source = source.name;
        });

        allArticles.push(...articles);
        console.log(`✅ ${source.name}: ${articles.length} articles`);
        
      } catch (error) {
        console.error(`❌ Error scraping ${source.name}:`, error);
        this.rateLimiter.recordError();
      }
    }

    return allArticles;
  }

  getStats() {
    return {
      loadBalancer: this.loadBalancer.getAllStats(),
      rateLimiter: this.rateLimiter.getStats(),
      queue: this.queue.getMetrics()
    };
  }
}

// Uso
const aggregator = new NewsAggregator();
const articles = await aggregator.aggregateNews();

console.log(`Total articles: ${articles.length}`);
console.log('Stats:', aggregator.getStats());
```

### Social Media Scraper con Anti-Bot
```typescript
import { 
  Scraper,
  AntiBotDetector,
  StealthMode,
  BotBehaviorSimulator,
  BrowserPool
} from 'ultra-scraper';
import { chromium } from 'playwright';

class SocialMediaScraper {
  private browserPool: BrowserPool;
  private detector: AntiBotDetector;
  private stealth: StealthMode;
  private behavior: BotBehaviorSimulator;

  constructor() {
    this.browserPool = new BrowserPool({
      minBrowsers: 3,
      maxBrowsers: 10,
      maxPagesPerBrowser: 3,
      browserType: 'chromium',
      autoScale: true,
      launchOptions: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security'
        ]
      }
    });

    this.detector = new AntiBotDetector({
      enableAutoDetection: true,
      enableAutoBypass: true,
      cloudflare: {
        enabled: true,
        waitForChallenge: true,
        maxWaitTime: 30000
      },
      stealth: {
        enabled: true,
        hideWebdriver: true,
        hideAutomation: true,
        spoofPermissions: true
      }
    });

    this.stealth = new StealthMode({
      enabled: true,
      hideWebdriver: true,
      hideAutomation: true
    });

    this.behavior = new BotBehaviorSimulator({
      enabled: true,
      mouseMovements: true,
      randomScrolling: true,
      randomDelays: true,
      typingSpeed: 10
    });
  }

  async init() {
    await this.browserPool.initialize();
  }

  async scrapeProfile(username: string) {
    const page = await this.browserPool.acquirePage();

    try {
      // Aplicar stealth mode
      await this.stealth.apply(page);

      // Aplicar fingerprint realista
      const fingerprint = this.detector.getFingerprintManager().generateFingerprint();
      await this.detector.getFingerprintManager().applyFingerprint(page, fingerprint);

      // Navegar al perfil
      await page.goto(`https://socialmedia.example.com/${username}`);

      // Simular comportamiento humano
      await this.behavior.simulatePageView(page);

      // Detectar bloqueos
      const block = await this.detector.detectBlock(page);
      if (block) {
        console.warn(`⚠️ Block detected: ${block.type}`);
        // Intentar bypass...
      }

      // Hacer scroll como humano
      await this.behavior.simulateScrolling(page, {
        direction: 'down',
        distance: 500,
        smooth: true
      });

      // Extraer datos
      const data = await page.evaluate(() => {
        return {
          username: document.querySelector('.username')?.textContent,
          followers: document.querySelector('.followers')?.textContent,
          following: document.querySelector('.following')?.textContent,
          bio: document.querySelector('.bio')?.textContent,
          posts: Array.from(document.querySelectorAll('.post')).map(post => ({
            content: post.querySelector('.content')?.textContent,
            likes: post.querySelector('.likes')?.textContent,
            comments: post.querySelector('.comments')?.textContent
          }))
        };
      });

      return data;

    } finally {
      await this.browserPool.releasePage(page);
    }
  }

  async close() {
    await this.browserPool.close();
  }
}

// Uso
const scraper = new SocialMediaScraper();
await scraper.init();

const profile = await scraper.scrapeProfile('techinfluencer');
console.log(profile);

await scraper.close();
```

---

## 📖 API Reference

### Scraper Class

#### Constructor
```typescript
new Scraper(options?: ScraperOptions)
```

#### Methods

| Método | Descripción | Retorna |
|--------|-------------|---------|
| `get(url, options?)` | Obtiene HTML de una URL | `Promise<ScraperResponse>` |
| `query(url, selector, options?)` | Obtiene Cheerio API | `Promise<CheerioAPI>` |
| `extract(url, schema, options?)` | Extrae datos estructurados | `Promise<any[]>` |
| `use(plugin)` | Registra un plugin | `void` |
| `on(event, listener)` | Escucha eventos | `void` |

### BrowserPool Class

| Método | Descripción |
|--------|-------------|
| `initialize()` | Inicializa el pool |
| `acquirePage()` | Obtiene una página del pool |
| `releasePage(page)` | Libera página al pool |
| `getMetrics()` | Obtiene métricas del pool |
| `close()` | Cierra el pool |

### TaskQueue Class

| Método | Descripción |
|--------|-------------|
| `add(task)` | Agrega tarea a la cola |
| `addBatch(tasks, delay?)` | Agrega múltiples tareas |
| `pause()` | Pausa el procesamiento |
| `resume()` | Reanuda el procesamiento |
| `getMetrics()` | Obtiene métricas |
| `shutdown()` | Apaga la cola gracefully |

---

## 🐛 Troubleshooting

### Error: "playwright not installed"
```bash
npm install playwright
npx playwright install chromium
```

### Error: Rate limit exceeded
```typescript
// Incrementar timeout o reducir concurrencia
const scraper = new Scraper({
  timeout: 60000, // 60 segundos
  retries: 5
});
```

### Cloudflare Challenge no se resuelve
```typescript
// Aumentar tiempo de espera
const detector = new AntiBotDetector({
  cloudflare: {
    enabled: true,
    waitForChallenge: true,
    maxWaitTime: 60000 // 60 segundos
  }
});
```

### Memory leaks en scraping prolongado
```typescript
// Usar BrowserPool con límites
const pool = new BrowserPool({
  maxBrowsers: 5,
  maxPagesPerBrowser: 3
});

// Siempre cerrar recursos
try {
  const page = await pool.acquirePage();
  // ... tu código
} finally {
  await pool.releasePage(page);
}
```

---

## 📝 Changelog

### v1.1.0 (2025-01-02) - MAJOR UPDATE

#### 🎉 Nuevas Características

- ✅ **Browser Pool System** - Gestión automática de navegadores con auto-scaling
- ✅ **Advanced Queue System** - Sistema de colas con 4 niveles de prioridad y persistencia
- ✅ **Queue Scheduler** - Programación de tareas con cron, interval, delayed
- ✅ **Anti-Bot Detection PRO** - Detección de Cloudflare, Captchas, WAF
- ✅ **Fingerprint Management** - Perfiles realistas de navegador
- ✅ **Stealth Mode** - 13 técnicas de evasión anti-detección
- ✅ **Bot Behavior Simulator** - Simulación de comportamiento humano
- ✅ **Concurrency Manager** - Gestión con adaptive scaling
- ✅ **Rate Limiter Advanced** - 4 estrategias (token-bucket, leaky-bucket, etc.)
- ✅ **Load Balancer** - 6 estrategias de distribución de carga
- ✅ **Dead Letter Queue** - Gestión de tareas fallidas

#### 🔧 Mejoras

- Mejorada cobertura de tests (67%)
- TypeScript 5.9.3 con types completos
- CI/CD con GitHub Actions
- Documentación extensa con 20+ ejemplos

#### 🐛 Correcciones

- Corregidos 66 errores de compilación TypeScript
- Solucionados problemas de tipos DOM
- Corregido conflicto de nombres en QueueConfig
- Fixed BrowserPool.waitQueue.size → .length
- Fixed DeadLetterQueue undefined check
- Agregados exports explícitos en types/index.ts

### v1.0.3 (2024-12-15)

- ✅ Primera versión estable
- ✅ Scraping HTTP y dinámico
- ✅ Sistema de plugins
- ✅ Extracción estructurada

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas!

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Desarrollo Local
```bash
# Clonar repositorio
git clone https://github.com/tuusuario/ultra-scraper.git
cd ultra-scraper

# Instalar dependencias
npm install

# Ejecutar tests
npm test

# Ejecutar tests con coverage
npm run test:coverage

# Compilar
npm run build

# Lint
npm run lint
npm run lint:fix
```

---

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles

---

## 🙏 Agradecimientos

- [Playwright](https://playwright.dev/) - Browser automation
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Axios](https://axios-http.com/) - HTTP client
- Comunidad open source

---

## 📞 Soporte

- 📧 Email: support@ultra-scraper.com
- 💬 Discord: [Join our server](https://discord.gg/ultra-scraper)
- 🐛 Issues: [GitHub Issues](https://github.com/tuusuario/ultra-scraper/issues)
- 📖 Docs: [Documentation](https://ultra-scraper.com/docs)

---

<div align="center">

**[⬆ Volver arriba](#-ultra-scraper)**

Hecho con ❤️ por [Hepein Oficial](https://github.com/Brashkie)

⭐ Si te gusta el proyecto, ¡dale una estrella en GitHub!

</div>
