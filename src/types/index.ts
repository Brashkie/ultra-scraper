import { CheerioAPI } from 'cheerio';

/**
 * Opciones de configuración del scraper
 */
export interface ScraperOptions {
  /** Habilitar modo headless (navegador) */
  dynamic?: boolean;
  /** User-agent personalizado */
  userAgent?: string;
  /** Timeout en milisegundos */
  timeout?: number;
  /** Número de reintentos */
  retries?: number;
  /** Delay entre reintentos (ms) */
  retryDelay?: number;
  /** Headers HTTP personalizados */
  headers?: Record<string, string>;
  /** URL del proxy */
  proxy?: string;
  /** Esperar por selector específico (modo dinámico) */
  waitForSelector?: string;
  /** Tiempo de espera después de cargar la página (ms) */
  waitTime?: number;
}

/**
 * Respuesta del scraper
 */
export interface ScraperResponse {
  /** HTML completo de la página */
  html: string;
  /** Código de estado HTTP */
  status: number;
  /** Headers de la respuesta */
  headers: Record<string, string>;
  /** URL final (después de redirecciones) */
  url: string;
  /** Tiempo de respuesta en ms */
  responseTime: number;
}

/**
 * Configuración de extracción estructurada
 */
export interface ExtractionSchema {
  /** Selector CSS del contenedor */
  selector: string;
  /** Campos a extraer */
  fields: Record<string, FieldConfig>;
  /** Límite de resultados */
  limit?: number;
}

/**
 * Configuración de un campo a extraer
 */
export interface FieldConfig {
  /** Selector CSS del campo */
  selector: string;
  /** Atributo a extraer ('text', 'html', o nombre de atributo) */
  attr: string;
  /** Transformación a aplicar */
  transform?: (value: string) => any;
  /** Valor por defecto si no se encuentra */
  default?: any;
}

/**
 * Plugin del scraper
 */
export interface ScraperPlugin {
  name: string;
  beforeRequest?: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
  afterRequest?: (response: ScraperResponse) => Promise<ScraperResponse> | ScraperResponse;
  onError?: (error: Error) => Promise<void> | void;
}

/**
 * Configuración de una petición
 */
export interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  timeout?: number;
  proxy?: string;
  retries?: number;
}

/**
 * Eventos del scraper
 */
export type ScraperEvent = 'beforeRequest' | 'afterRequest' | 'error' | 'retry';

/**
 * Listener de eventos
 */
export type EventListener = (...args: any[]) => void | Promise<void>;

/**
 * Error del scraper
 */
export class ScraperError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public url?: string
  ) {
    super(message);
    this.name = 'ScraperError';
    Object.setPrototypeOf(this, ScraperError.prototype);
  }
}

/**
 * Interfaz principal del scraper
 */
export interface IScraper {
  get(url: string, options?: Partial<ScraperOptions>): Promise<ScraperResponse>;
  query(url: string, selector: string, options?: Partial<ScraperOptions>): Promise<CheerioAPI>;
  extract(url: string, schema: ExtractionSchema, options?: Partial<ScraperOptions>): Promise<any[]>;
  use(plugin: ScraperPlugin): void;
  on(event: ScraperEvent, listener: EventListener): void;
}

// ============================================
// NUEVOS EXPORTS - QUEUE TYPES
// ============================================

export {
  Task,
  TaskPriority,
  TaskStatus,
  QueueConfig,
  QueueMetrics,
  ScheduleConfig,
  ScheduledTask,
  PersistenceConfig,
  DeadLetterConfig,
  TaskResult,
  QueueState,
  RetryPolicy,
  TimeoutConfig
} from './queue.types';

// ============================================
// NUEVOS EXPORTS - ANTI-BOT TYPES
// ============================================

export {
  BlockType,
  BlockDetection,
  BypassStrategy,
  BypassResult,
  FingerprintProfile,
  AntiBotConfig
} from './antibot.types';

// ============================================
// NUEVOS EXPORTS - POOL TYPES
// ============================================

export {
  BrowserPoolConfig,
  BrowserInstanceConfig,
  BrowserMetrics,
  PoolMetrics,
  PoolStrategy,
  HealthCheckResult
} from './pool.types';

// ============================================
// NUEVOS EXPORTS - MONITORING TYPES
// ============================================

export {
  MetricsSnapshot,
  PerformanceMetrics,
  ConcurrencyMetrics,
  RateLimitMetrics,
  LoadBalancerMetrics,
  TargetMetrics,
  AntiBotMetrics,
  SystemMetrics,
  MonitoringConfig,
  MetricType,
  Metric,
  TimeSeriesData
} from './monitoring.types';

// Re-export all (para imports con *)
export * from './queue.types';
export * from './antibot.types';
export * from './pool.types';
export * from './monitoring.types';