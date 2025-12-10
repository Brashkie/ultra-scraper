import { CloudflareDetector } from '../../src/antibot/CloudflareDetector';
import { chromium, Page } from 'playwright';

describe('CloudflareDetector', () => {
  let detector: CloudflareDetector;
  let browser: any;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    detector = new CloudflareDetector({
      enabled: true,
      waitForChallenge: false,
      maxWaitTime: 30000
    });

    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it('should not detect Cloudflare on normal pages', async () => {
    await page.goto('https://example.com');
    
    const detection = await detector.detect(page);
    expect(detection).toBeNull();
  }, 15000);

  it('should check if Cloudflare is present', async () => {
    await page.goto('https://example.com');
    
    const isPresent = await detector.isCloudflarePresent(page);
    expect(typeof isPresent).toBe('boolean');
  }, 15000);

  // Note: Testing actual Cloudflare challenges requires real Cloudflare-protected sites
  // which may be unstable for automated testing
});