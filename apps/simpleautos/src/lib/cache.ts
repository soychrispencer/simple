import { LRUCache } from 'lru-cache';

const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutos por defecto

interface CacheOptions {
  max?: number;
  ttl?: number;
}

class CacheManager {
  private static instance: CacheManager;
  private cache: LRUCache<string, any>;

  private constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.max || 500,
      ttl: options.ttl || DEFAULT_TTL
    });
  }

  public static getInstance(options?: CacheOptions): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(options);
    }
    return CacheManager.instance;
  }

  public get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  public set(key: string, value: any, ttl?: number): void {
    this.cache.set(key, value, { ttl });
  }

  public del(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }
}

// Exportar una instancia única
export const cache = CacheManager.getInstance();

// Decorator para cachear métodos
export function Cached(ttl?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${propertyKey}-${JSON.stringify(args)}`;
      const cachedValue = cache.get(key);

      if (cachedValue) {
        return cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

