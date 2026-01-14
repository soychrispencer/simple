import { SupabaseClient } from '@supabase/supabase-js';
import logger from './logger';
import { cache as cacheInstance } from './cache';

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<T = any>(
      fn: string,
      params?: object
    ): Promise<{ data: T | null; error: Error | null }>;
  }
}

// Tipos para dependencias
interface Logger {
  error(message: string, ...meta: any[]): void;
}

interface Cache {
  get<T>(key: string): T | undefined;
  set(key: string, value: any, ttl?: number): void;
  del(key: string): void;
}

// Logger por defecto (no-op) para evitar NPE si se pasa null
const noopLogger: Logger = {
  error: (..._meta: any[]) => {
    // Intencionalmente no hace nada en producción; mantener consola para desarrollo
    if (process.env.NODE_ENV !== 'production') {
      try {
        logger.debug('[metrics noopLogger]', { meta: _meta.map(safeSerialize) });
      } catch {}
    }
  }
};

// Flag para permitir deshabilitar métricas en entornos donde la tabla no exista
const METRICS_ENABLED = process.env.METRICS_ENABLED !== 'false';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

// Helper seguro para serializar errores/objetos para logging sin fallos
const safeSerialize = (v: any) => {
  try {
    if (v instanceof Error) return { message: v.message, stack: v.stack };
    return JSON.parse(JSON.stringify(v));
  } catch {
    try { return String(v); } catch { return '[unserializable]'; }
  }
};

export interface MetricsService {
  incrementMetric(listingId: string, metric: MetricType, amount?: number): Promise<boolean>;
  getMetrics(listingId: string): Promise<VehicleMetrics | null>;
}

export type MetricType = 'views' | 'clicks' | 'favorites' | 'shares';

