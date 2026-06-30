import type { Context } from 'hono';
import { asString } from '../modules/shared/index.js';
import { isAllowedBrowserOrigin } from './cors.js';

export function resolveBrowserOrigin(
    c: Context,
    options: { isProduction: boolean; defaultOrigin: string },
): string | null {
    const origin = asString(c.req.header('origin'));
    if (origin && isAllowedBrowserOrigin(origin, { isProduction: options.isProduction })) return origin;

    const referer = asString(c.req.header('referer'));
    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (isAllowedBrowserOrigin(refererOrigin, { isProduction: options.isProduction })) {
                return refererOrigin;
            }
        } catch {
            // Ignore malformed referer headers.
        }
    }

    return options.isProduction ? null : options.defaultOrigin;
}

export function sanitizeBrowserReturnUrl(
    rawReturnUrl: string,
    fallbackOrigin: string,
    options?: { isProduction?: boolean },
): string {
    try {
        const target = new URL(rawReturnUrl);
        if (!isAllowedBrowserOrigin(target.origin, { isProduction: options?.isProduction })) {
            return fallbackOrigin;
        }
        target.hash = target.hash || '#integraciones';
        return target.toString();
    } catch {
        return fallbackOrigin;
    }
}

export function buildGoogleRedirectUri(origin: string): string {
    return `${origin}/auth/google/callback`;
}
