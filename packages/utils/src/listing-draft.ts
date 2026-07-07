export type ListingDraftVertical = 'autos' | 'propiedades';

export type ListingDraftEnvelope<TData, TExtra extends Record<string, unknown> = Record<string, never>> = {
    version: number;
    savedAt: string;
    data: TData;
} & TExtra;

/** Omite URLs locales (data:/blob:) que no sobreviven a una recarga. */
export function draftPersistableUrl(url: string): string {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return '';
    return url;
}

export function createListingDraftEnvelope<TData, TExtra extends Record<string, unknown> = Record<string, never>>(
    data: TData,
    extra?: TExtra,
): ListingDraftEnvelope<TData, TExtra> {
    return {
        version: 1,
        savedAt: new Date().toISOString(),
        data,
        ...(extra ?? ({} as TExtra)),
    };
}
