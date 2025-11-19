/**
 * Ejemplo básico de uso de Ultra Scraper
 */

import { createScraper } from '../src';
import * as cheerio from 'cheerio';

async function main() {
  // Crear una instancia del scraper
  const scraper = createScraper();

  try {
    // Scraping simple
    console.log('🔍 Fetching quotes.toscrape.com...\n');
    const data = await scraper.get('http://quotes.toscrape.com/');

    console.log('✅ Success!');
    console.log(`Status: ${data.status}`);
    console.log(`Response time: ${data.responseTime}ms`);
    console.log(`Content length: ${data.html.length} bytes`);
    console.log(`URL: ${data.url}\n`);

    // Extraer título
    const $ = cheerio.load(data.html);
    const title = $('title').text();
    console.log(`Title: ${title}\n`);

    // Extraer todos los enlaces
    const links = $('a');
    console.log('Links found:');
    links.each((_i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      if (text && href) {
        console.log(`  - ${text}: ${href}`);
      }
    });

    // Extraer quotes
    console.log('\n📝 Extracting quotes...\n');
    const quotes = await scraper.extract('http://quotes.toscrape.com/', {
      selector: '.quote',
      limit: 3,
      fields: {
        text: {
          selector: '.text',
          attr: 'text',
          transform: (value: string) => value.replace(/[""]/g, '').trim(),
        },
        author: {
          selector: '.author',
          attr: 'text',
        },
      },
    });

    quotes.forEach((quote, i) => {
      console.log(`${i + 1}. "${quote.text}"`);
      console.log(`   Author: ${quote.author}\n`);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Error:', error);
    }
  } finally {
    await scraper.close();
  }
}

main();
