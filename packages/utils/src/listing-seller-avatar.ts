import { resolveAppMediaUrl } from './media-url.js';

export type ListingSellerAvatarSource = {
    avatarUrl?: string | null;
} | null | undefined;

/**
 * URL de avatar para tarjetas de publicación.
 * Prioridad: logo del perfil público (seller.avatarUrl) → fallback (p. ej. owner.avatar en boosts).
 */
export function resolveListingSellerAvatarUrl(
    seller: ListingSellerAvatarSource,
    fallbackAvatarUrl?: string | null,
): string | undefined {
    const raw = seller?.avatarUrl?.trim() || fallbackAvatarUrl?.trim() || null;
    return resolveAppMediaUrl(raw) ?? undefined;
}
