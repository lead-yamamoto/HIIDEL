// Vercel環境でのデータ永続化のためのキャッシュ機能

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30分

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };
    this.cache.set(key, entry);
    console.log(`💾 Cache set: ${key} (TTL: ${entry.ttl}ms)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      console.log(`⏰ Cache expired: ${key}`);
      return null;
    }

    console.log(`✅ Cache hit: ${key}`);
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      console.log(`🗑️ Cache deleted: ${key}`);
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    console.log(`🧹 Cache cleared`);
  }

  // 期限切れのエントリを削除
  cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cache cleanup: ${deletedCount} expired entries removed`);
    }
  }

  // 統計情報
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// グローバルキャッシュインスタンス
declare global {
  var __HIIDEL_CACHE__: MemoryCache | undefined;
}

function getCache(): MemoryCache {
  if (!global.__HIIDEL_CACHE__) {
    global.__HIIDEL_CACHE__ = new MemoryCache();

    // 定期的なクリーンアップ（5分ごと）
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        global.__HIIDEL_CACHE__?.cleanup();
      }, 5 * 60 * 1000);
    }
  }
  return global.__HIIDEL_CACHE__;
}

export const cache = getCache();

// APIレスポンスのキャッシュ
export const cacheApiResponse = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  expiryMs: number = 60 * 60 * 1000
): Promise<T> => {
  const cached = cache.get<T>(key);
  if (cached) {
    return cached;
  }

  const data = await fetchFn();
  cache.set(key, data, expiryMs);
  return data;
};
