import { Page, BrowserContext } from 'playwright';

interface StealthConfig {
  enabled: boolean;
  hideWebdriver: boolean;
  hideAutomation: boolean;
  spoofPermissions: boolean;
  spoofWebGL: boolean;
  spoofCanvas: boolean;
  spoofAudio: boolean;
  spoofClientRects: boolean;
  evasions?: {
    chrome?: boolean;
    navigator?: boolean;
    media?: boolean;
    iframe?: boolean;
  };
}

export class StealthMode {
  constructor(private config: StealthConfig) {}

  async apply(page: Page): Promise<void> {
    if (!this.config.enabled) return;

    await this.applyAllEvasions(page);
  }

  async applyToContext(context: BrowserContext): Promise<void> {
    if (!this.config.enabled) return;

    // Aplicar evasiones a nivel de contexto
    await context.addInitScript(this.getContextEvasionScript());
  }

  private async applyAllEvasions(page: Page): Promise<void> {
    await page.addInitScript(this.getFullEvasionScript());
  }

  private getFullEvasionScript(): string {
    return `
      (() => {
        'use strict';

        ${this.config.hideWebdriver ? this.getWebdriverEvasion() : ''}
        ${this.config.hideAutomation ? this.getAutomationEvasion() : ''}
        ${this.config.evasions?.chrome ? this.getChromeEvasion() : ''}
        ${this.config.evasions?.navigator ? this.getNavigatorEvasion() : ''}
        ${this.config.spoofPermissions ? this.getPermissionsEvasion() : ''}
        ${this.config.spoofWebGL ? this.getWebGLEvasion() : ''}
        ${this.config.spoofCanvas ? this.getCanvasEvasion() : ''}
        ${this.config.spoofAudio ? this.getAudioEvasion() : ''}
        ${this.config.spoofClientRects ? this.getClientRectsEvasion() : ''}
        ${this.config.evasions?.media ? this.getMediaEvasion() : ''}
        ${this.config.evasions?.iframe ? this.getIframeEvasion() : ''}
        ${this.getPluginsEvasion()}
        ${this.getMiscEvasions()}
      })();
    `;
  }

  private getContextEvasionScript(): string {
    return this.getFullEvasionScript();
  }

  // 1. WebDriver Evasion
  private getWebdriverEvasion(): string {
    return `
      // Remove webdriver property
      delete Object.getPrototypeOf(navigator).webdriver;
      
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });

      // Remove automated test keywords
      const originalNavigator = navigator;
      Object.defineProperty(window, 'navigator', {
        value: new Proxy(originalNavigator, {
          get: (target, prop) => {
            if (prop === 'webdriver') {
              return undefined;
            }
            return target[prop];
          }
        })
      });
    `;
  }

  // 2. Automation Evasion
  private getAutomationEvasion(): string {
    return `
      // Remove automation flags
      if (window.document) {
        delete window.document.__playwright;
        delete window.document.__puppeteer;
        delete window.document.__selenium;
      }

      // Override automation detection
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });

      // Remove CDP (Chrome DevTools Protocol)
      if (window.chrome && window.chrome.runtime) {
        const originalRuntime = window.chrome.runtime;
        delete window.chrome.runtime;
        Object.defineProperty(window.chrome, 'runtime', {
          get: () => undefined
        });
      }

      // Override call stack inspection
      const originalError = Error;
      Error = class extends originalError {
        constructor(...args) {
          super(...args);
          this.stack = this.stack
            ?.split('\\n')
            .filter(line => !line.includes('playwright'))
            .filter(line => !line.includes('puppeteer'))
            .filter(line => !line.includes('selenium'))
            .join('\\n');
        }
      };
    `;
  }

