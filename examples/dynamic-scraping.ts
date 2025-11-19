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
    console.log('📍 Example 1: Dynamic content loading\n');
    const data = await scraper.get('http://quotes.toscrape.com/js/', {
      waitForSelector: '.quote',
    });

    console.log(`Status: ${data.status}`);
    console.log(`Response time: ${data.responseTime}ms`);
    console.log(`Content loaded: ${data.html.length} bytes\n`);

    // Ejemplo 2: Extraer contenido dinámico
    console.log('📍 Example 2: Extracting dynamic quotes\n');

    const quotes = await scraper.extract('http://quotes.toscrape.com/js/', {
      selector: '.quote',
      limit: 3,
      fields: {
        text: {
          selector: '.text',
          attr: 'text',
        },
        author: {
          selector: '.author',
          attr: 'text',
        },
      },
    });

    quotes.forEach((quote, i) => {
      console.log(`${i + 1}. "${quote.text}"`);
      console.log(`   - ${quote.author}\n`);
    });

    console.log('💡 Tips for dynamic scraping:');
    console.log('  - Use waitForSelector for elements loaded by JS');
    console.log('  - Increase timeout for slow sites');
    console.log('  - Use waitTime for additional load time');
    console.log('  - Dynamic mode is slower but more reliable\n');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await scraper.close();
  }
}

main();
