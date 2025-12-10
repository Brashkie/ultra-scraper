export enum StrategyType {
  ROUND_ROBIN = 'round-robin',
  LEAST_USED = 'least-used',
  RANDOM = 'random',
  WEIGHTED = 'weighted',
  LEAST_RESPONSE_TIME = 'least-response-time',
  IP_HASH = 'ip-hash'
}

export interface PoolResource {
  id: string;
  weight?: number;
  activeConnections: number;
  totalRequests: number;
  avgResponseTime: number;
  isHealthy: boolean;
}

export abstract class PoolStrategy {
  abstract select(resources: PoolResource[], key?: string): PoolResource | null;
  abstract getName(): StrategyType;
}