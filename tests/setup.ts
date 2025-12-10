// tests/setup.ts
import { jest } from '@jest/globals';

// Aumentar timeout global
jest.setTimeout(30000);

// Setup global
beforeAll(async () => {
  console.log('🧪 Iniciando suite de tests...');
});

afterAll(async () => {
  console.log('✅ Tests completados');
});

// Verificar Playwright
const checkPlaywright = async (): Promise<boolean> => {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch (error) {
    return false;
  }
};

// Warn si Playwright no está disponible
beforeAll(async () => {
  const available = await checkPlaywright();
  if (!available) {
    console.warn('⚠️  Playwright browsers no instalados');
    console.warn('    Ejecuta: npx playwright install chromium');
  }
});

// Helpers globales
declare global {
  var delay: (ms: number) => Promise<void>;
}

global.delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));