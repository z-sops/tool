interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) {
      memoryStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = config;
  
  return async function rateLimit(key: string): Promise<RateLimitResult> {
    const fullKey = `${keyPrefix}:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    let entry = memoryStore.get(fullKey);
    
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
      memoryStore.set(fullKey, entry);
    }
    
    entry.count++;
    
    const remaining = Math.max(0, maxRequests - entry.count);
    const allowed = entry.count <= maxRequests;
    
    return {
      allowed,
      remaining,
      resetAt: entry.resetAt,
      retryAfterMs: allowed ? undefined : entry.resetAt - now,
    };
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'auth',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: 'api',
});

export const generateRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'generate',
});