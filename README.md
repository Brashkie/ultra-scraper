# Ultra Scraper

Ultra Scraper es un motor universal de scraping diseñado para manejar cualquier tipo de sitio web, sea **HTTP**, **HTTPS**, estático, dinámico o protegido. Ofrece una API simple, rápida y modular capaz de integrarse con bots, automatización, análisis de datos y pipelines empresariales.

## 🚀 Características principales

- ✅ Soporte para HTTP y HTTPS
- ✅ Scraping de contenido estático y dinámico
- ✅ Modo headless opcional (Playwright/Puppeteer)
- ✅ Extracción de HTML, JSON, texto, atributos, media y más
- ✅ Auto-reintentos y detección de bloqueos
- ✅ Parsers de alto rendimiento (Cheerio-like)
- ✅ Rotación opcional de user-agents y proxys
- ✅ Plugins para personalizar el scraping

---

## 📦 Instalación

```bash
npm install ultra-scraper
```

---

## 🧪 Uso básico

```js
import { createScraper } from "ultra-scraper";

const scraper = createScraper();

const data = await scraper.get("https://example.com");

console.log(data.html);     // HTML completo
console.log(data.status);   // Código de estado
console.log(data.headers);  // Headers recibidos
```

---

## 🔍 Scraping avanzado

```js
import { createScraper } from "ultra-scraper";

const scraper = createScraper({
  dynamic: true,          // habilita scraping dinámico
  retries: 3,
  timeout: 12000
});

const $ = await scraper.query("https://example.com", "h1");

console.log($.text());
```

---

## 🧩 Plugins

```js
import { createScraper, useProxyRotation } from "ultra-scraper";

const scraper = createScraper();
scraper.use(useProxyRotation(["proxy1", "proxy2"]));

await scraper.get("https://google.com");
```

---

## 📄 Licencia

Apache-2.0 © Hepein Oficial
