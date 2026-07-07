import type { FeaturedBoostItem } from './boost.js';

export function boostKeysFromFeatured(items: FeaturedBoostItem[]): string[] {
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
        const key = item.id.trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        keys.push(key);
    }
    return keys;
}

export function slugFromBoostHref(href: string): string {
    return href.replace(/^\//, '').split('?')[0]?.trim() ?? '';
}

export function boostSlugsFromFeatured(items: FeaturedBoostItem[]): string[] {
    const slugs: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
        const slug = slugFromBoostHref(item.href);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        slugs.push(slug);
    }
    return slugs;
}

export function splitDirectoryByBoostOrder<T>(
    items: T[],
    boostedOrder: string[],
    getKey: (item: T) => string,
    getAltKey?: (item: T) => string | undefined,
): { boosted: T[]; regular: T[] } {
    if (boostedOrder.length === 0) {
        return { boosted: [], regular: items };
    }

    const byKey = new Map<string, T>();
    for (const item of items) {
        byKey.set(getKey(item), item);
        const altKey = getAltKey?.(item)?.trim();
        if (altKey) byKey.set(altKey, item);
    }

    const boosted: T[] = [];
    const seen = new Set<string>();

    for (const key of boostedOrder) {
        const item = byKey.get(key);
        if (!item) continue;
        const primaryKey = getKey(item);
        if (seen.has(primaryKey)) continue;
        boosted.push(item);
        seen.add(primaryKey);
    }

    const regular = items.filter((item) => !seen.has(getKey(item)));
    return { boosted, regular };
}

export function isDirectoryItemBoosted<T>(
    item: T,
    boostedOrder: string[],
    getKey: (item: T) => string,
    getAltKey?: (item: T) => string | undefined,
): boolean {
    const keys = [getKey(item), getAltKey?.(item)].filter(Boolean) as string[];
    return keys.some((key) => boostedOrder.includes(key));
}
