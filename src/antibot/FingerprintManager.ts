import { Page } from 'playwright';
import { FingerprintProfile } from '../types/antibot.types';
import * as crypto from 'crypto';

interface FingerprintConfig {
  enabled: boolean;
  rotateOnBlock: boolean;
  consistentSession: boolean;
}

export class FingerprintManager {
  private currentFingerprint: FingerprintProfile | null = null;
  private fingerprintHistory: Map<string, FingerprintProfile> = new Map();

  constructor(private config: FingerprintConfig) {}

  async applyFingerprint(page: Page, profile?: FingerprintProfile): Promise<void> {
    if (!this.config.enabled) return;

    const fingerprint = profile || this.generateFingerprint();
    this.currentFingerprint = fingerprint;

    await this.injectFingerprint(page, fingerprint);
  }

  private async injectFingerprint(page: Page, profile: FingerprintProfile): Promise<void> {
    // Inyectar antes de cualquier navegación
    await page.addInitScript((fp: FingerprintProfile) => {
      // 1. User Agent
      Object.defineProperty(navigator, 'userAgent', {
        get: () => fp.userAgent
      });

      // 2. Platform
      Object.defineProperty(navigator, 'platform', {
        get: () => fp.platform
      });

      // 3. Languages
      Object.defineProperty(navigator, 'language', {
        get: () => fp.language
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => fp.languages
      });

      // 4. Hardware Concurrency
      if (fp.hardwareConcurrency) {
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => fp.hardwareConcurrency
        });
      }

      // 5. Device Memory
      if (fp.deviceMemory) {
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => fp.deviceMemory
        });
      }

      // 6. Screen
      Object.defineProperty(screen, 'width', {
        get: () => fp.screen.width
      });

      Object.defineProperty(screen, 'height', {
        get: () => fp.screen.height
      });

      Object.defineProperty(screen, 'colorDepth', {
        get: () => fp.screen.colorDepth
      });

      // 7. Timezone
      const originalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(...args: any[]) {
        const format = new originalDateTimeFormat(...args);
        const originalResolvedOptions = format.resolvedOptions;
        format.resolvedOptions = function() {
          const options = originalResolvedOptions.call(this);
          options.timeZone = fp.timezone;
          return options;
        };
        return format;
      } as any;

      // 8. WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return fp.webgl.vendor;
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return fp.webgl.renderer;
        }
        return getParameter.call(this, parameter);
      };

      // 9. Canvas Fingerprint
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const result = originalToDataURL.apply(this, args);
        // Añadir ruido consistente basado en el fingerprint
        return result.replace(/data:image\/png;base64,/, `data:image/png;base64,${fp.canvas}`);
      };

      // 10. Plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = fp.plugins.map((p, i) => ({
            ...p,
            length: 1,
            item: () => null,
            namedItem: () => null,
            refresh: () => {}
          }));
          return plugins;
        }
      });

      // 11. Fonts
      // Spoofing de fonts disponibles (más complejo, simplificado aquí)
      
    }, profile);

    // Configurar viewport
    await page.setViewportSize({
      width: profile.viewport.width,
      height: profile.viewport.height
    });
  }

  generateFingerprint(): FingerprintProfile {
    const profiles = this.getRealisticProfiles();
    const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];

    const seed = crypto.randomBytes(16).toString('hex');
    const canvas = this.generateCanvasFingerprint(seed);
    const audio = this.generateAudioFingerprint(seed);

    return {
      userAgent: randomProfile.userAgent || '',
      viewport: randomProfile.viewport || { width: 1920, height: 1080 },
      screen: randomProfile.screen || { width: 1920, height: 1080, colorDepth: 24 },
      timezone: randomProfile.timezone || 'America/New_York',
      language: randomProfile.language || 'en-US',
      languages: randomProfile.languages || ['en-US', 'en'],
      platform: randomProfile.platform || 'Win32',
      hardwareConcurrency: randomProfile.hardwareConcurrency,
      deviceMemory: randomProfile.deviceMemory,
      webgl: randomProfile.webgl || { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
      fonts: randomProfile.fonts || ['Arial', 'Verdana'],
      plugins: randomProfile.plugins || [],
      canvas,
      audio
    };
  }

  private getRealisticProfiles(): Partial<FingerprintProfile>[] {
    return [
      // Windows Chrome
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        viewport: { width: 1920, height: 1080 },
        screen: { width: 1920, height: 1080, colorDepth: 24 },
        timezone: 'America/New_York',
        language: 'en-US',
        languages: ['en-US', 'en'],
        hardwareConcurrency: 8,
        deviceMemory: 8,
        webgl: {
          vendor: 'Google Inc. (NVIDIA)',
          renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)'
        },
        fonts: ['Arial', 'Verdana', 'Times New Roman', 'Courier New'],
        plugins: [
          { name: 'Chrome PDF Plugin', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', description: 'Portable Document Format' }
        ]
      },

      // macOS Safari
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        platform: 'MacIntel',
        viewport: { width: 1440, height: 900 },
        screen: { width: 1440, height: 900, colorDepth: 24 },
        timezone: 'America/Los_Angeles',
        language: 'en-US',
        languages: ['en-US', 'en'],
        hardwareConcurrency: 8,
        deviceMemory: 16,
        webgl: {
          vendor: 'Apple Inc.',
          renderer: 'Apple M1'
        },
        fonts: ['Helvetica', 'Arial', 'Times', 'Courier'],
        plugins: []
      },

      // Linux Firefox
      {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
        platform: 'Linux x86_64',
        viewport: { width: 1920, height: 1080 },
        screen: { width: 1920, height: 1080, colorDepth: 24 },
        timezone: 'Europe/London',
        language: 'en-GB',
        languages: ['en-GB', 'en'],
        hardwareConcurrency: 4,
        deviceMemory: 8,
        webgl: {
          vendor: 'Mesa',
          renderer: 'Mesa Intel(R) HD Graphics'
        },
        fonts: ['DejaVu Sans', 'Liberation Sans', 'Ubuntu'],
        plugins: []
      }
    ];
  }

  private generateCanvasFingerprint(seed: string): string {
    // Generar un fingerprint de canvas consistente
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    return hash.substring(0, 16);
  }

  private generateAudioFingerprint(seed: string): string {
    // Generar un fingerprint de audio consistente
    const hash = crypto.createHash('md5').update(seed + 'audio').digest('hex');
    return hash.substring(0, 16);
  }

  rotateFingerprint(): FingerprintProfile {
    const newFingerprint = this.generateFingerprint();
    this.currentFingerprint = newFingerprint;
    return newFingerprint;
  }

  getCurrentFingerprint(): FingerprintProfile | null {
    return this.currentFingerprint;
  }

  saveFingerprint(sessionId: string): void {
    if (this.currentFingerprint) {
      this.fingerprintHistory.set(sessionId, this.currentFingerprint);
    }
  }

  loadFingerprint(sessionId: string): FingerprintProfile | null {
    return this.fingerprintHistory.get(sessionId) || null;
  }
}