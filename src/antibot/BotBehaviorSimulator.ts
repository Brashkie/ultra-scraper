import { Page } from 'playwright';

interface BehaviorConfig {
  enabled: boolean;
  mouseMovements: boolean;
  randomScrolling: boolean;
  randomDelays: boolean;
  typingSpeed: number; // characters per second
  humanLikeClicks: boolean;
  randomPauses: boolean;
}

export class BotBehaviorSimulator {
  constructor(private config: BehaviorConfig) {}

  async simulateHumanBehavior(page: Page): Promise<void> {
    if (!this.config.enabled) return;

    // Simular movimiento de mouse al cargar la página
    if (this.config.mouseMovements) {
      await this.simulateMouseMovement(page);
    }

    // Scroll aleatorio
    if (this.config.randomScrolling) {
      await this.simulateScrolling(page);
    }

    // Pausa aleatoria
    if (this.config.randomPauses) {
      await this.randomPause();
    }
  }

  async simulateMouseMovement(page: Page, targetSelector?: string): Promise<void> {
    try {
      const viewport = page.viewportSize();
      if (!viewport) return;

      if (targetSelector) {
        // Mover hacia un elemento específico
        const element = await page.$(targetSelector);
        if (element) {
          const box = await element.boundingBox();
          if (box) {
            await this.moveMouseToPoint(page, {
              x: box.x + box.width / 2,
              y: box.y + box.height / 2
            });
          }
        }
      } else {
        // Movimiento aleatorio natural
        const points = this.generateNaturalPath(
          { x: 0, y: 0 },
          {
            x: Math.random() * viewport.width,
            y: Math.random() * viewport.height
          },
          10
        );

        for (const point of points) {
          await page.mouse.move(point.x, point.y);
          await this.sleep(10 + Math.random() * 20);
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  private generateNaturalPath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    steps: number
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    
    // Bezier curve for natural movement
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Add some randomness
      const noise = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10
      };

      // Ease in-out function
      const eased = t < 0.5 
        ? 2 * t * t 
        : -1 + (4 - 2 * t) * t;

      points.push({
        x: start.x + (end.x - start.x) * eased + noise.x,
        y: start.y + (end.y - start.y) * eased + noise.y
      });
    }

    return points;
  }

  private async moveMouseToPoint(
    page: Page,
    target: { x: number; y: number }
  ): Promise<void> {
    const current = await page.evaluate(() => {
      const w = window as any;
      return {
        x: w.mouseX || 0,
        y: w.mouseY || 0
      };
    });

    const path = this.generateNaturalPath(current, target, 20);

    for (const point of path) {
      await page.mouse.move(point.x, point.y);
      await this.sleep(5 + Math.random() * 15);
    }
  }

  async simulateScrolling(page: Page, options?: {
    direction?: 'down' | 'up' | 'random';
    distance?: number;
    smooth?: boolean;
  }): Promise<void> {
    const opts = {
      direction: options?.direction || 'down',
      distance: options?.distance || Math.random() * 500 + 200,
      smooth: options?.smooth !== false
    };

    const scrollAmount = opts.direction === 'up' ? -opts.distance : opts.distance;

    if (opts.smooth) {
      // Smooth scroll
      const steps = 10 + Math.floor(Math.random() * 10);
      const stepSize = scrollAmount / steps;

      for (let i = 0; i < steps; i++) {
        await page.evaluate((step) => {
          window.scrollBy(0, step);
        }, stepSize);

        await this.sleep(50 + Math.random() * 50);
      }
    } else {
      // Instant scroll
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
    }

    // Pause after scrolling
    await this.randomPause(200, 800);
  }

  async simulateClick(page: Page, selector: string): Promise<void> {
    try {
      const element = await page.$(selector);
      if (!element) return;

      // Move mouse to element
      if (this.config.mouseMovements) {
        await this.simulateMouseMovement(page, selector);
        await this.randomPause(100, 300);
      }

      // Click with human-like behavior
      if (this.config.humanLikeClicks) {
        // Random position within element
        const box = await element.boundingBox();
        if (box) {
          const x = box.x + Math.random() * box.width;
          const y = box.y + Math.random() * box.height;

          // Mouse down
          await page.mouse.move(x, y);
          await this.sleep(50 + Math.random() * 100);
          await page.mouse.down();
          await this.sleep(50 + Math.random() * 100);
          await page.mouse.up();
        }
      } else {
        await element.click();
      }

      // Pause after click
      await this.randomPause(300, 1000);
    } catch (error) {
      // Ignore errors
    }
  }

  async simulateTyping(page: Page, selector: string, text: string): Promise<void> {
    try {
      const element = await page.$(selector);
      if (!element) return;

      // Click to focus
      await this.simulateClick(page, selector);

      // Type with delays
      const delayPerChar = 1000 / this.config.typingSpeed;

      for (const char of text) {
        await page.keyboard.type(char);
        
        // Random delay between characters
        const delay = delayPerChar + (Math.random() - 0.5) * delayPerChar * 0.5;
        await this.sleep(delay);

        // Occasional longer pauses (thinking)
        if (Math.random() < 0.1) {
          await this.sleep(200 + Math.random() * 500);
        }
      }

      // Pause after typing
      await this.randomPause(500, 1500);
    } catch (error) {
      // Ignore errors
    }
  }

  async simulateReading(page: Page, duration?: number): Promise<void> {
    const readTime = duration || 2000 + Math.random() * 3000;
    
    // Random small scrolls while "reading"
    const startTime = Date.now();
    
    while (Date.now() - startTime < readTime) {
      if (Math.random() < 0.3 && this.config.randomScrolling) {
        await this.simulateScrolling(page, {
          direction: Math.random() < 0.8 ? 'down' : 'up',
          distance: Math.random() * 100 + 50,
          smooth: true
        });
      }

      await this.sleep(500 + Math.random() * 1000);
    }
  }

  async simulateFormFilling(
    page: Page,
    fields: Array<{ selector: string; value: string }>
  ): Promise<void> {
    for (const field of fields) {
      // Random pause before filling each field
      await this.randomPause(500, 2000);

      // Scroll to field if needed
      if (this.config.randomScrolling) {
        await page.locator(field.selector).scrollIntoViewIfNeeded();
        await this.randomPause(200, 500);
      }

      // Fill field
      await this.simulateTyping(page, field.selector, field.value);
    }
  }

  async simulatePageView(page: Page): Promise<void> {
    // Initial page load behavior
    await this.randomPause(500, 1500);

    // Random mouse movement
    if (this.config.mouseMovements) {
      await this.simulateMouseMovement(page);
    }

    // Read content
    await this.simulateReading(page);

    // Random scrolling
    if (this.config.randomScrolling) {
      const scrollCount = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < scrollCount; i++) {
        await this.simulateScrolling(page, {
          direction: 'down',
          smooth: true
        });
        await this.randomPause(1000, 3000);
      }
    }
  }

  async randomPause(min: number = 100, max: number = 500): Promise<void> {
    if (!this.config.randomDelays) return;
    
    const delay = min + Math.random() * (max - min);
    await this.sleep(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Verificar si el comportamiento parece humano
  async validateHumanBehavior(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      // Verificar que haya actividad de mouse
      const hasMouseActivity = (window as any).__mouseMovements > 0;
      
      // Verificar que haya scroll
      const hasScrollActivity = window.scrollY > 0;
      
      // Verificar timing natural
      const hasNaturalTiming = true; // Implementar lógica de timing
      
      return hasMouseActivity && hasScrollActivity && hasNaturalTiming;
    });
  }
}