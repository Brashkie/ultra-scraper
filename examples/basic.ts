/**
 * Ejemplo básico de uso de Ultra Scraper
 */

import { createScraper } from '../src';

async function main() {
  // Crear una instancia del scraper
  const scraper = createScraper();

  try {
    // Scraping simple
    console.log('🔍 Fetching example.com...\n');
    const data = await scraper.get('https://example.com');

    console.log('✅ Success!');
    console.log(`Status: ${data.status}`);
    console.log(`Response time: ${data.responseTime}ms`);
    console.log(`Content length: ${data.html.length} bytes`);
    console.log(`URL: ${data.url}\n`);

    // Extraer título
    const $ = await scraper.query('https://example.com', 'h1');
    console.log(`Title: ${$.text()}\n`);

    // Extraer todos los enlaces
    const links = await scraper.query('https://example.com', 'a');
    console.log('Links found:');
    links.each((i, elem) => {
      const href = scraper.$(elem).attr('href');
      const text = scraper.$(elem).text();
      console.log(`  - ${text}: ${href}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

main();
