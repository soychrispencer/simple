import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MetricsService, MetricType, VehicleMetrics, DefaultMetricsService } from '../metrics';
import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../logger';
import { cache as cacheInstance } from '../cache';

jest.mock('@supabase/supabase-js');
jest.mock('../logger');
jest.mock('../cache');

describe('MetricsService', () => {
  let metricsService: DefaultMetricsService;
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockLogger: any;
  let mockCache: any;

  const mockMetrics: VehicleMetrics = {
    views: 10,
    clicks: 5,
    favorites: 2,
    shares: 1,
    created_at: '2025-10-20T00:00:00Z',
    updated_at: '2025-10-20T00:00:00Z'
  };

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
    it('should successfully increment a metric for existing record', async () => {
      const existingMetrics = { ...mockMetrics, vehicle_id: 'test-id' };
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: (jest.fn() as any).mockResolvedValue({ data: existingMetrics, error: null })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: (jest.fn() as any).mockResolvedValue({ error: null })
        })
      } as any);

      const result = await metricsService.incrementMetric('test-id', 'views');

      expect(result).toBe(true);
      expect(mockCache.del).toHaveBeenCalledWith('metrics-test-id');
    });

    it('should successfully increment a metric for new record', async () => {
      const notFoundError = { code: 'PGRST116' }; // Supabase "not found" error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: (jest.fn() as any).mockResolvedValue({ data: null, error: notFoundError })
          })
        }),
        insert: (jest.fn() as any).mockResolvedValue({ error: null })
      } as any);

      const result = await metricsService.incrementMetric('test-id', 'views');

      expect(result).toBe(true);
      expect(mockCache.del).toHaveBeenCalledWith('metrics-test-id');
    });

    it('should handle errors from Supabase', async () => {
      const mockError = new Error('Test error');
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: (jest.fn() as any).mockResolvedValue({ data: null, error: mockError })
          })
        })
      } as any);

      const result = await metricsService.incrementMetric('test-id', 'views');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error reading current metrics', mockError, expect.any(Object));
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await metricsService.incrementMetric('test-id', 'views');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate vehicleId', async () => {
      const result = await metricsService.incrementMetric('', 'views');
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid vehicleId provided', { vehicleId: '' });
    });

    it('should validate metric type', async () => {
      const result = await metricsService.incrementMetric('test-id', 'invalid' as any);
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid metric type provided', { metric: 'invalid' });
    });

    it('should validate amount', async () => {
      const result = await metricsService.incrementMetric('test-id', 'views', -1);
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid amount provided', { amount: -1 });
    });
  });

  describe('getMetrics', () => {

    it('should return cached metrics if available', async () => {
      mockCache.get.mockReturnValue(mockMetrics);

      const result = await metricsService.getMetrics('test-id');

      expect(result).toEqual(mockMetrics);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch and cache metrics if not in cache', async () => {
      mockCache.get.mockReturnValue(null);
      const mockSingle = jest.fn<() => Promise<{ data: VehicleMetrics; error: null }>>()
        .mockResolvedValue({ data: mockMetrics, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      } as any);

      const result = await metricsService.getMetrics('test-id');

      expect(result).toEqual(mockMetrics);
      expect(mockCache.set).toHaveBeenCalledWith('metrics-test-id', mockMetrics, expect.any(Number));
    });
  });
});