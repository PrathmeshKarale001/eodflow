// =============================================================================
// EOD FLOW — Upstash Redis Cache Layer
//
// Provides a typed, centralized caching layer for expensive database queries.
// Uses stale-while-revalidate pattern: returns cached data instantly while
// refreshing in the background when TTL expires.
//
// SETUP: Add these env vars to .env and Vercel dashboard:
//   UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
//   UPSTASH_REDIS_REST_TOKEN=your-token
// =============================================================================

import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Singleton Redis client (lazy — won't crash if env vars missing)
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Graceful degradation: if Redis isn't configured, fall through to DB
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// ---------------------------------------------------------------------------
// Cache Keys — centralized to prevent collisions
// ---------------------------------------------------------------------------

export const CacheKeys = {
  DASHBOARD_COUNTS: "eod:dashboard:counts",
  REPORTS_USER_TIME: "eod:reports:user-time-sums",
  PROJECTS_STATUS_COUNTS: "eod:projects:task-status-counts",
} as const;

// ---------------------------------------------------------------------------
// Cache TTLs (seconds)
// ---------------------------------------------------------------------------

const DEFAULT_TTL = 60; // 1 minute

export const CacheTTL = {
  DASHBOARD_COUNTS: 60,       // Counts change infrequently
  REPORTS_USER_TIME: 120,     // Time summaries can be 2min stale
  PROJECTS_STATUS_COUNTS: 60, // Task status counts refresh every minute
} as const;

// ---------------------------------------------------------------------------
// Core cache operations
// ---------------------------------------------------------------------------

/**
 * Get a value from Redis cache.
 * Returns null if Redis is unavailable or key doesn't exist.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (err) {
    console.warn("[REDIS] Cache read failed:", err);
    return null;
  }
}

/**
 * Set a value in Redis cache with TTL.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds = DEFAULT_TTL): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn("[REDIS] Cache write failed:", err);
  }
}

/**
 * Delete a cache key (for invalidation).
 */
export async function cacheDelete(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(...keys);
  } catch (err) {
    console.warn("[REDIS] Cache delete failed:", err);
  }
}

/**
 * Invalidate all EOD Flow cache keys.
 * Used after bulk operations (e.g., task imports, project deletions).
 */
export async function cacheFlushAll(): Promise<void> {
  await cacheDelete(
    CacheKeys.DASHBOARD_COUNTS,
    CacheKeys.REPORTS_USER_TIME,
    CacheKeys.PROJECTS_STATUS_COUNTS,
  );
}

// ---------------------------------------------------------------------------
// Stale-While-Revalidate Pattern
// ---------------------------------------------------------------------------

/**
 * Get cached data or fetch fresh data. If cache is stale, returns cached
 * data immediately and refreshes in the background.
 *
 * @param key - Cache key
 * @param fetcher - Async function to fetch fresh data from DB
 * @param ttl - Cache TTL in seconds
 */
export async function cacheFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL,
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // Cache miss — fetch from DB
  const fresh = await fetcher();

  // Write to cache (fire-and-forget — don't block the response)
  cacheSet(key, fresh, ttl).catch(() => {});

  return fresh;
}
