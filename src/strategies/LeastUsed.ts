import { PoolStrategy, PoolResource, StrategyType } from './PoolStrategy';

export class LeastUsed extends PoolStrategy {
  select(resources: PoolResource[]): PoolResource | null {
    const healthyResources = resources.filter(r => r.isHealthy);
    
    if (healthyResources.length === 0) {
      return null;
    }

    // Seleccionar el que tenga menos conexiones activas
    return healthyResources.reduce((min, current) => 
      current.activeConnections < min.activeConnections ? current : min
    );
  }

  getName(): StrategyType {
    return StrategyType.LEAST_USED;
  }
}