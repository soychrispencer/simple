import { Hono } from 'hono';
import type { Context } from 'hono';
import { getVehicleValuationFeedState, refreshVehicleValuationFeeds, getVehicleValuationFeedRecords } from './index.js';

export function createVehicleValuationRouter() {
    const router = new Hono();

    // GET /api/vehicle-valuation/feeds - Get vehicle valuation feed status
    router.get('/feeds', async (c: Context) => {
        const state = getVehicleValuationFeedState();
        return c.json({ ok: true, data: state });
    });

    // POST /api/vehicle-valuation/feeds/refresh - Refresh vehicle valuation feeds
    router.post('/feeds/refresh', async (c: Context) => {
        try {
            await refreshVehicleValuationFeeds();
            return c.json({ ok: true, message: 'Vehicle valuation feeds refreshed' });
        } catch (error) {
            return c.json({ ok: false, error: 'Failed to refresh vehicle feeds' }, 500);
        }
    });

    // GET /api/vehicle-valuation/records - Get vehicle valuation records
    router.get('/records', async (c: Context) => {
        const records = getVehicleValuationFeedRecords();
        return c.json({ ok: true, data: records });
    });

    return router;
}