/**
 * Paid promotion checkout is paused for SimplePropiedades during the initial
 * marketplace launch. Enable it explicitly on the API and frontend when the
 * marketplace can deliver enough inventory and audience for the offer.
 */
export function isMarketplacePaidPromotionEnabled(vertical: string): boolean {
    if (vertical !== 'propiedades') return true;
    if (typeof process === 'undefined') return false;

    const enabled = process.env.NEXT_PUBLIC_PROPERTIES_PAID_PROMOTIONS_ENABLED
        ?? process.env.PROPERTIES_PAID_PROMOTIONS_ENABLED;
    return enabled === 'true' || enabled === '1';
}
