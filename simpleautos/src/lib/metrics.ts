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

export interface MetricsService {
  incrementMetric(vehicleId: string, metric: MetricType, amount?: number): Promise<boolean>;
  getMetrics(vehicleId: string): Promise<VehicleMetrics | null>;
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
  vehicle_id: string;
}

export class DefaultMetricsService implements MetricsService {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
    private cache: Cache
  ) {}

  async incrementMetric(vehicleId: string, metric: MetricType, amount: number = 1): Promise<boolean> {
    if (!vehicleId || typeof vehicleId !== 'string') {
      this.logger.error('Invalid vehicleId provided', { vehicleId });
      return false;
    }
    if (!['views', 'clicks', 'favorites', 'shares'].includes(metric)) {
      this.logger.error('Invalid metric type provided', { metric });
      return false;
    }
    if (!Number.isInteger(amount) || amount < 0) {
      this.logger.error('Invalid amount provided', { amount });
      return false;
    }
    try {
      if (!this.supabase) {
        this.logger.error('Supabase client not initialized');
        return false;
      }

      // Leer el registro actual
      const { data: currentData, error: selectError } = await this.supabase
        .from('vehicle_metrics')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 es "not found"
        this.logger.error('Error reading current metrics', selectError, { vehicleId, metric, amount });
        return false;
      }

      if (currentData) {
        // Actualizar incrementando
        const newValue = (currentData[metric] || 0) + amount;
        const { error: updateError } = await this.supabase
          .from('vehicle_metrics')
          .update({
            [metric]: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('vehicle_id', vehicleId);

        if (updateError) {
          this.logger.error('Error updating metrics', updateError, { vehicleId, metric, amount });
          return false;
        }
      } else {
        // Insertar nuevo registro
        const initialData: VehicleMetricsRecord = {
          vehicle_id: vehicleId,
          views: 0,
          clicks: 0,
          favorites: 0,
          shares: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        initialData[metric] = amount;

        const { error: insertError } = await this.supabase
          .from('vehicle_metrics')
          .insert(initialData);

        if (insertError) {
          this.logger.error('Error inserting new metrics record', insertError, { vehicleId, metric, amount });
          return false;
        }
      }

      // Invalidar caché de métricas
      const cacheKey = `metrics-${vehicleId}`;
      this.cache.del(cacheKey);

      return true;
    } catch (error) {
      this.logger.error('Error en incrementMetric', error instanceof Error ? error : new Error(String(error)), { vehicleId, metric, amount });
      return false;
    }
  }

  async getMetrics(vehicleId: string): Promise<VehicleMetrics | null> {
    try {
      if (!this.supabase) {
        this.logger.error('Supabase client not initialized');
        return null;
      }

      const cacheKey = `metrics-${vehicleId}`;
      const cached = this.cache.get<VehicleMetrics>(cacheKey);

      if (cached) {
        return cached;
      }

      const result = await this.supabase
        .from('vehicle_metrics')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .single();

      const { data, error } = result;

      if (error) {
        this.logger.error('Error obteniendo métricas', error, { vehicleId });
        return null;
      }

      if (data) {
        this.cache.set(cacheKey, data, 1000 * 60 * 5); // 5 minutos
      }

      return data;
    } catch (error) {
      this.logger.error('Error en getMetrics', error instanceof Error ? error : new Error(String(error)));
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
      logger.error('Failed to initialize metrics service', error);
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