  // 3. Chrome Runtime Evasion
  private getChromeEvasion(): string {
    return `
      // Add chrome runtime if missing
      if (!window.chrome) {
        window.chrome = {};
      }

      if (!window.chrome.runtime) {
        window.chrome.runtime = {
          OnInstalledReason: {
            CHROME_UPDATE: "chrome_update",
            INSTALL: "install",
            SHARED_MODULE_UPDATE: "shared_module_update",
            UPDATE: "update"
          },
          OnRestartRequiredReason: {
            APP_UPDATE: "app_update",
            OS_UPDATE: "os_update",
            PERIODIC: "periodic"
          },
          PlatformArch: {
            ARM: "arm",
            ARM64: "arm64",
            MIPS: "mips",
            MIPS64: "mips64",
            X86_32: "x86-32",
            X86_64: "x86-64"
          },
          PlatformNaclArch: {
            ARM: "arm",
            MIPS: "mips",
            MIPS64: "mips64",
            X86_32: "x86-32",
            X86_64: "x86-64"
          },
          PlatformOs: {
            ANDROID: "android",
            CROS: "cros",
            LINUX: "linux",
            MAC: "mac",
            OPENBSD: "openbsd",
            WIN: "win"
          },
          RequestUpdateCheckStatus: {
            NO_UPDATE: "no_update",
            THROTTLED: "throttled",
            UPDATE_AVAILABLE: "update_available"
          }
        };
      }

      // Add chrome app
      if (!window.chrome.app) {
        window.chrome.app = {
          isInstalled: false,
          InstallState: {
            DISABLED: "disabled",
            INSTALLED: "installed",
            NOT_INSTALLED: "not_installed"
          },
          RunningState: {
            CANNOT_RUN: "cannot_run",
            READY_TO_RUN: "ready_to_run",
            RUNNING: "running"
          }
        };
      }

      // Add chrome csi
      if (!window.chrome.csi) {
        window.chrome.csi = function() {};
      }

      // Add chrome loadTimes
      if (!window.chrome.loadTimes) {
        window.chrome.loadTimes = function() {
          return {
            commitLoadTime: Date.now() / 1000 - Math.random(),
            connectionInfo: 'http/1.1',
            finishDocumentLoadTime: Date.now() / 1000 - Math.random() + 0.5,
            finishLoadTime: Date.now() / 1000 - Math.random() + 1,
            firstPaintAfterLoadTime: 0,
            firstPaintTime: Date.now() / 1000 - Math.random() + 0.2,
            navigationType: 'Other',
            npnNegotiatedProtocol: 'http/1.1',
            requestTime: Date.now() / 1000 - Math.random() - 2,
            startLoadTime: Date.now() / 1000 - Math.random() - 1,
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: false,
            wasNpnNegotiated: false
          };
        };
      }
    `;
  }

  // 4. Navigator Evasion
  private getNavigatorEvasion(): string {
    return `
      // Override navigator properties
      Object.defineProperties(navigator, {
        // Connection
        connection: {
          get: () => ({
            effectiveType: '4g',
            rtt: 50,
            downlink: 10,
            saveData: false
          })
        },

        // Battery (deprecated but still checked)
        getBattery: {
          value: () => Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1
          })
        }
      });

      // Remove headless indicators
      if (navigator.plugins.length === 0) {
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin"
            },
            {
              0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
              description: "",
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
              length: 1,
              name: "Chrome PDF Viewer"
            },
            {
              0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin},
              1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin},
              description: "",
              filename: "internal-nacl-plugin",
              length: 2,
              name: "Native Client"
            }
          ]
        });
      }

      // Add mimeTypes
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => [
          {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
          {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
          {type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin},
          {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin}
        ]
      });
    `;
  }

  // 5. Permissions Evasion
  private getPermissionsEvasion(): string {
    return `
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Spoof notification permission
      const originalPermission = Notification.permission;
      Object.defineProperty(Notification, 'permission', {
        get: () => originalPermission === 'default' ? 'denied' : originalPermission
      });
    `;
  }

  // 6. WebGL Evasion
  private getWebGLEvasion(): string {
    return `
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };

      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter2.call(this, parameter);
      };
    `;
  }

  // 7. Canvas Evasion
  private getCanvasEvasion(): string {
    return `
      // Add slight noise to canvas fingerprint
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

      // Noise function
      const makeNoise = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;
        const imageData = ctx.getImageData(0, 0, 1, 1);
        const pixel = imageData.data;
        pixel[0] = pixel[0] + Math.floor(Math.random() * 10) - 5;
        pixel[1] = pixel[1] + Math.floor(Math.random() * 10) - 5;
        pixel[2] = pixel[2] + Math.floor(Math.random() * 10) - 5;
        pixel[3] = pixel[3] + Math.floor(Math.random() * 10) - 5;
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
      };

      // Override toDataURL
      Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
        value: function() {
          const context = this.getContext('2d');
          if (context) {
            // Add minimal noise
            const imageData = context.getImageData(0, 0, this.width, this.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = imageData.data[i] + Math.floor(Math.random() * 2) - 1;
            }
            context.putImageData(imageData, 0, 0);
          }
          return originalToDataURL.apply(this, arguments);
        }
      });
    `;
  }

  // 8. Audio Evasion
  private getAudioEvasion(): string {
    return `
      const audioContext = window.AudioContext || window.webkitAudioContext;
      if (audioContext) {
        const OriginalAnalyser = audioContext.prototype.createAnalyser;
        audioContext.prototype.createAnalyser = function() {
          const analyser = OriginalAnalyser.call(this);
          const getFloatFrequencyData = analyser.getFloatFrequencyData;
          analyser.getFloatFrequencyData = function(array) {
            getFloatFrequencyData.call(this, array);
            for (let i = 0; i < array.length; i++) {
              array[i] = array[i] + Math.random() * 0.0001;
            }
            return array;
          };
          return analyser;
        };
      }
    `;
  }

