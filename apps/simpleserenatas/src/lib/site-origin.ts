/**
 * URL absoluta del sitio (OG, sitemap). Prioridad: SERENATAS_SITE_URL → APP_URL → Vercel → localhost.
 */
export function getSerenatasSiteOrigin(): string {
    const explicit =
        process.env.NEXT_PUBLIC_SERENATAS_SITE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, '');
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
    return 'http://localhost:3005';
}
