import { EventEmitter } from 'events';
import { Page, Response } from 'playwright';
import { BlockType, BlockDetection, AntiBotConfig } from '../types/antibot.types';
import { CloudflareDetector } from './CloudflareDetector';
import { CaptchaDetector } from './CaptchaDetector';
import { FingerprintManager } from './FingerprintManager';

export class AntiBotDetector extends EventEmitter {
  private cloudflareDetector: CloudflareDetector;
  private captchaDetector: CaptchaDetector;
  private fingerprintManager: FingerprintManager;
  
  private detectionHistory: BlockDetection[] = [];
  private blockPatterns: Map<string, number> = new Map();

  constructor(private config: AntiBotConfig) {
    super();
    
    this.cloudflareDetector = new CloudflareDetector(config.cloudflare);
    this.captchaDetector = new CaptchaDetector(config.captcha);
    this.fingerprintManager = new FingerprintManager(config.fingerprint);
  }

  async detectBlock(page: Page, response?: Response): Promise<BlockDetection | null> {
    const url = page.url();
    const detections: BlockDetection[] = [];

    // 1. Detección de Cloudflare
    if (this.config.cloudflare.enabled) {
      const cloudflareBlock = await this.cloudflareDetector.detect(page, response);
      if (cloudflareBlock) {
        detections.push(cloudflareBlock);
      }
    }

    // 2. Detección de Captchas
    if (this.config.captcha.enabled) {
      const captchaBlock = await this.captchaDetector.detect(page);
      if (captchaBlock) {
        detections.push(captchaBlock);
      }
    }

    // 3. Detección de HTTP errors
    const httpBlock = await this.detectHTTPBlock(response);
    if (httpBlock) {
      detections.push(httpBlock);
    }

    // 4. Detección de WAF
    const wafBlock = await this.detectWAF(page, response);
    if (wafBlock) {
      detections.push(wafBlock);
    }

    // 5. Detección de Geo-blocking
    const geoBlock = await this.detectGeoBlock(page);
    if (geoBlock) {
      detections.push(geoBlock);
    }

    // Seleccionar la detección con mayor confianza
    if (detections.length > 0) {
      const primaryDetection = detections.sort((a, b) => b.confidence - a.confidence)[0];
      
      // Guardar en historial
      this.detectionHistory.push(primaryDetection);
      this.updateBlockPatterns(url, primaryDetection.type);
      
      this.emit('blockDetected', primaryDetection);
      
      return primaryDetection;
    }

    return null;
  }

  private async detectHTTPBlock(response?: Response): Promise<BlockDetection | null> {
    if (!response) return null;

    const status = response.status();
    const url = response.url();

    // 403 Forbidden
    if (status === 403) {
      return {
        type: BlockType.RATE_LIMIT_403,
        confidence: 0.9,
        detectedAt: Date.now(),
        url,
        response: {
          status,
          headers: await this.getHeaders(response),
          body: ''
        }
      };
    }

    // 429 Too Many Requests
    if (status === 429) {
      const headers = await this.getHeaders(response);
      const retryAfter = headers['retry-after'] || headers['x-ratelimit-reset'];
      
      return {
        type: BlockType.RATE_LIMIT_429,
        confidence: 1.0,
        detectedAt: Date.now(),
        url,
        response: {
          status,
          headers,
          body: ''
        },
        metadata: {
          retryAfter: retryAfter ? parseInt(retryAfter) : null
        }
      };
    }

    return null;
  }

