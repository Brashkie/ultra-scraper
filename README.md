<div align="center">

# 🚀 Ultra Scraper

### Motor universal de web scraping de alto rendimiento

[![npm version](https://img.shields.io/npm/v/ultra-scraper.svg)](https://www.npmjs.com/package/ultra-scraper)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)

**Ultra Scraper** es un motor de scraping universal diseñado para manejar cualquier tipo de sitio web: HTTP, HTTPS, estático, dinámico o protegido. Ofrece una API simple, rápida y modular, ideal para bots, automatización, análisis de datos y pipelines empresariales.

[Instalación](#-instalación) • [Uso](#-uso-básico) • [Documentación](#-documentación) • [Ejemplos](#-ejemplos)

</div>

---

## ✨ Características principales

<table>
<tr>
<td width="50%">

### 🌐 Versatilidad
- ✅ Soporte para **HTTP** y **HTTPS**
- ✅ Scraping de contenido **estático** y **dinámico**
- ✅ Modo **headless** opcional (Playwright/Puppeteer)
- ✅ Compatible con sitios protegidos

</td>
<td width="50%">

### ⚡ Rendimiento
- ✅ Parsers de **alto rendimiento** (Cheerio-like)
- ✅ **Auto-reintentos** y detección de bloqueos
- ✅ Rotación de **user-agents** y **proxys**
- ✅ Sistema de **plugins** extensible

</td>
</tr>
<tr>
<td width="50%">

### 📊 Extracción de datos
- ✅ HTML, JSON, texto y atributos
- ✅ Imágenes, videos y archivos media
- ✅ Selectores CSS y XPath
- ✅ Extracción estructurada

</td>
<td width="50%">

### 🛠️ Facilidad de uso
- ✅ API simple e intuitiva
- ✅ TypeScript ready
- ✅ Configuración flexible
- ✅ Documentación completa

</td>
</tr>
</table>

---

## 📦 Instalación
```bash
npm install ultra-scraper
```

### Requisitos
- **Node.js** >= 14.0.0
- **npm** o **yarn**

---

## 🧪 Uso básico

### Scraping simple
```javascript
import { createScraper } from "ultra-scraper";

const scraper = createScraper();

// Obtener contenido de una página
const data = await scraper.get("https://example.com");

console.log(data.html);     // HTML completo
console.log(data.status);   // Código de estado HTTP
console.log(data.headers);  // Headers de la respuesta
```

### Scraping con selectores
```javascript
import { createScraper } from "ultra-scraper";

const scraper = createScraper();

// Extraer elementos específicos
const $ = await scraper.query("https://example.com", "h1");
console.log($.text());  // Texto del h1

// Múltiples elementos
const links = await scraper.query("https://example.com", "a");
links.each((i, elem) => {
  console.log($(elem).attr("href"));
});
```

---

## 🔍 Uso avanzado

### Scraping dinámico

Para sitios web que cargan contenido con JavaScript:
```javascript
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

### Configuración de opciones
```javascript
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
  proxy: "http://proxy:8080"
});
```

### Extracción estructurada
```javascript
const scraper = createScraper();

const products = await scraper.extract("https://shop.com/products", {
  selector: ".product",
  fields: {
    title: { selector: ".title", attr: "text" },
    price: { selector: ".price", attr: "text" },
    image: { selector: "img", attr: "src" },
    link: { selector: "a", attr: "href" }
  }
});

console.log(products);
// [
//   { title: "Product 1", price: "$10", image: "...", link: "..." },
//   { title: "Product 2", price: "$20", image: "...", link: "..." }
// ]
```

---

## 🧩 Sistema de plugins

Ultra Scraper incluye un sistema de plugins extensible para añadir funcionalidades personalizadas.

### Rotación de proxys
```javascript
import { createScraper, useProxyRotation } from "ultra-scraper";

const scraper = createScraper();

// Configurar rotación automática de proxys
scraper.use(useProxyRotation([
  "http://proxy1.com:8080",
  "http://proxy2.com:8080",
  "http://proxy3.com:8080"
]));

await scraper.get("https://example.com");
```

### User-Agent aleatorio
```javascript
import { createScraper, useRandomUserAgent } from "ultra-scraper";

const scraper = createScraper();
scraper.use(useRandomUserAgent());

await scraper.get("https://example.com");
```

### Rate limiting
```javascript
import { createScraper, useRateLimit } from "ultra-scraper";

const scraper = createScraper();

// Limitar a 5 peticiones por segundo
scraper.use(useRateLimit({ requestsPerSecond: 5 }));

await scraper.get("https://example.com");
```

### Crear plugin personalizado
```javascript
const myPlugin = (scraper) => {
  scraper.on("beforeRequest", (config) => {
    console.log(`Scraping: ${config.url}`);
  });
  
  scraper.on("afterRequest", (response) => {
    console.log(`Status: ${response.status}`);
  });
};

scraper.use(myPlugin);
```

---

## 📚 Ejemplos

### Scraping de noticias
```javascript
import { createScraper } from "ultra-scraper";

const scraper = createScraper();

const news = await scraper.extract("https://news-site.com", {
  selector: "article",
  fields: {
    headline: { selector: "h2", attr: "text" },
    author: { selector: ".author", attr: "text" },
    date: { selector: "time", attr: "datetime" },
    summary: { selector: ".summary", attr: "text" }
  }
});

console.log(news);
```

### Scraping con autenticación
```javascript
const scraper = createScraper({
  headers: {
    "Authorization": "Bearer YOUR_TOKEN",
    "Cookie": "session=abc123"
  }
});

const data = await scraper.get("https://protected-site.com/dashboard");
```

### Scraping de imágenes
```javascript
const images = await scraper.query("https://gallery.com", "img");
const imageUrls = images.map((i, elem) => scraper.$(elem).attr("src")).get();

console.log(imageUrls);
```

---

## 🛡️ Manejo de errores
```javascript
import { createScraper, ScraperError } from "ultra-scraper";

const scraper = createScraper({ retries: 3 });

try {
  const data = await scraper.get("https://example.com");
  console.log(data.html);
} catch (error) {
  if (error instanceof ScraperError) {
    console.error(`Error de scraping: ${error.message}`);
    console.error(`Código: ${error.statusCode}`);
  } else {
    console.error("Error desconocido:", error);
  }
}
```

---

## 📖 API Reference

### `createScraper(options?)`

Crea una nueva instancia del scraper.

**Opciones:**
- `dynamic` (boolean): Habilitar modo headless
- `timeout` (number): Timeout en milisegundos
- `retries` (number): Número de reintentos
- `userAgent` (string): User-agent personalizado
- `headers` (object): Headers HTTP personalizados
- `proxy` (string): URL del proxy

### `scraper.get(url, options?)`

Obtiene el contenido de una URL.

**Retorna:** `Promise<ScraperResponse>`

### `scraper.query(url, selector, options?)`

Extrae elementos usando selectores CSS.

**Retorna:** `Promise<CheerioStatic>`

### `scraper.extract(url, schema, options?)`

Extrae datos estructurados según un esquema.

**Retorna:** `Promise<Array<object>>`

### `scraper.use(plugin)`

Registra un plugin.

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si deseas contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva característica'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Roadmap

- [ ] Soporte para WebSockets
- [ ] Integración con bases de datos
- [ ] Cache inteligente de respuestas
- [ ] Soporte para CAPTCHA solving
- [ ] CLI para scraping desde terminal
- [ ] Dashboard de monitoreo

---

## 📄 Licencia

Este proyecto está bajo la licencia **Apache-2.0**.

Copyright © 2025 [Hepein Oficial](https://github.com/Brashkie)

---

## 🔗 Enlaces

- [Documentación completa](https://github.com/Brashkie/ultra-scraper/wiki)
- [NPM Package](https://www.npmjs.com/package/ultra-scraper)
- [Reportar un bug](https://github.com/Brashkie/ultra-scraper/issues)
- [Solicitar feature](https://github.com/Brashkie/ultra-scraper/issues/new)

---

<div align="center">

**Hecho con ❤️ por [Hepein Oficial](https://github.com/Brashkie)**

Si te gusta este proyecto, ¡dale una ⭐ en GitHub!

</div>
