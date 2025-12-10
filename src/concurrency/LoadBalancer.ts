import { EventEmitter } from 'events';

interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'least-response-time' | 'weighted-round-robin' | 'ip-hash' | 'random';
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    unhealthyThreshold: number;
    healthyThreshold: number;
  };
  stickySession?: {
    enabled: boolean;
    ttl: number; // Time to live in ms
  };
}

export interface Target {
  id: string;
  url: string;
  weight?: number;
  priority?: number;
  maxConnections?: number;
  metadata?: Record<string, any>;
}

interface TargetStats {
  target: Target;
  activeConnections: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  avgResponseTime: number;
  isHealthy: boolean;
  lastHealthCheck?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export class LoadBalancer extends EventEmitter {
  private targets: Map<string, TargetStats> = new Map();
  private currentIndex: number = 0;
  private sessionMap: Map<string, { targetId: string; expiresAt: number }> = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(private config: LoadBalancerConfig) {
    super();

    // Start health checks if enabled
    if (config.healthCheck?.enabled) {
      this.startHealthChecks();
    }

    // Start session cleanup
    if (config.stickySession?.enabled) {
      this.startSessionCleanup();
    }
  }

  // Target Management
  addTarget(target: Target): void {
    if (this.targets.has(target.id)) {
      throw new Error(`Target ${target.id} already exists`);
    }

    this.targets.set(target.id, {
      target,
      activeConnections: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      isHealthy: true,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    });

    this.emit('targetAdded', target);
  }

  removeTarget(targetId: string): void {
    if (this.targets.delete(targetId)) {
      this.emit('targetRemoved', { targetId });
    }
  }

  // Target Selection
  async selectTarget(sessionKey?: string): Promise<Target> {
    // Check sticky session
    if (sessionKey && this.config.stickySession?.enabled) {
      const session = this.sessionMap.get(sessionKey);
      
      if (session && session.expiresAt > Date.now()) {
        const targetStats = this.targets.get(session.targetId);
        
        if (targetStats && targetStats.isHealthy) {
          return targetStats.target;
        }
      }
    }

    // Get healthy targets
    const healthyTargets = Array.from(this.targets.values())
      .filter(stats => stats.isHealthy);

    if (healthyTargets.length === 0) {
      throw new Error('No healthy targets available');
    }

    // Select based on strategy
    let selectedStats: TargetStats;

    switch (this.config.strategy) {
      case 'round-robin':
        selectedStats = this.selectRoundRobin(healthyTargets);
        break;

      case 'least-connections':
        selectedStats = this.selectLeastConnections(healthyTargets);
        break;

      case 'least-response-time':
        selectedStats = this.selectLeastResponseTime(healthyTargets);
        break;

      case 'weighted-round-robin':
        selectedStats = this.selectWeightedRoundRobin(healthyTargets);
        break;

      case 'ip-hash':
        selectedStats = this.selectIPHash(healthyTargets, sessionKey);
        break;

      case 'random':
        selectedStats = this.selectRandom(healthyTargets);
        break;

      default:
        selectedStats = this.selectRoundRobin(healthyTargets);
    }

    // Create/update session
    if (sessionKey && this.config.stickySession?.enabled) {
      this.sessionMap.set(sessionKey, {
        targetId: selectedStats.target.id,
        expiresAt: Date.now() + this.config.stickySession.ttl
      });
    }

    this.emit('targetSelected', {
      target: selectedStats.target,
      strategy: this.config.strategy
    });

    return selectedStats.target;
  }

  // Selection Strategies
  private selectRoundRobin(targets: TargetStats[]): TargetStats {
    const selected = targets[this.currentIndex % targets.length];
    this.currentIndex = (this.currentIndex + 1) % targets.length;
    return selected;
  }

  private selectLeastConnections(targets: TargetStats[]): TargetStats {
    return targets.reduce((min, current) => 
      current.activeConnections < min.activeConnections ? current : min
    );
  }

  private selectLeastResponseTime(targets: TargetStats[]): TargetStats {
    // Filter targets with at least some requests
    const targetsWithData = targets.filter(t => t.totalRequests > 0);
    
    if (targetsWithData.length === 0) {
      return targets[0];
    }

    return targetsWithData.reduce((min, current) => 
      current.avgResponseTime < min.avgResponseTime ? current : min
    );
  }

  private selectWeightedRoundRobin(targets: TargetStats[]): TargetStats {
    // Build weighted array
    const weighted: TargetStats[] = [];
    
    for (const target of targets) {
      const weight = target.target.weight || 1;
      for (let i = 0; i < weight; i++) {
        weighted.push(target);
      }
    }

    const selected = weighted[this.currentIndex % weighted.length];
    this.currentIndex = (this.currentIndex + 1) % weighted.length;
    return selected;
  }

  private selectIPHash(targets: TargetStats[], key?: string): TargetStats {
    if (!key) {
      return targets[0];
    }

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % targets.length;
    return targets[index];
  }

  private selectRandom(targets: TargetStats[]): TargetStats {
    const index = Math.floor(Math.random() * targets.length);
    return targets[index];
  }

  // Request Tracking
  async executeRequest<T>(
    executor: (target: Target) => Promise<T>,
    sessionKey?: string
  ): Promise<T> {
    const target = await this.selectTarget(sessionKey);
    const stats = this.targets.get(target.id)!;

    stats.activeConnections++;
    stats.totalRequests++;

    const startTime = Date.now();

    try {
      const result = await executor(target);
      
      const duration = Date.now() - startTime;
      
      // Update stats
      stats.successfulRequests++;
      stats.consecutiveSuccesses++;
      stats.consecutiveFailures = 0;
      stats.totalResponseTime += duration;
      stats.avgResponseTime = stats.totalResponseTime / stats.successfulRequests;

      this.emit('requestCompleted', {
        targetId: target.id,
        duration,
        success: true
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Update stats
      stats.failedRequests++;
      stats.consecutiveFailures++;
      stats.consecutiveSuccesses = 0;

      this.emit('requestFailed', {
        targetId: target.id,
        duration,
        error
      });

      // Mark as unhealthy if too many consecutive failures
      if (this.config.healthCheck?.enabled) {
        const threshold = this.config.healthCheck.unhealthyThreshold;
        
        if (stats.consecutiveFailures >= threshold) {
          stats.isHealthy = false;
          this.emit('targetUnhealthy', { targetId: target.id });
        }
      }

      throw error;

    } finally {
      stats.activeConnections--;
    }
  }

  // Health Checks
  private startHealthChecks(): void {
    const interval = this.config.healthCheck!.interval;

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, interval);
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.targets.values()).map(stats => 
      this.checkTargetHealth(stats)
    );

    await Promise.allSettled(promises);
  }

  private async checkTargetHealth(stats: TargetStats): Promise<void> {
    const timeout = this.config.healthCheck!.timeout;
    const healthyThreshold = this.config.healthCheck!.healthyThreshold;
    const unhealthyThreshold = this.config.healthCheck!.unhealthyThreshold;

    try {
      // Simple HTTP GET health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(stats.target.url, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        stats.consecutiveSuccesses++;
        stats.consecutiveFailures = 0;

        // Mark as healthy if was unhealthy
        if (!stats.isHealthy && stats.consecutiveSuccesses >= healthyThreshold) {
          stats.isHealthy = true;
          this.emit('targetHealthy', { targetId: stats.target.id });
        }
      } else {
        throw new Error(`Health check failed with status ${response.status}`);
      }

      stats.lastHealthCheck = Date.now();

    } catch (error) {
      stats.consecutiveFailures++;
      stats.consecutiveSuccesses = 0;

      // Mark as unhealthy
      if (stats.isHealthy && stats.consecutiveFailures >= unhealthyThreshold) {
        stats.isHealthy = false;
        this.emit('targetUnhealthy', { 
          targetId: stats.target.id,
          error 
        });
      }

      stats.lastHealthCheck = Date.now();
    }
  }

