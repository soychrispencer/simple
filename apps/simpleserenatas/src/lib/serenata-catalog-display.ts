import type { ProviderGroupServicePack, ProviderGroupServicePromotion } from '@/lib/serenatas-api';
import { money } from '@/components/panel/shared';

export function packEffectivePrice(pack: Pick<ProviderGroupServicePack, 'price' | 'promoPrice'>) {
    return pack.promoPrice != null && pack.promoPrice > 0 && pack.promoPrice < pack.price
        ? pack.promoPrice
        : pack.price;
}

export function packHasPromoPrice(pack: Pick<ProviderGroupServicePack, 'price' | 'promoPrice'>) {
    return pack.promoPrice != null && pack.promoPrice > 0 && pack.promoPrice < pack.price;
}

export function formatPackPriceLabel(pack: Pick<ProviderGroupServicePack, 'price' | 'promoPrice'>) {
    if (packHasPromoPrice(pack)) {
        return `${money(packEffectivePrice(pack))} (antes ${money(pack.price)})`;
    }
    return money(pack.price);
}

export function formatPromotionDiscountLabel(promo: Pick<ProviderGroupServicePromotion, 'discountType' | 'discountValue'>) {
    if (promo.discountType === 'percent') return `${promo.discountValue}% dto.`;
    return `${money(promo.discountValue)} dto.`;
}

export function formatPromotionDates(promo: Pick<ProviderGroupServicePromotion, 'startsAt' | 'endsAt'>) {
    if (!promo.startsAt && !promo.endsAt) return null;
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    if (promo.startsAt && promo.endsAt) return `Válida del ${fmt(promo.startsAt)} al ${fmt(promo.endsAt)}`;
    if (promo.endsAt) return `Hasta el ${fmt(promo.endsAt)}`;
    if (promo.startsAt) return `Desde el ${fmt(promo.startsAt)}`;
    return null;
}
