import { Page } from 'playwright';
import { BlockType, BlockDetection } from '../types/antibot.types';

interface CaptchaConfig {
  enabled: boolean;
  autoSolve: boolean;
  provider?: '2captcha' | 'anticaptcha' | 'capsolver';
  apiKey?: string;
}

export interface CaptchaInfo {
  type: BlockType;
  sitekey: string;
  action?: string;
  callback?: string;
  pageUrl: string;
}

export class CaptchaDetector {
  constructor(private config: CaptchaConfig) {}

  async detect(page: Page): Promise<BlockDetection | null> {
    const url = page.url();

    // 1. Detectar reCAPTCHA v2
    const recaptchaV2 = await this.detectReCaptchaV2(page);
    if (recaptchaV2) {
      return {
        type: BlockType.RECAPTCHA_V2,
        confidence: 0.98,
        detectedAt: Date.now(),
        url,
        metadata: recaptchaV2
      };
    }

    // 2. Detectar reCAPTCHA v3
    const recaptchaV3 = await this.detectReCaptchaV3(page);
    if (recaptchaV3) {
      return {
        type: BlockType.RECAPTCHA_V3,
        confidence: 0.95,
        detectedAt: Date.now(),
        url,
        metadata: recaptchaV3
      };
    }

    // 3. Detectar hCaptcha
    const hcaptcha = await this.detectHCaptcha(page);
    if (hcaptcha) {
      return {
        type: BlockType.HCAPTCHA,
        confidence: 0.98,
        detectedAt: Date.now(),
        url,
        metadata: hcaptcha
      };
    }

    // 4. Detectar FunCaptcha (Arkose Labs)
    const funcaptcha = await this.detectFunCaptcha(page);
    if (funcaptcha) {
      return {
        type: BlockType.FUNCAPTCHA,
        confidence: 0.95,
        detectedAt: Date.now(),
        url,
        metadata: funcaptcha
      };
    }

    // 5. Detectar GeeTest
    const geetest = await this.detectGeeTest(page);
    if (geetest) {
      return {
        type: BlockType.GEETEST,
        confidence: 0.95,
        detectedAt: Date.now(),
        url,
        metadata: geetest
      };
    }

    return null;
  }