  private async detectWAF(page: Page, response?: Response): Promise<BlockDetection | null> {
    if (!response) return null;

    const headers = await this.getHeaders(response);
    const body = await page.content();

    // Detectar diferentes WAFs
    const wafSignatures = [
      // Cloudflare
      { name: 'cloudflare', patterns: ['cf-ray', 'cloudflare'], header: 'cf-ray' },
      
      // Akamai
      { name: 'akamai', patterns: ['akamai', 'ak-'], header: 'x-akamai-request-id' },
      
      // Incapsula (Imperva)
      { name: 'incapsula', patterns: ['incapsula', '_incap_'], header: 'x-iinfo' },
      
      // AWS WAF
      { name: 'aws-waf', patterns: ['aws', 'x-amzn-'], header: 'x-amzn-requestid' },
      
      // Sucuri
      { name: 'sucuri', patterns: ['sucuri', 'x-sucuri-'], header: 'x-sucuri-id' },
      
      // ModSecurity
      { name: 'modsecurity', patterns: ['mod_security', 'modsecurity'], header: null },
    ];

    for (const waf of wafSignatures) {
      // Check headers
      if (waf.header && headers[waf.header]) {
        return {
          type: BlockType.WAF_BLOCK,
          confidence: 0.95,
          detectedAt: Date.now(),
          url: page.url(),
          metadata: {
            wafName: waf.name,
            detectedVia: 'header'
          }
        };
      }

      // Check body patterns
      for (const pattern of waf.patterns) {
        if (body.toLowerCase().includes(pattern.toLowerCase())) {
          return {
            type: BlockType.WAF_BLOCK,
            confidence: 0.85,
            detectedAt: Date.now(),
            url: page.url(),
            metadata: {
              wafName: waf.name,
              detectedVia: 'content'
            }
          };
        }
      }
    }

    return null;
  }

  private async detectGeoBlock(page: Page): Promise<BlockDetection | null> {
    const body = await page.content();
    const title = await page.title();

    const geoBlockPatterns = [
      'not available in your country',
      'not available in your region',
      'geo-blocked',
      'geographic restriction',
      'this content is not available',
      'access denied based on your location',
      'region not supported'
    ];

    const lowerBody = body.toLowerCase();
    const lowerTitle = title.toLowerCase();

    for (const pattern of geoBlockPatterns) {
      if (lowerBody.includes(pattern) || lowerTitle.includes(pattern)) {
        return {
          type: BlockType.GEO_BLOCK,
          confidence: 0.9,
          detectedAt: Date.now(),
          url: page.url(),
          metadata: {
            detectedPattern: pattern
          }
        };
      }
    }

    return null;
  }

  // Análisis de patrones
  private updateBlockPatterns(url: string, blockType: BlockType): void {
    const domain = new URL(url).hostname;
    const key = `${domain}:${blockType}`;
    
    const count = this.blockPatterns.get(key) || 0;
    this.blockPatterns.set(key, count + 1);

    // Emitir alerta si hay muchos bloqueos del mismo tipo
    if (count >= 5) {
      this.emit('patternDetected', {
        domain,
        blockType,
        count: count + 1
      });
    }
  }

  getBlockPatterns(domain?: string): Map<string, number> {
    if (!domain) return this.blockPatterns;

    const filtered = new Map<string, number>();
    for (const [key, value] of this.blockPatterns) {
      if (key.startsWith(`${domain}:`)) {
        filtered.set(key, value);
      }
    }
    return filtered;
  }

  getDetectionHistory(limit?: number): BlockDetection[] {
    if (limit) {
      return this.detectionHistory.slice(-limit);
    }
    return this.detectionHistory;
  }

  clearHistory(): void {
    this.detectionHistory = [];
    this.blockPatterns.clear();
  }

  // Utilidades
  private async getHeaders(response: Response): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    const responseHeaders = response.headers();
    
    for (const [key, value] of Object.entries(responseHeaders)) {
      headers[key.toLowerCase()] = value;
    }
    
    return headers;
  }

  // Getters
  getCloudflareDetector(): CloudflareDetector {
    return this.cloudflareDetector;
  }

  getCaptchaDetector(): CaptchaDetector {
    return this.captchaDetector;
  }

  getFingerprintManager(): FingerprintManager {
    return this.fingerprintManager;
  }
}