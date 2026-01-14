import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DefaultMetricsService, VehicleMetrics } from '../metrics';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js');
jest.mock('../logger');
jest.mock('../cache');

describe('MetricsService', () => {
  let metricsService: DefaultMetricsService;
  const TEST_UUID = '00000000-0000-0000-0000-000000000001';
  type RpcResponse = { data: any; error: any };
  type SupabaseMock = {
    rpc: jest.MockedFunction<(fn: string, params?: object) => Promise<RpcResponse>>;
    from: jest.MockedFunction<(table: string) => any>;
  };
  type LoggerMock = {
    error: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };
  type CacheMock = {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  let mockSupabase: SupabaseMock;
  let mockLogger: LoggerMock;
  let mockCache: CacheMock;

  beforeEach(() => {
    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn()
    } as unknown as SupabaseMock;

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

    metricsService = new DefaultMetricsService(
      mockSupabase as unknown as SupabaseClient,
      mockLogger as any,
      mockCache as any
    );
  });

  describe('incrementMetric', () => {
    it('should successfully increment a metric', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await metricsService.incrementMetric(TEST_UUID, 'views');

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_listing_metric', {
        p_listing_id: TEST_UUID,
        p_metric: 'views',
        p_amount: 1
      });
      expect(mockCache.del).toHaveBeenCalledWith(`metrics-${TEST_UUID}`);
    });

    it('should ignore demo listing ids', async () => {
      const result = await metricsService.incrementMetric('demo-auction-4', 'views');

      expect(result).toBe(true);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle errors from Supabase', async () => {
      const mockError = new Error('Test error');
      mockSupabase.rpc.mockResolvedValue({ data: null, error: mockError });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn(async () => ({ data: null, error: null }))
          })
        })
      } as any);

      const result = await metricsService.incrementMetric(TEST_UUID, 'views');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'RPC increment_listing_metric failed',
        expect.objectContaining({ message: mockError.message }),
        { listingId: TEST_UUID, metric: 'views', amount: 1 }
      );
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Unexpected error'));

      const result = await metricsService.incrementMetric(TEST_UUID, 'views');

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

      const result = await metricsService.getMetrics(TEST_UUID);

      expect(result).toEqual(mockMetrics);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch and cache metrics if not in cache', async () => {
      mockCache.get.mockReturnValue(null);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn(async () => ({ data: mockMetrics, error: null }))
          })
        })
      } as any);

      const result = await metricsService.getMetrics(TEST_UUID);

      expect(result).toEqual(mockMetrics);
      expect(mockCache.set).toHaveBeenCalledWith(`metrics-${TEST_UUID}`, mockMetrics, expect.any(Number));
    });
  });
});

