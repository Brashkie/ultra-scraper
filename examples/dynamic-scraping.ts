/**
 * Ejemplo de scraping dinámico con navegador headless
 */

import { createScraper } from '../src';

async function main() {
  // Crear scraper en modo dinámico
  const scraper = createScraper({
    dynamic: true,
    timeout: 30000,
    waitTime: 2000,
  });

  try {
    console.log('🌐 Scraping dynamic content with headless browser...\n');

    // Ejemplo 1: Sitio con contenido cargado por JavaScript
    console.log('📍 Example 1: HTTP Bin (dynamic headers)\n');
    const data = await scraper.get('https://httpbin.org/html', {
      waitForSelector: 'body',
    });

    console.log(`Status: ${data.status}`);
    console.log(`Response time: ${data.responseTime}ms`);
    console.log(`Content loaded: ${data.html.length} bytes\n`);

    // Ejemplo 2: Extraer contenido dinámico
    console.log('📍 Example 2: Extracting dynamic content\n');

    const $ = await scraper.query('https://httpbin.org/html', 'h1');
    console.log(`Title found: ${$.text()}\n`);

    // Ejemplo 3: Esperar por selector específico
    console.log('📍 Example 3: Waiting for specific selector\n');
    const dynamicContent = await scraper.get('https://httpbin.org/delay/2', {
      dynamic: true,
      waitTime: 3000,
    });

    console.log(`✅ Dynamic content loaded successfully`);
    console.log(`Response time: ${dynamicContent.responseTime}ms\n`);

    console.log('💡 Tips for dynamic scraping:');
    console.log('  - Use waitForSelector for elements loaded by JS');
    console.log('  - Increase timeout for slow sites');
    console.log('  - Use waitTime for additional load time');
    console.log('  - Dynamic mode is slower but more reliable\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

main();
