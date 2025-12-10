import { Page, Response } from 'playwright';
import { BlockType, BlockDetection } from '../types/antibot.types';

interface CloudflareConfig {
  enabled: boolean;
  waitForChallenge: boolean;
  maxWaitTime: number;
}

export class CloudflareDetector {
  constructor(private config: CloudflareConfig) {}

  async detect(page: Page, response?: Response): Promise<BlockDetection | null> {
    const url = page.url();
    const content = await page.content();
    const title = await page.title();

    // 1. Detectar Cloudflare Challenge (v1/v2)
    const challengeDetection = await this.detectChallenge(page, content, title);
    if (challengeDetection) {
      return {
        type: BlockType.CLOUDFLARE_CHALLENGE,
        confidence: challengeDetection.confidence,
        detectedAt: Date.now(),
        url,
        metadata: {
          version: challengeDetection.version,
          challengeType: challengeDetection.type
        }
      };
    }

    // 2. Detectar Cloudflare Turnstile
    const turnstileDetection = await this.detectTurnstile(page);
    if (turnstileDetection) {
      return {
        type: BlockType.CLOUDFLARE_TURNSTILE,
        confidence: 0.95,
        detectedAt: Date.now(),
        url,
        metadata: {
          sitekey: turnstileDetection.sitekey
        }
      };
    }

    // 3. Verificar headers de Cloudflare
    if (response) {
      const headers = response.headers();
      const cfRay = headers['cf-ray'];
      const server = headers['server'];

      if (cfRay || server === 'cloudflare') {
        // Cloudflare está presente pero no bloqueando
        return null;
      }
    }

    return null;
  }

  private async detectChallenge(
    page: Page,
    content: string,
    title: string
  ): Promise<{ confidence: number; version: string; type: string } | null> {
    // Cloudflare Challenge signatures
    const signatures = {
      // Challenge Page v1
      v1Challenge: [
        'checking your browser',
        'just a moment',
        'please wait',
        'cloudflare',
        '__cf_chl_'
      ],
      
      // Challenge Page v2 (IUAM)
      v2Challenge: [
        'cf-browser-verification',
        'cf_chl_2',
        'jschl-answer'
      ],

      // WAF Block
      wafBlock: [
        'access denied',
        'error 1020',
        'ray id'
      ],

      // Rate Limiting
      rateLimit: [
        'error 1015',
        'rate limited'
      ]
    };

    const lowerContent = content.toLowerCase();
    const lowerTitle = title.toLowerCase();

    // Detectar v1 Challenge
    let matchCount = 0;
    for (const sig of signatures.v1Challenge) {
      if (lowerContent.includes(sig) || lowerTitle.includes(sig)) {
        matchCount++;
      }
    }

    if (matchCount >= 2) {
      // Wait for challenge if enabled
      if (this.config.waitForChallenge) {
        await this.waitForChallengeCompletion(page);
      }

      return {
        confidence: 0.95,
        version: 'v1',
        type: 'javascript_challenge'
      };
    }

    // Detectar v2 Challenge (IUAM)
    for (const sig of signatures.v2Challenge) {
      if (lowerContent.includes(sig)) {
        if (this.config.waitForChallenge) {
          await this.waitForChallengeCompletion(page);
        }

        return {
          confidence: 0.98,
          version: 'v2',
          type: 'iuam_challenge'
        };
      }
    }

    // Detectar WAF Block
    for (const sig of signatures.wafBlock) {
      if (lowerContent.includes(sig)) {
        return {
          confidence: 0.9,
          version: 'waf',
          type: 'waf_block'
        };
      }
    }

    // Detectar Rate Limit
    for (const sig of signatures.rateLimit) {
      if (lowerContent.includes(sig)) {
        return {
          confidence: 1.0,
          version: 'rate_limit',
          type: 'rate_limit_error'
        };
      }
    }

    return null;
  }

  private async detectTurnstile(page: Page): Promise<{ sitekey: string } | null> {
    try {
      // Buscar elementos de Turnstile
      const turnstileIframe = await page.$('iframe[src*="challenges.cloudflare.com"]');
      
      if (turnstileIframe) {
        // Extraer sitekey
        const parentDiv = await page.$('[data-sitekey]');
        if (parentDiv) {
          const sitekey = await parentDiv.getAttribute('data-sitekey');
          if (sitekey) {
            return { sitekey };
          }
        }

        return { sitekey: 'unknown' };
      }

      // Buscar en el DOM
      const content = await page.content();
      const turnstileMatch = content.match(/data-sitekey="([^"]+)"/);
      
      if (turnstileMatch) {
        return { sitekey: turnstileMatch[1] };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async waitForChallengeCompletion(page: Page): Promise<boolean> {
    const maxWaitTime = this.config.maxWaitTime;
    const startTime = Date.now();

    try {
      // Esperar a que desaparezcan los elementos del challenge
      await page.waitForFunction(
        () => {
          const challengeElements = [
            document.querySelector('#challenge-form'),
            document.querySelector('[id^="cf-challenge"]'),
            document.querySelector('.cf-browser-verification')
          ];

          return !challengeElements.some(el => el !== null);
        },
        { timeout: maxWaitTime }
      );

      // Esperar a que se complete la navegación
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      const elapsed = Date.now() - startTime;
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async bypassChallenge(page: Page): Promise<boolean> {
    // Estrategia de bypass
    try {
      // 1. Esperar a que se complete el challenge automáticamente
      const completed = await this.waitForChallengeCompletion(page);
      
      if (completed) {
        return true;
      }

      // 2. Si no se completa, intentar otros métodos
      // (En producción, aquí irían técnicas más avanzadas)
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Verificar si la página actual tiene Cloudflare
  async isCloudflarePresent(page: Page): Promise<boolean> {
    try {
      const content = await page.content();
      const cdnCgi = content.includes('cdn-cgi/');
      const cfRay = content.includes('cf-ray');
      
      return cdnCgi || cfRay;
    } catch {
      return false;
    }
  }
}