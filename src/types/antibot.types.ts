export enum BlockType {
  CLOUDFLARE_CHALLENGE = 'cloudflare_challenge',
  CLOUDFLARE_TURNSTILE = 'cloudflare_turnstile',
  RECAPTCHA_V2 = 'recaptcha_v2',
  RECAPTCHA_V3 = 'recaptcha_v3',
  HCAPTCHA = 'hcaptcha',
  FUNCAPTCHA = 'funcaptcha',
  GEETEST = 'geetest',
  RATE_LIMIT_403 = 'rate_limit_403',
  RATE_LIMIT_429 = 'rate_limit_429',
  IP_BLOCK = 'ip_block',
  GEO_BLOCK = 'geo_block',
  WAF_BLOCK = 'waf_block',
  UNKNOWN = 'unknown'
}

export enum BypassStrategy {
  CHANGE_PROXY = 'change_proxy',
  CHANGE_USER_AGENT = 'change_user_agent',
  WAIT_AND_RETRY = 'wait_and_retry',
  SOLVE_CAPTCHA = 'solve_captcha',
  ROTATE_FINGERPRINT = 'rotate_fingerprint',
  HUMAN_BEHAVIOR = 'human_behavior',
  STEALTH_MODE = 'stealth_mode'
}

export interface BlockDetection {
  type: BlockType;
  confidence: number; // 0-1
  detectedAt: number;
  url: string;
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
  metadata?: Record<string, any>;
}

export interface BypassResult {
  success: boolean;
  strategy: BypassStrategy;
  attempts: number;
  duration: number;
  error?: Error;
}

export interface FingerprintProfile {
  userAgent: string;
  viewport: { width: number; height: number };
  screen: { width: number; height: number; colorDepth: number };
  timezone: string;
  language: string;
  languages: string[];
  platform: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  webgl: {
    vendor: string;
    renderer: string;
  };
  canvas: string;
  audio: string;
  fonts: string[];
  plugins: Array<{ name: string; description: string }>;
}

export interface AntiBotConfig {
  enableAutoDetection: boolean;
  enableAutoBypass: boolean;
  maxBypassAttempts: number;
  
  cloudflare: {
    enabled: boolean;
    waitForChallenge: boolean;
    maxWaitTime: number;
  };
  
  captcha: {
    enabled: boolean;
    autoSolve: boolean;
    provider?: '2captcha' | 'anticaptcha' | 'capsolver';
    apiKey?: string;
  };
  
  fingerprint: {
    enabled: boolean;
    rotateOnBlock: boolean;
    consistentSession: boolean;
  };
  
  humanBehavior: {
    enabled: boolean;
    mouseMovements: boolean;
    randomScrolling: boolean;
    randomDelays: boolean;
    typingSpeed: number; // chars per second
  };
  
  stealth: {
    enabled: boolean;
    hideWebdriver: boolean;
    hideAutomation: boolean;
    spoofPermissions: boolean;
    spoofWebGL: boolean;
    spoofCanvas: boolean;
  };
}