import { timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';
import { asString } from '../shared/helpers.js';

export function isLeadIngestConfigured(): boolean {
    return Boolean(asString(process.env.LEAD_INGEST_SECRET));
}

export function isLeadIngestAuthorized(c: Context): boolean {
    const configuredSecret = asString(process.env.LEAD_INGEST_SECRET);
    if (!configuredSecret) return false;

    const authHeader = asString(c.req.header('authorization'));
    const headerSecret = asString(c.req.header('x-simple-ingest-secret'));
    const providedSecret = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : headerSecret;

    if (!providedSecret) return false;

    try {
        return timingSafeEqual(Buffer.from(providedSecret), Buffer.from(configuredSecret));
    } catch {
        return false;
    }
}
