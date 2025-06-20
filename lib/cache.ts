interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheItem<any>>;
  private readonly DEFAULT_EXPIRY = 60 * 60 * 1000; // 1時間

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  public set<T>(
    key: string,
    data: T,
    expiryMs: number = this.DEFAULT_EXPIRY
  ): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + expiryMs;

    this.cache.set(key, {
      data,
      timestamp,
      expiresAt,
    });

    // ローカルストレージにも保存
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp,
          expiresAt,
        })
      );
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  public get<T>(key: string): T | null {
    // メモリキャッシュを確認
    const cachedItem = this.cache.get(key);
    if (cachedItem && Date.now() < cachedItem.expiresAt) {
      return cachedItem.data as T;
    }

    // ローカルストレージを確認
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const item: CacheItem<T> = JSON.parse(stored);
        if (Date.now() < item.expiresAt) {
          // メモリキャッシュに復元
          this.cache.set(key, item);
          return item.data;
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error("Failed to read from localStorage:", error);
    }

    return null;
  }

  public delete(key: string): void {
    this.cache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to delete from localStorage:", error);
    }
  }

  public clear(): void {
    this.cache.clear();
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public getExpiry(key: string): number | null {
    const item = this.cache.get(key);
    return item ? item.expiresAt : null;
  }
}

// 使用例
export const cache = Cache.getInstance();

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
