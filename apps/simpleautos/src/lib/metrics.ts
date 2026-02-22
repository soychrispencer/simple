import logger from "./logger";

export type MetricType = "views" | "clicks" | "favorites" | "shares";

export interface VehicleMetrics {
  views: number;
  clicks: number;
  favorites: number;
  shares: number;
  created_at: string;
  updated_at: string;
}

export interface MetricsService {
  incrementMetric(listingId: string, metric: MetricType, amount?: number): Promise<boolean>;
  getMetrics(listingId: string): Promise<VehicleMetrics | null>;
}

class NoopMetricsService implements MetricsService {
  async incrementMetric(_listingId: string, _metric: MetricType, _amount: number = 1): Promise<boolean> {
    return true;
  }

  async getMetrics(_listingId: string): Promise<VehicleMetrics | null> {
    return null;
  }
}

const metricsService = new NoopMetricsService();

export function getMetricsService(): MetricsService {
  return metricsService;
}

export async function incrementVehicleMetric(vehicleId: string, metric: MetricType, amount: number = 1): Promise<boolean> {
  try {
    return await metricsService.incrementMetric(vehicleId, metric, amount);
  } catch (error) {
    logger.error("incrementVehicleMetric error", error);
    return false;
  }
}

export async function getVehicleMetrics(vehicleId: string): Promise<VehicleMetrics | null> {
  try {
    return await metricsService.getMetrics(vehicleId);
  } catch (error) {
    logger.error("getVehicleMetrics error", error);
    return null;
  }
}