  private async detectReCaptchaV2(page: Page): Promise<CaptchaInfo | null> {
    try {
      // Método 1: Buscar iframe de reCAPTCHA
      const recaptchaFrame = await page.$('iframe[src*="google.com/recaptcha"]');
      
      if (recaptchaFrame) {
        // Buscar sitekey
        const sitekey = await this.extractReCaptchaSitekey(page);
        
        if (sitekey) {
          return {
            type: BlockType.RECAPTCHA_V2,
            sitekey,
            pageUrl: page.url()
          };
        }
      }

      // Método 2: Buscar en el DOM
      const hasRecaptchaDiv = await page.$('.g-recaptcha');
      if (hasRecaptchaDiv) {
        const sitekey = await hasRecaptchaDiv.getAttribute('data-sitekey');
        
        if (sitekey) {
          return {
            type: BlockType.RECAPTCHA_V2,
            sitekey,
            pageUrl: page.url()
          };
        }
      }

      // Método 3: Buscar en el código fuente
      const content = await page.content();
      const sitekeyMatch = content.match(/data-sitekey=["']([^"']+)["']/);
      
      if (sitekeyMatch) {
        return {
          type: BlockType.RECAPTCHA_V2,
          sitekey: sitekeyMatch[1],
          pageUrl: page.url()
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async detectReCaptchaV3(page: Page): Promise<CaptchaInfo | null> {
    try {
      const content = await page.content();

      // reCAPTCHA v3 patterns
      const v3Patterns = [
        /grecaptcha\.execute\(['"]([^'"]+)['"]/,
        /data-sitekey=["']([^"']+)["'].*data-action/,
        /__recaptcha_api.*render.*sitekey.*?["']([^"']+)["']/
      ];

      for (const pattern of v3Patterns) {
        const match = content.match(pattern);
        if (match) {
          // Extraer action si existe
          const actionMatch = content.match(/data-action=["']([^"']+)["']/);
          
          return {
            type: BlockType.RECAPTCHA_V3,
            sitekey: match[1],
            action: actionMatch ? actionMatch[1] : undefined,
            pageUrl: page.url()
          };
        }
      }

      // Buscar script de reCAPTCHA v3
      const hasV3Script = await page.evaluate(() => {
        const scripts = Array.from(document.scripts);
        return scripts.some(script => 
          script.src.includes('recaptcha') && 
          script.src.includes('render=')
        );
      });

      if (hasV3Script) {
        const sitekey = await this.extractReCaptchaSitekey(page);
        if (sitekey) {
          return {
            type: BlockType.RECAPTCHA_V3,
            sitekey,
            pageUrl: page.url()
          };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async detectHCaptcha(page: Page): Promise<CaptchaInfo | null> {
    try {
      // Método 1: Buscar iframe de hCaptcha
      const hcaptchaFrame = await page.$('iframe[src*="hcaptcha.com"]');
      
      if (hcaptchaFrame) {
        const sitekey = await this.extractHCaptchaSitekey(page);
        
        if (sitekey) {
          return {
            type: BlockType.HCAPTCHA,
            sitekey,
            pageUrl: page.url()
          };
        }
      }

      // Método 2: Buscar div de hCaptcha
      const hcaptchaDiv = await page.$('.h-captcha');
      if (hcaptchaDiv) {
        const sitekey = await hcaptchaDiv.getAttribute('data-sitekey');
        
        if (sitekey) {
          return {
            type: BlockType.HCAPTCHA,
            sitekey,
            pageUrl: page.url()
          };
        }
      }

      // Método 3: Buscar en código fuente
      const content = await page.content();
      const sitekeyMatch = content.match(/data-sitekey=["']([^"']+)["'].*h-captcha/);
      
      if (sitekeyMatch) {
        return {
          type: BlockType.HCAPTCHA,
          sitekey: sitekeyMatch[1],
          pageUrl: page.url()
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async detectFunCaptcha(page: Page): Promise<CaptchaInfo | null> {
    try {
      // FunCaptcha (Arkose Labs) patterns
      const content = await page.content();

      const patterns = [
        /data-public-key=["']([^"']+)["']/,
        /public_key.*?["']([^"']+)["']/,
        /arkose.*?public.*?key.*?["']([^"']+)["']/
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          return {
            type: BlockType.FUNCAPTCHA,
            sitekey: match[1],
            pageUrl: page.url()
          };
        }
      }

      // Buscar iframe de FunCaptcha
      const funcaptchaFrame = await page.$('iframe[src*="funcaptcha.com"], iframe[src*="arkoselabs.com"]');
      
      if (funcaptchaFrame) {
        const publicKey = await page.evaluate(() => {
          const div = document.querySelector('[data-public-key]');
          return div?.getAttribute('data-public-key') || null;
        });

        if (publicKey) {
          return {
            type: BlockType.FUNCAPTCHA,
            sitekey: publicKey,
            pageUrl: page.url()
          };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async detectGeeTest(page: Page): Promise<CaptchaInfo | null> {
    try {
      const content = await page.content();

      // GeeTest patterns
      const hasGeeTest = content.includes('geetest') || 
                        content.includes('gt.js') ||
                        content.includes('gt_challenge');

      if (!hasGeeTest) return null;

      // Extraer gt (similar a sitekey)
      const gtMatch = content.match(/gt.*?["']([a-f0-9]{32})["']/);
      
      if (gtMatch) {
        return {
          type: BlockType.GEETEST,
          sitekey: gtMatch[1],
          pageUrl: page.url()
        };
      }

      // Buscar en window object
      const geetestData = await page.evaluate(() => {
        const w = window as any;
        if (w.gt) return w.gt;
        if (w.geetest_challenge) return w.geetest_challenge;
        return null;
      });

      if (geetestData) {
        return {
          type: BlockType.GEETEST,
          sitekey: geetestData,
          pageUrl: page.url()
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Resolver Captcha automáticamente
  async solveCaptcha(captchaInfo: CaptchaInfo): Promise<string | null> {
    if (!this.config.autoSolve || !this.config.provider || !this.config.apiKey) {
      return null;
    }

    try {
      switch (this.config.provider) {
        case '2captcha':
          return await this.solve2Captcha(captchaInfo);
        
        case 'anticaptcha':
          return await this.solveAntiCaptcha(captchaInfo);
        
        case 'capsolver':
          return await this.solveCapSolver(captchaInfo);
        
        default:
          return null;
      }
    } catch (error) {
      console.error('Captcha solving error:', error);
      return null;
    }
  }

  private async solve2Captcha(captchaInfo: CaptchaInfo): Promise<string | null> {
    const apiKey = this.config.apiKey!;
    const baseUrl = 'https://2captcha.com';

    try {
      // Determinar método según tipo de captcha
      let method = '';
      let params: Record<string, any> = {
        key: apiKey,
        json: 1
      };

      switch (captchaInfo.type) {
        case BlockType.RECAPTCHA_V2:
          method = 'userrecaptcha';
          params.googlekey = captchaInfo.sitekey;
          params.pageurl = captchaInfo.pageUrl;
          break;

        case BlockType.RECAPTCHA_V3:
          method = 'userrecaptcha';
          params.googlekey = captchaInfo.sitekey;
          params.pageurl = captchaInfo.pageUrl;
          params.version = 'v3';
          params.action = captchaInfo.action || 'verify';
          params.min_score = 0.3;
          break;

        case BlockType.HCAPTCHA:
          method = 'hcaptcha';
          params.sitekey = captchaInfo.sitekey;
          params.pageurl = captchaInfo.pageUrl;
          break;

        case BlockType.FUNCAPTCHA:
          method = 'funcaptcha';
          params.publickey = captchaInfo.sitekey;
          params.pageurl = captchaInfo.pageUrl;
          break;

        case BlockType.GEETEST:
          method = 'geetest';
          params.gt = captchaInfo.sitekey;
          params.pageurl = captchaInfo.pageUrl;
          break;

        default:
          return null;
      }

      // 1. Enviar captcha
      const submitUrl = `${baseUrl}/in.php`;
      const submitParams = new URLSearchParams({ method, ...params });
      
      const submitResponse = await fetch(`${submitUrl}?${submitParams}`);
      const submitData = await submitResponse.json();

      if (submitData.status !== 1) {
        throw new Error(submitData.request || 'Failed to submit captcha');
      }

      const taskId = submitData.request;

      // 2. Esperar solución (polling)
      const resultUrl = `${baseUrl}/res.php`;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutos máximo (5s * 60)

      while (attempts < maxAttempts) {
        await this.sleep(5000); // Esperar 5 segundos

        const resultParams = new URLSearchParams({
          key: apiKey,
          action: 'get',
          id: taskId,
          json: '1'
        });

        const resultResponse = await fetch(`${resultUrl}?${resultParams}`);
        const resultData = await resultResponse.json();

        if (resultData.status === 1) {
          // Captcha resuelto
          return resultData.request;
        }

        if (resultData.request !== 'CAPCHA_NOT_READY') {
          throw new Error(resultData.request || 'Failed to solve captcha');
        }

        attempts++;
      }

      throw new Error('Captcha solving timeout');
    } catch (error) {
      console.error('2Captcha error:', error);
      return null;
    }
  }

  private async solveAntiCaptcha(captchaInfo: CaptchaInfo): Promise<string | null> {
    // Implementación similar a 2Captcha
    // API: https://api.anti-captcha.com
    console.log('AntiCaptcha not implemented yet');
    return null;
  }

  private async solveCapSolver(captchaInfo: CaptchaInfo): Promise<string | null> {
    // Implementación similar a 2Captcha
    // API: https://api.capsolver.com
    console.log('CapSolver not implemented yet');
    return null;
  }

  // Utilidades
  private async extractReCaptchaSitekey(page: Page): Promise<string | null> {
    try {
      const sitekey = await page.evaluate(() => {
        // Buscar en atributos
        const divs = document.querySelectorAll('[data-sitekey]');
        const divsArray = Array.from(divs);
        for (const div of divsArray) {
          const key = div.getAttribute('data-sitekey');
          if (key) return key;
        }

        // Buscar en scripts
        const scripts = Array.from(document.scripts);
        for (const script of scripts) {
          const match = script.textContent?.match(/sitekey.*?["']([^"']+)["']/);
          if (match) return match[1];
        }

        return null;
      });

      return sitekey;
    } catch {
      return null;
    }
  }

  private async extractHCaptchaSitekey(page: Page): Promise<string | null> {
    try {
      const sitekey = await page.evaluate(() => {
        const div = document.querySelector('.h-captcha');
        return div?.getAttribute('data-sitekey') || null;
      });

      return sitekey;
    } catch {
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}