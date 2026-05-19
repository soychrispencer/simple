const STORAGE_KEY = 'simpleserenatas.marketplace-request-draft';

export type MarketplaceRequestDraftRef = {
    groupSlug: string;
    serviceId: string;
};

export function readMarketplaceRequestDraftRef(): MarketplaceRequestDraftRef | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as MarketplaceRequestDraftRef;
        if (!parsed?.groupSlug?.trim() || !parsed?.serviceId?.trim()) return null;
        return { groupSlug: parsed.groupSlug.trim(), serviceId: parsed.serviceId.trim() };
    } catch {
        return null;
    }
}

export function writeMarketplaceRequestDraftRef(ref: MarketplaceRequestDraftRef): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ref));
}

export function clearMarketplaceRequestDraftRef(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(STORAGE_KEY);
}

/** Deep link: `?grupo={slug}&servicio={serviceId}` en `/panel/solicitar`. */
export function readMarketplaceRequestDraftFromSearch(search: string): MarketplaceRequestDraftRef | null {
    try {
        const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
        const groupSlug = params.get('grupo')?.trim();
        const serviceId = params.get('servicio')?.trim();
        if (!groupSlug || !serviceId) return null;
        return { groupSlug, serviceId };
    } catch {
        return null;
    }
}

export function marketplaceRequestDraftQuery(ref: MarketplaceRequestDraftRef): Record<string, string> {
    return { grupo: ref.groupSlug, servicio: ref.serviceId };
}
