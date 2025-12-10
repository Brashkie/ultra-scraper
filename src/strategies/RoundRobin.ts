import { PoolStrategy, PoolResource, StrategyType } from './PoolStrategy';

export class RoundRobin extends PoolStrategy {
  private currentIndex: number = 0;

  select(resources: PoolResource[]): PoolResource | null {
    const healthyResources = resources.filter(r => r.isHealthy);
    
    if (healthyResources.length === 0) {
      return null;
    }

    const selected = healthyResources[this.currentIndex % healthyResources.length];
    this.currentIndex = (this.currentIndex + 1) % healthyResources.length;

    return selected;
  }

  getName(): StrategyType {
    return StrategyType.ROUND_ROBIN;
  }

  reset(): void {
    this.currentIndex = 0;
  }
}