  // 9. Client Rects Evasion
  private getClientRectsEvasion(): string {
    return `
      // Add slight noise to element measurements
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function() {
        const rect = originalGetBoundingClientRect.apply(this, arguments);
        const noise = () => Math.random() * 0.0001;
        return {
          x: rect.x + noise(),
          y: rect.y + noise(),
          width: rect.width + noise(),
          height: rect.height + noise(),
          top: rect.top + noise(),
          right: rect.right + noise(),
          bottom: rect.bottom + noise(),
          left: rect.left + noise()
        };
      };
    `;
  }

  // 10. Media Devices Evasion
  private getMediaEvasion(): string {
    return `
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const enumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function() {
          return enumerateDevices.call(this).then(devices => {
            return devices.map(device => {
              return {
                deviceId: device.deviceId,
                kind: device.kind,
                label: device.label,
                groupId: device.groupId,
                toJSON: () => ({
                  deviceId: device.deviceId,
                  kind: device.kind,
                  label: device.label,
                  groupId: device.groupId
                })
              };
            });
          });
        };
      }
    `;
  }

  // 11. Iframe Evasion
  private getIframeEvasion(): string {
    return `
      // Prevent iframe detection
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        get: function() {
          const win = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get.call(this);
          if (win) {
            win.navigator.webdriver = false;
          }
          return win;
        }
      });
    `;
  }

  // 12. Plugins Evasion
  private getPluginsEvasion(): string {
    return `
      // Make plugins non-empty
      if (navigator.plugins.length === 0) {
        const plugins = [
          {
            name: 'Chrome PDF Plugin',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format'
          },
          {
            name: 'Chrome PDF Viewer',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            description: ''
          },
          {
            name: 'Native Client',
            filename: 'internal-nacl-plugin',
            description: ''
          }
        ];

        Object.defineProperty(navigator, 'plugins', {
          get: () => plugins
        });
      }
    `;
  }

  // 13. Misc Evasions
  private getMiscEvasions(): string {
    return `
      // Remove headless flag from user agent
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        get: () => originalUserAgent.replace(/HeadlessChrome/g, 'Chrome')
      });

      // Spoof window.outerWidth/Height
      if (window.outerWidth === 0) {
        Object.defineProperty(window, 'outerWidth', {
          get: () => window.innerWidth
        });
      }
      if (window.outerHeight === 0) {
        Object.defineProperty(window, 'outerHeight', {
          get: () => window.innerHeight
        });
      }

      // Fix chrome detection
      const originalChrome = window.chrome;
      delete window.chrome;
      window.chrome = originalChrome || {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Remove Playwright/Puppeteer/Selenium detection
      const stripProp = (obj, prop) => {
        const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
        if (descriptor && descriptor.configurable) {
          delete obj[prop];
        }
      };

      stripProp(window, '__playwright');
      stripProp(window, '__puppeteer');
      stripProp(window, '__selenium');
      stripProp(window, '__webdriver_script_fn');
      stripProp(window, '__driver_evaluate');
      stripProp(window, '__webdriver_evaluate');
      stripProp(window, '__selenium_evaluate');
      stripProp(window, '__fxdriver_evaluate');
      stripProp(window, '__driver_unwrapped');
      stripProp(window, '__webdriver_unwrapped');
      stripProp(window, '__selenium_unwrapped');
      stripProp(window, '__fxdriver_unwrapped');
      stripProp(window, '$cdc_asdjflasutopfhvcZLmcfl_');
      stripProp(window, '$chrome_asyncScriptInfo');
      stripProp(window, '__$webdriverAsyncExecutor');

      // Fix Date.prototype.getTimezoneOffset
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        return originalGetTimezoneOffset.call(this);
      };
    `;
  }

  // Test evasions
  async testEvasions(page: Page): Promise<Record<string, boolean>> {
    return await page.evaluate(() => {
      const results: Record<string, boolean> = {};

      // Test webdriver
      results.webdriver = navigator.webdriver === undefined;

      // Test chrome
      results.chrome = (window as any).chrome !== undefined;

      // Test plugins
      results.plugins = navigator.plugins.length > 0;

      // Test permissions
      results.permissions = typeof navigator.permissions?.query === 'function';

      // Test languages
      results.languages = navigator.languages && navigator.languages.length > 0;

      return results;
    });
  }
}