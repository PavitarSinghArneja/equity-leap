/**
 * Multi-Layer Cache Manager
 * Implements memory cache with optional localStorage persistence
 * Production-ready caching with TTL and cache invalidation strategies
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  tags?: string[];
}

export interface CacheConfig {
  ttl: number;              // Time to live in milliseconds
  maxMemoryItems?: number;  // Max items in memory cache
  enablePersistence?: boolean; // Enable localStorage persistence
  persistenceKey?: string;  // Key prefix for localStorage
  enableCompression?: boolean; // Compress data in localStorage
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
  persistenceUsage: number;
}

export class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private accessOrder = new Map<string, number>(); // For LRU eviction
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    hitRate: 0,
    memoryUsage: 0,
    persistenceUsage: 0
  };

  constructor(private config: CacheConfig) {
    this.startCleanupInterval();
  }

  async get<T>(key: string): Promise<T | null> {
    this.metrics.totalRequests++;

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.metrics.hits++;
      this.updateAccessOrder(key);
      this.updateHitRate();
      return memoryEntry.data;
    }

    // Check persistence layer
    if (this.config.enablePersistence) {
      const persistedData = await this.getFromPersistence<T>(key);
      if (persistedData) {
        this.metrics.hits++;
        // Promote to memory cache
        await this.setInMemory(key, persistedData, this.config.ttl);
        this.updateHitRate();
        return persistedData;
      }
    }

    this.metrics.misses++;
    this.updateHitRate();
    return null;
  }

  async set<T>(
    key: string,
    data: T,
    ttl?: number,
    tags?: string[]
  ): Promise<void> {
    const effectiveTtl = ttl || this.config.ttl;

    // Set in memory cache
    await this.setInMemory(key, data, effectiveTtl, tags);

    // Set in persistence layer
    if (this.config.enablePersistence) {
      await this.setInPersistence(key, data, effectiveTtl, tags);
    }

    this.updateMetrics();
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    this.accessOrder.delete(key);

    if (this.config.enablePersistence) {
      await this.deleteFromPersistence(key);
    }

    this.updateMetrics();
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.accessOrder.clear();

    if (this.config.enablePersistence) {
      await this.clearPersistence();
    }

    this.metrics.evictions += this.memoryCache.size;
    this.updateMetrics();
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keysToDelete: string[] = [];

    // Find keys with matching tag in memory
    for (const [key, entry] of this.memoryCache) {
      if (entry.tags && entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    // Delete matching keys
    for (const key of keysToDelete) {
      await this.delete(key);
    }

    // Also check persistence layer
    if (this.config.enablePersistence) {
      await this.invalidatePersistedByTag(tag);
    }
  }

  // Wrap function with caching
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl, tags);
    return result;
  }

  private async setInMemory<T>(
    key: string,
    data: T,
    ttl: number,
    tags?: string[]
  ): Promise<void> {
    // Check if we need to evict items
    if (this.config.maxMemoryItems &&
        this.memoryCache.size >= this.config.maxMemoryItems &&
        !this.memoryCache.has(key)) {
      await this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      tags
    };

    this.memoryCache.set(key, entry);
    this.updateAccessOrder(key);
  }

  private async getFromPersistence<T>(key: string): Promise<T | null> {
    try {
      const persistenceKey = this.getPersistenceKey(key);
      const stored = localStorage.getItem(persistenceKey);

      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      if (this.isValid(entry)) {
        return entry.data;
      } else {
        // Clean up expired entry
        localStorage.removeItem(persistenceKey);
        return null;
      }
    } catch (error) {
      console.warn('Error reading from persistence cache:', error);
      return null;
    }
  }

  private async setInPersistence<T>(
    key: string,
    data: T,
    ttl: number,
    tags?: string[]
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        key,
        tags
      };

      const persistenceKey = this.getPersistenceKey(key);
      localStorage.setItem(persistenceKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('Error writing to persistence cache:', error);
    }
  }

  private async deleteFromPersistence(key: string): Promise<void> {
    try {
      const persistenceKey = this.getPersistenceKey(key);
      localStorage.removeItem(persistenceKey);
    } catch (error) {
      console.warn('Error deleting from persistence cache:', error);
    }
  }

  private async clearPersistence(): Promise<void> {
    try {
      const prefix = this.config.persistenceKey || 'cache:';
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Error clearing persistence cache:', error);
    }
  }

  private async invalidatePersistedByTag(tag: string): Promise<void> {
    try {
      const prefix = this.config.persistenceKey || 'cache:';
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));

      for (const key of keys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry = JSON.parse(stored);
          if (entry.tags && entry.tags.includes(tag)) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Error invalidating persisted cache by tag:', error);
    }
  }

  private isValid<T>(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder.set(key, Date.now());
  }

  private async evictLRU(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  private getPersistenceKey(key: string): string {
    const prefix = this.config.persistenceKey || 'cache:';
    return `${prefix}${key}`;
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0
      ? (this.metrics.hits / this.metrics.totalRequests) * 100
      : 0;
  }

  private updateMetrics(): void {
    this.metrics.memoryUsage = this.memoryCache.size;
    this.updateHitRate();
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private cleanupExpired(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (!this.isValid(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      this.accessOrder.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.info(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }

    this.updateMetrics();
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: this.memoryCache.size,
      persistenceUsage: 0
    };
  }
}