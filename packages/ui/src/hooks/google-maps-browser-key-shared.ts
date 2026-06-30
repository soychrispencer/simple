/** Misma resolución que ListingLocationEditor — una sola fuente de verdad. */
export function resolveGoogleMapsBrowserKeyFromEnv(): string {
    return (
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
        || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        || process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
        || ''
    ).trim();
}

export function resolveGoogleMapsBrowserKey(override?: string | null): string | undefined {
    const resolved = override?.trim() || resolveGoogleMapsBrowserKeyFromEnv();
    return resolved || undefined;
}
