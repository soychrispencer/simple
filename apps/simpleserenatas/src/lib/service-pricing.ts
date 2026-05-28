import type { ProviderGroupService } from '@/lib/serenatas-api';

export type ServicePriceLike = Pick<ProviderGroupService, 'price' | 'promoPrice'>;

export function serviceEffectivePrice(service: ServicePriceLike): number {
    return service.promoPrice != null && service.promoPrice > 0 && service.promoPrice < service.price
        ? service.promoPrice
        : service.price;
}

export function serviceHasPromoPrice(service: ServicePriceLike): boolean {
    return serviceEffectivePrice(service) < service.price;
}
