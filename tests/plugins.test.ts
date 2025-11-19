
import { useProxyRotation, useRandomUserAgent, useRateLimit } from '../src/plugins';
import { RequestConfig } from '../src/types';

describe('Plugins', () => {
  describe('ProxyRotation', () => {
    it('should rotate through proxies', () => {
      const proxies = ['proxy1:8080', 'proxy2:8080', 'proxy3:8080'];
      const plugin = useProxyRotation(proxies);

      const config: RequestConfig = {
        url: 'https://example.com',
      };

      const result1 = plugin.beforeRequest!(config);
      expect(result1.proxy).toBe('proxy1:8080');

      const result2 = plugin.beforeRequest!(config);
      expect(result2.proxy).toBe('proxy2:8080');

      const result3 = plugin.beforeRequest!(config);
      expect(result3.proxy).toBe('proxy3:8080');

      const result4 = plugin.beforeRequest!(config);
      expect(result4.proxy).toBe('proxy1:8080'); // Should rotate back
    });

    it('should throw error for empty proxy list', () => {
      expect(() => useProxyRotation([])).toThrow();
    });
  });

  describe('RandomUserAgent', () => {
    it('should add random user agent to request', () => {
      const plugin = useRandomUserAgent();

      const config: RequestConfig = {
        url: 'https://example.com',
      };

      const result = plugin.beforeRequest!(config);

      expect(result.headers).toBeDefined();
      expect(result.headers!['User-Agent']).toBeDefined();
      expect(typeof result.headers!['User-Agent']).toBe('string');
    });

    it('should preserve existing headers', () => {
      const plugin = useRandomUserAgent();

      const config: RequestConfig = {
        url: 'https://example.com',
        headers: {
          'X-Custom': 'value',
        },
      };

      const result = plugin.beforeRequest!(config);

      expect(result.headers!['X-Custom']).toBe('value');
      expect(result.headers!['User-Agent']).toBeDefined();
    });
  });

  describe('RateLimit', () => {
    it('should enforce rate limit', async () => {
      const plugin = useRateLimit({ requestsPerSecond: 10 });

      const config: RequestConfig = {
        url: 'https://example.com',
      };

      const start = Date.now();

      await plugin.beforeRequest!(config);
      await plugin.beforeRequest!(config);

      const elapsed = Date.now() - start;

      // Should take at least 100ms for 2 requests at 10 req/s
      expect(elapsed).toBeGreaterThanOrEqual(80); // Small margin for timing
    }, 10000);

    it('should use default rate limit', () => {
      const plugin = useRateLimit();
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('RateLimit');
    });
  });
});
