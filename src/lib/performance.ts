interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  start(name: string): void {
    this.metrics.set(name, { name, startTime: performance.now() });
  }

  end(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric) return undefined;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (import.meta.env.DEV) {
      console.debug(`[Perf] ${name}: ${metric.duration.toFixed(2)}ms`);
    }
    return metric.duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  measure<T>(name: string, fn: () => T): T {
    this.start(name);
    const result = fn();
    this.end(name);
    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    const result = await fn();
    this.end(name);
    return result;
  }

  clear(): void {
    this.metrics.clear();
  }

  report(): Record<string, number> {
    const report: Record<string, number> = {};
    this.metrics.forEach((metric, name) => {
      if (metric.duration) {
        report[name] = metric.duration;
      }
    });
    return report;
  }
}

export const perfMonitor = new PerformanceMonitor();
