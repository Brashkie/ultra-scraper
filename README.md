<div align="center">

# 🚀 Ultra Scraper

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)
![Build](https://img.shields.io/badge/build-passing-success.svg)

**Sistema profesional de web scraping con capacidades anti-bot, gestión de concurrencia y extracción inteligente**

[Características](#-características) •
[Instalación](#-instalación) •
[Guía Rápida](#-guía-rápida) •
[Documentación](#-documentación-completa) •
[API](#-api-reference) •
[Ejemplos](#-ejemplos)

</div>

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Novedades v1.1.0](#-novedades-v110)
- [Instalación](#-instalación)
- [Guía Rápida](#-guía-rápida)
- [Características Avanzadas](#-características-avanzadas)
- [Plugins](#-plugins)
- [Ejemplos](#-ejemplos)
- [API Reference](#-api-reference)
- [Testing](#-testing)
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

<table>
<tr>
<td width="50%">

#### 🌐 Browser Pool Pro
- Pool automático de navegadores
- Auto-scaling inteligente
- Health monitoring en tiempo real
- Recuperación automática de crashes

#### 📋 Sistema de Colas
- 4 niveles de prioridad
- Persistencia en disco
- Dead Letter Queue
- Scheduler con cron support

</td>
<td width="50%">

#### 🛡️ Anti-Bot Detection PRO
- Detección de Cloudflare
- Soporte CAPTCHA (reCAPTCHA, hCaptcha)
- Fingerprint management
- 13 técnicas de evasión stealth

#### ⚡ Gestión de Concurrencia
- Adaptive scaling
- Rate limiting avanzado
- Load balancing
- Circuit breaker pattern

</td>
</tr>
</table>

---

## 🎉 Novedades v1.1.0

### **Agregado**
- ✅ **Browser Pool System** - Gestión automática de múltiples navegadores
- ✅ **Advanced Queue System** - Sistema de colas con prioridades y persistencia
- ✅ **Anti-Bot Detection** - Detección y evasión de protecciones anti-bot
- ✅ **Concurrency Manager** - Control avanzado de concurrencia
- ✅ **Rate Limiter** - 4 estrategias de rate limiting
- ✅ **Load Balancer** - 6 estrategias de distribución de carga
- ✅ **Circuit Breaker** - Patrón circuit breaker para resiliencia
- ✅ **Monitoring System** - Sistema de métricas y analytics

### **Mejorado**
- 🔧 TypeScript 5.9.3 con types completos
- 🔧 Cobertura de tests mejorada
- 🔧 Documentación extensa con 30+ ejemplos
- 🔧 CI/CD con GitHub Actions

### **Corregido**
- 🐛 66 errores de compilación TypeScript resueltos
- 🐛 Problemas de tipos DOM solucionados
- 🐛 Exports de módulos corregidos

---

## 📦 Instalación
```bash
npm install ultra-scraper
```

### Dependencias
```bash
# Playwright se instala automáticamente
# Para usar scraping dinámico, instalar navegadores:
npx playwright install chromium
```

### Requisitos
- **Node.js** >= 16.0.0
- **npm** >= 7.0.0

---

## 🚀 Guía Rápida

### Scraping Básico
```typescript
import { createScraper } from 'ultra-scraper';

const scraper = createScraper();

// Obtener HTML completo
const response = await scraper.get('https://example.com');
console.log(response.html);
console.log(response.status); // 200
```

### Extracción Estructurada
```typescript
const products = await scraper.extract('https://shop.com/products', {
  selector: '.product-card',
  fields: {
    title: { selector: '.title', attr: 'text' },
    price: { 
      selector: '.price', 
      attr: 'text',
      transform: (val) => parseFloat(val.replace('$', ''))
    },
    image: { selector: 'img', attr: 'src' }
  },
  limit: 50
});

console.log(products);
```

### Scraping Dinámico (SPAs)
```typescript
const scraper = createScraper({ dynamic: true });

const response = await scraper.get('https://spa.example.com', {
  waitForSelector: '.content-loaded',
  waitTime: 2000
});
```

---

## 🎓 Características Avanzadas

### Browser Pool

Gestión automática de múltiples navegadores:
```typescript
import { createBrowserPool } from 'ultra-scraper';

const pool = createBrowserPool(10); // Max 10 navegadores
await pool.initialize();

const page = await pool.acquirePage();
try {
  await page.goto('https://example.com');
  const content = await page.content();
} finally {
  await pool.releasePage(page);
}

// Métricas
const metrics = pool.getMetrics();
console.log(`Navegadores activos: ${metrics.browserCount}`);

await pool.close();
```

### Sistema de Colas
```typescript
import { createQueue, TaskPriority } from 'ultra-scraper';

const queue = createQueue(5); // 5 tareas concurrentes

// Tarea con prioridad ALTA
await queue.add({
  id: 'scrape-homepage',
  priority: TaskPriority.HIGH,
  execute: async () => {
    return await scraper.get('https://example.com');
  }
});

// Eventos
queue.on('taskCompleted', (event) => {
  console.log(`✅ Completado: ${event.taskId}`);
});

// Métricas
const metrics = queue.getMetrics();
console.log(`Procesadas: ${metrics.totalProcessed}`);
```

### Queue Scheduler - Tareas Programadas
```typescript
import { QueueScheduler, CronBuilder } from 'ultra-scraper';

const scheduler = new QueueScheduler(queue);

// Ejecutar cada 5 minutos
scheduler.schedule(
  'periodic-scrape',
  'Scraping periódico',
  () => ({
    id: `check-${Date.now()}`,
    execute: async () => await scraper.get('https://example.com')
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
  () => ({ /* ... */ }),
  {
    type: 'cron',
    cronExpression: CronBuilder.everyDay(2, 0)
  }
);
```

### Anti-Bot Detection
```typescript
import { AntiBotDetector, StealthMode } from 'ultra-scraper';

const detector = new AntiBotDetector({
  enableAutoDetection: true,
  cloudflare: { enabled: true },
  captcha: { 
    enabled: true,
    provider: '2captcha',
    apiKey: 'YOUR_KEY'
  },
  stealth: { enabled: true }
});

// Aplicar stealth mode
const page = await browser.newPage();
await detector.applyAll(page);

await page.goto('https://protected-site.com');

// Detectar bloqueos
const block = await detector.detectBlock(page);
if (block) {
  console.log(`Bloqueado: ${block.type}`);
}
```

### Rate Limiting
```typescript
import { RateLimiter } from 'ultra-scraper';

const limiter = new RateLimiter({
  requestsPerSecond: 10,
  strategy: 'token-bucket',
  burst: 20
});

await limiter.acquire();
const response = await fetch('https://api.example.com');
limiter.recordSuccess();
```

### Load Balancing
```typescript
import { LoadBalancer } from 'ultra-scraper';

const balancer = new LoadBalancer({
  strategy: 'least-connections'
});

balancer.addTarget({
  id: 'proxy-1',
  url: 'http://proxy1.com:8080',
  weight: 2
});

const result = await balancer.executeRequest(
  async (target) => {
    return await scraper.get('https://example.com', {
      proxy: target.url
    });
  }
);
```

### Circuit Breaker
```typescript
import { createCircuitBreaker } from 'ultra-scraper';

const circuit = createCircuitBreaker(5, 30000);

circuit.on('stateChange', (event) => {
  console.log(`Circuit: ${event.to}`);
});

try {
  const result = await circuit.execute(async () => {
    return await scraper.get('https://unstable-api.com');
  });
} catch (error) {
  console.error('Circuit breaker is OPEN');
}
```

---

## 🧩 Plugins

### Plugins Incluidos
```typescript
import { 
  proxyRotation, 
  randomUserAgent, 
  rateLimit 
} from 'ultra-scraper/plugins';

const scraper = createScraper();

// Rotación de proxies
scraper.use(proxyRotation({
  proxies: [
    'http://proxy1.com:8080',
    'http://proxy2.com:8080'
  ]
}));

// User-Agent aleatorio
scraper.use(randomUserAgent());

// Rate limiting
scraper.use(rateLimit({
  maxRequests: 10,
  windowMs: 1000
}));
```

### Plugin Personalizado
```typescript
const customPlugin = {
  name: 'custom-logger',
  beforeRequest: async (config) => {
    console.log(`🚀 Request: ${config.url}`);
    return config;
  },
  afterRequest: async (response) => {
    console.log(`✅ Status: ${response.status}`);
    return response;
  }
};

scraper.use(customPlugin);
```

---

## 💡 Ejemplos

### E-commerce Price Monitor
```typescript
import { createScraper, createQueue, QueueScheduler } from 'ultra-scraper';

const scraper = createScraper({ dynamic: true });
const queue = createQueue(5);
const scheduler = new QueueScheduler(queue);

async function monitorPrice(url, targetPrice) {
  scheduler.schedule(
    `monitor-${url}`,
    `Price monitoring`,
    () => ({
      execute: async () => {
        const data = await scraper.extract(url, {
          selector: '.product',
          fields: {
            name: { selector: '.title', attr: 'text' },
            price: { 
              selector: '.price', 
              attr: 'text',
              transform: (val) => parseFloat(val.replace(/[$,]/g, ''))
            }
          }
        });

        if (data[0].price <= targetPrice) {
          console.log('🔔 PRICE ALERT!');
        }
        return data;
      }
    }),
    {
      type: 'cron',
      cronExpression: '0 * * * *' // Cada hora
    }
  );
}

await monitorPrice('https://shop.com/laptop', 999);
```

### News Aggregator
```typescript
import { createScraper, LoadBalancer, RateLimiter } from 'ultra-scraper';

const scraper = createScraper();
const limiter = new RateLimiter({ requestsPerSecond: 5 });
const balancer = new LoadBalancer({ strategy: 'round-robin' });

async function aggregateNews(sources) {
  const articles = [];

  for (const source of sources) {
    await limiter.acquire();
    
    const data = await scraper.extract(source.url, {
      selector: '.article',
      fields: {
        title: { selector: 'h2', attr: 'text' },
        summary: { selector: '.summary', attr: 'text' }
      }
    });

    articles.push(...data);
  }

  return articles;
}
```

---

## 📖 API Reference

### Factory Functions

| Función | Descripción |
|---------|-------------|
| `createScraper(options?)` | Crea instancia de Scraper |
| `createQueue(concurrency?)` | Crea TaskQueue |
| `createBrowserPool(maxBrowsers?)` | Crea BrowserPool |
| `createExponentialBackoff()` | Crea BackoffStrategy |
| `createCircuitBreaker()` | Crea CircuitBreaker |
| `createRetryStrategy()` | Crea RetryStrategy |

### Core Classes

| Clase | Descripción |
|-------|-------------|
| `Scraper` | Motor principal de scraping |
| `TaskQueue` | Sistema de colas con prioridades |
| `BrowserPool` | Pool de navegadores |
| `RateLimiter` | Control de velocidad |
| `LoadBalancer` | Balanceo de carga |
| `AntiBotDetector` | Detección anti-bot |

### Types Principales
```typescript
import { 
  Task,
  TaskPriority,
  QueueConfig,
  BrowserPoolConfig,
  AntiBotConfig
} from 'ultra-scraper';
```

---

## 🧪 Testing
```bash
# Ejecutar tests
npm test

# Tests con cobertura
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

### Memory leaks en scraping prolongado
```typescript
// Usar BrowserPool con límites
const pool = createBrowserPool(5);

try {
  const page = await pool.acquirePage();
  // ... tu código
} finally {
  await pool.releasePage(page);
}
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas!

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva característica'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Desarrollo Local
```bash
git clone https://github.com/Brashkie/ultra-scraper.git
cd ultra-scraper
npm install
npm run build
npm test
```

---

## 📝 Changelog

### v1.1.0 (2025-01-02)

#### Agregado
- Browser Pool System con auto-scaling
- Advanced Queue System con persistencia
- Anti-Bot Detection PRO
- Circuit Breaker pattern
- Load Balancer con 6 estrategias
- Monitoring y analytics

#### Mejorado
- TypeScript 5.9.3
- Cobertura de tests (67%)
- Documentación completa

#### Corregido
- 66 errores de compilación TypeScript
- Problemas de tipos DOM
- Exports de módulos

### v1.0.3 (2024-12-15)
- Primera versión estable
- Scraping HTTP y dinámico
- Sistema de plugins

---

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles

Copyright © 2025 [Hepein Oficial](https://github.com/Brashkie)

---

## 🔗 Enlaces

- [NPM Package](https://www.npmjs.com/package/ultra-scraper)
- [GitHub](https://github.com/Brashkie/ultra-scraper)
- [Issues](https://github.com/Brashkie/ultra-scraper/issues)
- [Documentación](https://github.com/Brashkie/ultra-scraper/wiki)

---

<div align="center">

**Hecho con ❤️ por [Hepein Oficial](https://github.com/Brashkie)**

⭐ Si te gusta el proyecto, ¡dale una estrella en GitHub!

</div>