  // Session Management
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [key, session] of this.sessionMap) {
        if (session.expiresAt < now) {
          this.sessionMap.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  // Statistics
  getStats(targetId?: string) {
    if (targetId) {
      const stats = this.targets.get(targetId);
      return stats ? this.formatStats(stats) : null;
    }

    return Array.from(this.targets.values()).map(stats => 
      this.formatStats(stats)
    );
  }

  private formatStats(stats: TargetStats) {
    const successRate = stats.totalRequests > 0
      ? stats.successfulRequests / stats.totalRequests
      : 0;

    const errorRate = stats.totalRequests > 0
      ? stats.failedRequests / stats.totalRequests
      : 0;

    return {
      targetId: stats.target.id,
      url: stats.target.url,
      activeConnections: stats.activeConnections,
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      avgResponseTime: Math.round(stats.avgResponseTime),
      successRate,
      errorRate,
      isHealthy: stats.isHealthy,
      lastHealthCheck: stats.lastHealthCheck,
      consecutiveFailures: stats.consecutiveFailures,
      consecutiveSuccesses: stats.consecutiveSuccesses
    };
  }

  getAllStats() {
    const allStats = Array.from(this.targets.values());
    const totalRequests = allStats.reduce((sum, s) => sum + s.totalRequests, 0);
    const totalSuccessful = allStats.reduce((sum, s) => sum + s.successfulRequests, 0);
    const totalFailed = allStats.reduce((sum, s) => sum + s.failedRequests, 0);
    const activeTargets = allStats.filter(s => s.isHealthy).length;

    return {
      strategy: this.config.strategy,
      totalTargets: this.targets.size,
      activeTargets,
      totalRequests,
      totalSuccessful,
      totalFailed,
      successRate: totalRequests > 0 ? totalSuccessful / totalRequests : 0,
      errorRate: totalRequests > 0 ? totalFailed / totalRequests : 0,
      targets: allStats.map(s => this.formatStats(s))
    };
  }

  // Cleanup
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.targets.clear();
    this.sessionMap.clear();

    this.emit('shutdown');
  }
}