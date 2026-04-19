/**
 * API Performance Monitoring
 * 
 * Tracks API request timing and performance metrics.
 */

import { logWarn, logError } from './client-logger';

interface APITimingEntry {
  endpoint: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: string;
}

interface APIMetrics {
  totalRequests: number;
  averageResponseTime: number;
  slowestEndpoints: Array<{ endpoint: string; avgDuration: number; count: number }>;
  errorRate: number;
}

const timingStore: APITimingEntry[] = [];
const MAX_STORE_SIZE = 1000;

/**
 * Start timing an API request
 */
export type EndTimingFunction = (status?: number, error?: string) => void;

export function startAPITiming(endpoint: string, method: string = 'GET'): EndTimingFunction {
  const startTime = performance.now();
  const entry: APITimingEntry = {
    endpoint,
    method,
    startTime,
  };

  // Add to store, removing oldest if at capacity
  if (timingStore.length >= MAX_STORE_SIZE) {
    timingStore.shift();
  }
  timingStore.push(entry);

  // Return function to end timing
  return (status?: number, error?: string): void => {
    const endTime = performance.now();
    entry.endTime = endTime;
    entry.duration = endTime - startTime;
    entry.status = status;
    entry.error = error;

    // Log slow requests (over 2 seconds)
    if (entry.duration > 2000) {
      logWarn(`Slow API request: ${method} ${endpoint} took ${entry.duration.toFixed(2)}ms`, {
        endpoint,
        method,
        duration: entry.duration,
        status,
      });
    }

    // Log errors
    if (status && status >= 400) {
      logError(`API request failed: ${method} ${endpoint} returned ${status}`, {
        endpoint,
        method,
        status,
        duration: entry.duration,
        error,
      });
    }
  };
}

/**
 * Get API performance metrics
 */
export function getAPIMetrics(): APIMetrics {
  const completedRequests = timingStore.filter(e => e.duration !== undefined);
  
  if (completedRequests.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      slowestEndpoints: [],
      errorRate: 0,
    };
  }

  const totalDuration = completedRequests.reduce((sum, e) => sum + (e.duration || 0), 0);
  const errorCount = completedRequests.filter(e => e.status && e.status >= 400).length;

  // Calculate average duration per endpoint
  const endpointStats = new Map<string, { totalDuration: number; count: number }>();
  completedRequests.forEach(entry => {
    const stats = endpointStats.get(entry.endpoint) || { totalDuration: 0, count: 0 };
    stats.totalDuration += entry.duration || 0;
    stats.count += 1;
    endpointStats.set(entry.endpoint, stats);
  });

  const slowestEndpoints = Array.from(endpointStats.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      avgDuration: stats.totalDuration / stats.count,
      count: stats.count,
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10);

  return {
    totalRequests: completedRequests.length,
    averageResponseTime: totalDuration / completedRequests.length,
    slowestEndpoints,
    errorRate: (errorCount / completedRequests.length) * 100,
  };
}

/**
 * Clear all timing data
 */
export function clearAPITiming(): void {
  timingStore.length = 0;
}

/**
 * Get timing entries for a specific endpoint
 */
export function getEndpointTiming(endpoint: string): APITimingEntry[] {
  return timingStore.filter(e => e.endpoint === endpoint);
}

/**
 * Wrap a fetch call with timing
 */
export async function timedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method || 'GET';
  
  // Extract endpoint path from URL
  const endpoint = url.replace(/^https?:\/\/[^/]+/, '');
  
  const endTiming = startAPITiming(endpoint, method);
  
  try {
    const response = await fetch(input, init);
    endTiming(response.status);
    return response;
  } catch (error) {
    endTiming(undefined, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Development helper to expose metrics to window
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as Record<string, unknown>).apiPerformance = {
    getMetrics: getAPIMetrics,
    clearMetrics: clearAPITiming,
    getEndpointTiming,
  };
}
