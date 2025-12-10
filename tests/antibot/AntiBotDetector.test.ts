import { AntiBotDetector } from '../../src/antibot/AntiBotDetector';
import { chromium, Page } from 'playwright';

describe('AntiBotDetector', () => {
  let detector: AntiBotDetector;
  let browser: any;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    detector = new AntiBotDetector({
      enableAutoDetection: true,
      enableAutoBypass: false,
      maxBypassAttempts: 3,
      cloudflare: {
        enabled: true,
        waitForChallenge: false,
        maxWaitTime: 30000
      },
      captcha: {
        enabled: true,
        autoSolve: false
      },
      fingerprint: {
        enabled: true,
        rotateOnBlock: false,
        consistentSession: true
      },
      humanBehavior: {
        enabled: false,
        mouseMovements: false,
        randomScrolling: false,
        randomDelays: false,
        typingSpeed: 10
      },
      stealth: {
        enabled: true,
        hideWebdriver: true,
        hideAutomation: true,
        spoofPermissions: true,
        spoofWebGL: true,
        spoofCanvas: true
      }
    });

    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it('should detect no blocks on normal page', async () => {
    await page.goto('https://example.com');
    
    const detection = await detector.detectBlock(page);
    expect(detection).toBeNull();
  }, 15000);

  it('should track detection history', async () => {
    const history = detector.getDetectionHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should clear history', () => {
    detector.clearHistory();
    const history = detector.getDetectionHistory();
    expect(history.length).toBe(0);
  });

  it('should provide access to sub-detectors', () => {
    const cloudflare = detector.getCloudflareDetector();
    expect(cloudflare).toBeDefined();

    const captcha = detector.getCaptchaDetector();
    expect(captcha).toBeDefined();

    const fingerprint = detector.getFingerprintManager();
    expect(fingerprint).toBeDefined();
  });
});