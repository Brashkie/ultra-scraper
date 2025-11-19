/**
 * Ejemplo de extracción de datos estructurados
 */

import { createScraper } from '../src';

async function main() {
  const scraper = createScraper();

  try {
    console.log('🔍 Extracting structured data from quotes.toscrape.com...\n');

    // Definir esquema de extracción
    const quotes = await scraper.extract('http://quotes.toscrape.com/', {
      selector: '.quote',
      limit: 5,
      fields: {
        text: {
          selector: '.text',
          attr: 'text',
          transform: (value: string) => value.replace(/[""]/g, ''),
        },
        author: {
          selector: '.author',
          attr: 'text',
        },
        tags: {
          selector: '.tag',
          attr: 'text',
        },
      },
    });

    console.log('✅ Quotes extracted:\n');
    quotes.forEach((quote, index) => {
      console.log(`${index + 1}. "${quote.text}"`);
      console.log(`   - Author: ${quote.author}`);
      console.log(`   - Tag: ${quote.tags || 'N/A'}\n`);
    });

    // Ejemplo 2: Esquema para productos de e-commerce
    console.log('🔍 Example schema for e-commerce products:\n');

    const productSchema = {
      selector: '.product-item',
      fields: {
        name: {
          selector: '.product-name',
          attr: 'text',
        },
        price: {
          selector: '.product-price',
          attr: 'text',
          transform: (value: string) => parseFloat(value.replace(/[^0-9.]/g, '')),
        },
        image: {
          selector: 'img',
          attr: 'src',
        },
        link: {
          selector: 'a',
          attr: 'href',
        },
        inStock: {
          selector: '.in-stock',
          attr: 'text',
          default: false,
          transform: (value: string) => value.toLowerCase().includes('in stock'),
        },
      },
    };

    console.log('Schema definition:');
    console.log(JSON.stringify(productSchema, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await scraper.close();
  }
}

main();
