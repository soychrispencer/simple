/**
 * Política de aspect ratio del marketplace:
 *
 * - 3:4 → tarjetas, grid, list, Instagram foto, previews comerciales
 * - 9:16 → Descubre, video social, TikTok / Shorts / Reels (no cards de venta)
 * - Detalle público → sin ratio fijo (galería contain / viewport)
 */

/** Ratio comercial de tarjetas de publicación (marketplace / panel / Instagram foto). */
export const LISTING_CARD_COMMERCIAL_ASPECT = 'aspect-[3/4]' as const;

/** @deprecated Usar LISTING_CARD_COMMERCIAL_ASPECT. */
export const LISTING_CARD_GRID_IMAGE_ASPECT = LISTING_CARD_COMMERCIAL_ASPECT;

/** Proporción de imagen en tarjetas horizontales (columna media). */
export const LISTING_CARD_LIST_IMAGE_ASPECT = LISTING_CARD_COMMERCIAL_ASPECT;

/** Ratio social vertical (Descubre, upload de video, preview de reel). */
export const LISTING_SOCIAL_VERTICAL_ASPECT = 'aspect-[9/16]' as const;

export const LISTING_CARD_GRID_SHELL_CLASS =
    'marketplace-card-social group/card relative flex h-full flex-col cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]';
