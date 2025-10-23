import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DefaultMetricsService, MetricType, VehicleMetrics } from '../services/metrics.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../logger';
import { CacheManager } from '../cache';

jest.mock('@supabase/supabase-js');
jest.mock('../logger');
jest.mock('../cache');

describe('MetricsService', () => {
  let metricsService: DefaultMetricsService;
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockCache: jest.Mocked<CacheManager>;

  beforeEach(() => {
    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn()
    } as any;

    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn()
    } as any;

    metricsService = new DefaultMetricsService(mockSupabase, mockLogger, mockCache);
  });

  describe('incrementMetric', () => {
    it('should successfully increment a metric', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await metricsService.incrementMetric('test-id', 'views');

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_vehicle_metric', {
        p_vehicle_id: 'test-id',
        p_metric: 'views',
        p_amount: 1
      });
      expect(mockCache.del).toHaveBeenCalledWith('metrics-test-id');
    });

    it('should handle errors from Supabase', async () => {
      const mockError = new Error('Test error');
      mockSupabase.rpc.mockResolvedValue({ data: null, error: mockError });

      const result = await metricsService.incrementMetric('test-id', 'views');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error incrementando métrica', mockError, expect.any(Object));
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Unexpected error'));

      const result = await metricsService.incrementMetric('test-id', 'views');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    const mockMetrics: VehicleMetrics = {
      views: 10,
      clicks: 5,
      favorites: 2,
      shares: 1,
      created_at: '2025-10-20T00:00:00Z',
      updated_at: '2025-10-20T00:00:00Z'
    };

    it('should return cached metrics if available', async () => {
      mockCache.get.mockReturnValue(mockMetrics);

      const result = await metricsService.getMetrics('test-id');

      expect(result).toEqual(mockMetrics);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch and cache metrics if not in cache', async () => {
      mockCache.get.mockReturnValue(null);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMetrics, error: null })
          })
        })
      } as any);

      const result = await metricsService.getMetrics('test-id');

      expect(result).toEqual(mockMetrics);
      expect(mockCache.set).toHaveBeenCalledWith('metrics-test-id', mockMetrics, expect.any(Number));
    });
  });
});