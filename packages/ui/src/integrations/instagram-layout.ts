/** Zona inferior reservada para los dots del carrusel de Instagram (~6% en 4:5). */
export const INSTAGRAM_CAROUSEL_SAFE_BOTTOM_PCT = 6;

export function instagramCarouselSafeBottomPx(canvasHeight: number): number {
    return Math.round(canvasHeight * (INSTAGRAM_CAROUSEL_SAFE_BOTTOM_PCT / 100));
}
