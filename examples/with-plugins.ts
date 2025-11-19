/**
 * Ejemplo de uso con plugins
 */

import { createScraper, useRandomUserAgent, useRateLimit } from '../src';

async function main() {
  // Crear scraper con plugins
  const scraper = createScraper({
    timeout: 15000,
    retries: 2,
  });

  // Registrar plugins
  scraper.use(useRandomUserAgent());
  scraper.use(
    useRateLimit({
      requestsPerSecond: 2,
    })
  );

  // Agregar listeners de eventos
  scraper.on('beforeRequest', (config) => {
    console.log(`📤 Requesting: ${config.url}`);
  });

  scraper.on('afterRequest', (response) => {
    console.log(`📥 Response: ${response.status} (${response.responseTime}ms)`);
  });

  scraper.on('error', (error) => {
    console.error(`❌ Error: ${error.message}`);
  });

  try {
    // Hacer múltiples peticiones
    const urls = [
      'https://example.com',
      'https://httpbin.org/html',
      'https://httpbin.org/delay/1',
    ];

    console.log('🚀 Starting scraping with plugins...\n');

    for (const url of urls) {
      const data = await scraper.get(url);
      console.log(`✅ ${url} - ${data.status}\n`);
    }

    console.log('✨ All requests completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

main();
