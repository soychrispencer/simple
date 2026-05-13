import { Hono } from 'hono';
import type { Context } from 'hono';
import { getValuationFeedState, refreshValuationFeeds, getValuationFeedRecords } from './index.js';

export function createValuationRouter() {
    const router = new Hono();

    // GET /api/valuation/feeds - Get valuation feed status
    router.get('/feeds', async (c: Context) => {
        const state = getValuationFeedState();
        return c.json({ ok: true, data: state });
    });

    // POST /api/valuation/feeds/refresh - Refresh valuation feeds
    router.post('/feeds/refresh', async (c: Context) => {
        try {
            await refreshValuationFeeds();
            return c.json({ ok: true, message: 'Valuation feeds refreshed' });
        } catch (error) {
            return c.json({ ok: false, error: 'Failed to refresh feeds' }, 500);
        }
    });

    // GET /api/valuation/records - Get valuation records
    router.get('/records', async (c: Context) => {
        const records = getValuationFeedRecords();
        return c.json({ ok: true, data: records });
    });

    return router;
}