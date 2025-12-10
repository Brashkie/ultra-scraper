/**
 * Utilidades del proyecto
 */

/**
 * Lista de User-Agents comunes
 */
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Obtiene un User-Agent aleatorio
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Espera un tiempo determinado
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Valida si una URL es válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normaliza una URL
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Extrae el dominio de una URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Determina si un código de estado es exitoso
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Determina si un código de estado requiere reintento
 */
export function shouldRetry(status: number): boolean {
  return status >= 500 || status === 429 || status === 408;
}

/**
 * Sanitiza texto extraído
 */
export function sanitizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Convierte headers de axios a objeto plano
 */
export function normalizeHeaders(headers: any): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (!headers) return normalized;

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key] = value;
    } else if (Array.isArray(value)) {
      normalized[key] = value.join(', ');
    } else if (value !== undefined && value !== null) {
      normalized[key] = String(value);
    }
  }

  return normalized;
}

/**
 * Calcula backoff exponencial para reintentos
 */
export function exponentialBackoff(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}
