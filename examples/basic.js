/**
 * Ejemplo de uso con JavaScript (CommonJS)
 * Para usar sin TypeScript
 */

const { createScraper, useRandomUserAgent, useRateLimit } = require('../dist');

async function main() {
  // Crear scraper con configuración básica
  const scraper = createScraper({
    timeout: 10000,
    retries: 2,
  });

  // Agregar plugins
  scraper.use(useRandomUserAgent());
  scraper.use(useRateLimit({ requestsPerSecond: 3 }));

  // Eventos
  scraper.on('beforeRequest', (config) => {
    console.log(`🔍 Scraping: ${config.url}`);
  });

  scraper.on('afterRequest', (response) => {
    console.log(`✅ Success: ${response.status} (${response.responseTime}ms)`);
  });

  try {
    console.log('📝 Ejemplo 1: Scraping simple\n');

    // Scraping básico
    const data = await scraper.get('https://example.com');
    console.log(`Título: ${data.html.match(/<title>(.*?)<\/title>/)[1]}\n`);

    console.log('📝 Ejemplo 2: Extracción con selectores\n');

    // Extraer elementos
    const $ = await scraper.query('https://example.com', 'h1');
    console.log(`H1: ${$.text()}\n`);

    console.log('📝 Ejemplo 3: Extracción estructurada\n');

    // Extraer datos estructurados
    const quotes = await scraper.extract('http://quotes.toscrape.com/', {
      selector: '.quote',
      limit: 3,
      fields: {
        text: {
          selector: '.text',
          attr: 'text',
          transform: (value) => value.replace(/[""]/g, ''),
        },
        author: {
          selector: '.author',
          attr: 'text',
        },
      },
    });

    console.log('Citas extraídas:');
    quotes.forEach((quote, i) => {
      console.log(`${i + 1}. "${quote.text}" - ${quote.author}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
    console.log('\n✨ Scraping completado!');
  }
}

// Ejecutar
main().catch(console.error);
