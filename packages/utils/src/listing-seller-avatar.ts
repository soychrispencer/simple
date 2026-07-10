import { resolveAppMediaUrl } from './media-url.js';

export type ListingSellerAvatarSource = {
    avatarUrl?: string | null;
} | null | undefined;

/**
 * URL de avatar/logo de negocio para tarjetas de publicación.
 * Solo usa el logo del perfil público (seller.avatarUrl). Sin fallback a avatar personal.
 */
export function resolveListingSellerAvatarUrl(
    seller: ListingSellerAvatarSource,
    _fallbackAvatarUrl?: string | null,
): string | undefined {
    const raw = seller?.avatarUrl?.trim() || null;
    return resolveAppMediaUrl(raw) ?? undefined;
}
