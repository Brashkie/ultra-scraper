import {
  isValidUrl,
  normalizeUrl,
  extractDomain,
  isSuccessStatus,
  shouldRetry,
  sanitizeText,
  exponentialBackoff,
  getRandomUserAgent,
} from '../src/utils/helpers';

describe('Helpers', () => {
  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize URLs', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('should throw error for invalid URLs', () => {
      expect(() => normalizeUrl('invalid')).toThrow();
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('https://sub.example.com')).toBe('sub.example.com');
    });

    it('should return empty string for invalid URL', () => {
      expect(extractDomain('invalid')).toBe('');
    });
  });

  describe('isSuccessStatus', () => {
    it('should identify success status codes', () => {
      expect(isSuccessStatus(200)).toBe(true);
      expect(isSuccessStatus(201)).toBe(true);
      expect(isSuccessStatus(299)).toBe(true);
    });

    it('should reject non-success status codes', () => {
      expect(isSuccessStatus(404)).toBe(false);
      expect(isSuccessStatus(500)).toBe(false);
      expect(isSuccessStatus(301)).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    it('should identify retryable status codes', () => {
      expect(shouldRetry(500)).toBe(true);
      expect(shouldRetry(502)).toBe(true);
      expect(shouldRetry(429)).toBe(true);
      expect(shouldRetry(408)).toBe(true);
    });

    it('should reject non-retryable status codes', () => {
      expect(shouldRetry(200)).toBe(false);
      expect(shouldRetry(404)).toBe(false);
      expect(shouldRetry(401)).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('should remove extra whitespace', () => {
      expect(sanitizeText('  hello   world  ')).toBe('hello world');
      expect(sanitizeText('hello\n\nworld')).toBe('hello world');
    });

    it('should trim text', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });
  });

  describe('exponentialBackoff', () => {
    it('should calculate exponential backoff', () => {
      expect(exponentialBackoff(0, 1000)).toBe(1000);
      expect(exponentialBackoff(1, 1000)).toBe(2000);
      expect(exponentialBackoff(2, 1000)).toBe(4000);
    });

    it('should cap at maximum value', () => {
      expect(exponentialBackoff(10, 1000)).toBe(30000);
    });
  });

  describe('getRandomUserAgent', () => {
    it('should return a user agent string', () => {
      const ua = getRandomUserAgent();
      expect(typeof ua).toBe('string');
      expect(ua.length).toBeGreaterThan(0);
    });

    it('should return different user agents (probabilistically)', () => {
      const uas = new Set();
      for (let i = 0; i < 20; i++) {
        uas.add(getRandomUserAgent());
      }
      expect(uas.size).toBeGreaterThan(1);
    });
  });
});