export interface VehicleMetrics {
  views: number;
  clicks: number;
  favorites: number;
  shares: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleMetricsRecord extends VehicleMetrics {
  listing_id: string;
}

export class DefaultMetricsService implements MetricsService {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger | null,
    private cache: Cache
  ) {
    // Asegurar que this.logger no sea null para evitar errores al llamar a .error
    if (!this.logger) this.logger = noopLogger;
  }
  async incrementMetric(listingId: string, metric: MetricType, amount: number = 1): Promise<boolean> {
    if (!METRICS_ENABLED) {
      (this.logger || noopLogger).error('Metrics disabled via METRICS_ENABLED=false');
      return false;
    }

    // IDs demo no existen en la BD y no son UUID; ignorar silenciosamente.
    if (typeof listingId === 'string' && listingId.startsWith('demo-')) {
      return true;
    }

    if (!listingId || typeof listingId !== 'string') {
      (this.logger || noopLogger).error('Invalid listingId provided', { listingId });
      return false;
    }

    // Evita errores del tipo "invalid input syntax for type uuid" en RPC/queries.
    if (!isUuid(listingId)) {
      return false;
    }

    if (!['views', 'clicks', 'favorites', 'shares'].includes(metric)) {
      (this.logger || noopLogger).error('Invalid metric type provided', { metric });
      return false;
    }

    if (!Number.isInteger(amount) || amount < 0) {
      (this.logger || noopLogger).error('Invalid amount provided', { amount });
      return false;
    }

    try {
      if (!this.supabase) {
        (this.logger || noopLogger).error('Supabase client not initialized');
        return false;
      }

      // Preferir RPC atómico si está disponible
      try {
        if (this.supabase && typeof (this.supabase as any).rpc === 'function') {
          const { error: rpcError } = await (this.supabase as any).rpc('increment_listing_metric', {
            p_listing_id: listingId,
            p_metric: metric,
            p_amount: amount
          });

          if (rpcError) {
            (this.logger || noopLogger).error('RPC increment_listing_metric failed', safeSerialize(rpcError), { listingId, metric, amount });
            // fallthrough to fallback logic
          } else {
            // RPC succeeded
            const cacheKey = `metrics-${listingId}`;
            this.cache.del(cacheKey);
            return true;
          }
        }
      } catch (rpcEx) {
        (this.logger || noopLogger).error('RPC call failed', safeSerialize(rpcEx), { listingId, metric, amount });
        // fallback to direct upsert below
      }

      // Fallback: realizar lectura + insert/update si RPC no está disponible
      const { data: currentData, error: selectError } = await this.supabase
        .from('listing_metrics')
        .select('*')
        .eq('listing_id', listingId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        (this.logger || noopLogger).error('Error reading current metrics', safeSerialize(selectError), { listingId, metric, amount });
        return false;
      }

      if (currentData) {
        const newValue = (currentData[metric] || 0) + amount;
        const { error: updateError } = await this.supabase
          .from('listing_metrics')
          .update({
            [metric]: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('listing_id', listingId);

        if (updateError) {
          (this.logger || noopLogger).error('Error updating metrics', safeSerialize(updateError), { listingId, metric, amount });
          return false;
        }
      } else {
        const initialData: VehicleMetricsRecord = {
          listing_id: listingId,
          views: 0,
          clicks: 0,
          favorites: 0,
          shares: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        initialData[metric] = amount;

        const { error: insertError } = await this.supabase
          .from('listing_metrics')
          .insert(initialData);

        if (insertError) {
          (this.logger || noopLogger).error('Error inserting new metrics record', safeSerialize(insertError), { listingId, metric, amount });
          return false;
        }
      }

      const cacheKey = `metrics-${listingId}`;
      this.cache.del(cacheKey);

      return true;
    } catch (error) {
      (this.logger || noopLogger).error('Error en incrementMetric', safeSerialize(error instanceof Error ? { message: (error as any).message, stack: (error as any).stack } : error), { listingId, metric, amount });
      return false;
    }
  }

  async getMetrics(listingId: string): Promise<VehicleMetrics | null> {
    try {
      if (!METRICS_ENABLED) {
        (this.logger || noopLogger).error('Metrics disabled via METRICS_ENABLED=false');
        return null;
      }

      if (typeof listingId === 'string' && listingId.startsWith('demo-')) {
        return null;
      }

      if (!listingId || typeof listingId !== 'string' || !isUuid(listingId)) {
        return null;
      }

      if (!this.supabase) {
        (this.logger || noopLogger).error('Supabase client not initialized');
        return null;
      }

      const cacheKey = `metrics-${listingId}`;
      const cached = this.cache.get<VehicleMetrics>(cacheKey);

      if (cached) return cached;

      const result = await this.supabase
        .from('listing_metrics')
        .select('*')
        .eq('listing_id', listingId)
        .single();

      const { data, error } = result;

      if (error) {
        (this.logger || noopLogger).error('Error obteniendo métricas', safeSerialize(error), { listingId });
        return null;
      }

      if (data) this.cache.set(cacheKey, data, 1000 * 60 * 5);

      return data;
    } catch (error) {
      (this.logger || noopLogger).error('Error en getMetrics', safeSerialize(error instanceof Error ? { message: (error as any).message, stack: (error as any).stack } : error));
      return null;
    }
  }
}

// Instancia por defecto del servicio
let defaultMetricsService: DefaultMetricsService | null = null;

export function getMetricsService(supabase?: SupabaseClient): MetricsService {
  if (!defaultMetricsService) {
    try {
      const client = supabase || require('./supabase/supabase').getSupabaseClient();
      if (!client) {
        throw new Error('Failed to initialize Supabase client');
      }
      defaultMetricsService = new DefaultMetricsService(client, logger, cacheInstance);
    } catch (error) {
      try {
        (logger || noopLogger).error('Failed to initialize metrics service', error);
      } catch {
        noopLogger.error('Failed to initialize metrics service', error);
      }
      // Return a fallback service that logs errors but doesn't crash
      defaultMetricsService = new DefaultMetricsService(null as any, logger, cacheInstance);
    }
  }
  return defaultMetricsService;
}

// Funciones de conveniencia para uso directo
export async function incrementVehicleMetric(vehicleId: string, metric: MetricType, amount: number = 1): Promise<boolean> {
  const service = getMetricsService();
  return service.incrementMetric(vehicleId, metric, amount);
}

export async function getVehicleMetrics(vehicleId: string): Promise<VehicleMetrics | null> {
  const service = getMetricsService();
  return service.getMetrics(vehicleId);
}


