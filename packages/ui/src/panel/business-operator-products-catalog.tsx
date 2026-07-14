'use client';

import {
    type PublicOperatorProductItem,
    type PublicProfileVertical,
} from '@simple/utils';
import { BusinessProductPublicCard } from './business-product-public-card.js';
import { PUBLIC_PROFILE_PRODUCTS_EMPTY_MESSAGE } from './business-copy.js';
import { PanelEmptyState } from './panel-display.js';

export type BusinessOperatorProductsCatalogProps = {
    vertical: PublicProfileVertical;
    products: PublicOperatorProductItem[];
    showProvider?: boolean;
    showConsult?: boolean;
};

export function BusinessOperatorProductsCatalog({
    vertical,
    products,
    showProvider = false,
    showConsult = true,
}: BusinessOperatorProductsCatalogProps) {
    if (products.length === 0) {
        return <PanelEmptyState title="Sin productos por ahora" description={PUBLIC_PROFILE_PRODUCTS_EMPTY_MESSAGE} />;
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((item) => {
                const provider = showProvider ? item.provider : null;
                const detailHref = showProvider ? `/productos/${encodeURIComponent(item.id)}` : undefined;
                return (
                    <BusinessProductPublicCard
                        key={item.id}
                        vertical={vertical}
                        showConsult={showConsult}
                        href={detailHref}
                        item={{
                            id: item.id,
                            name: item.name,
                            description: item.description,
                            imageUrl: item.imageUrl,
                            imageFallbackUrl: item.provider.coverImageUrl ?? item.provider.avatarImageUrl ?? null,
                            category: item.category,
                            price: item.price,
                            promoPrice: item.promoPrice,
                            currency: item.currency,
                            stock: item.stock,
                            sku: item.sku,
                            providerName: provider?.name ?? null,
                            providerHref: provider?.profileHref ?? null,
                            locationLabel: provider?.city ?? provider?.region ?? null,
                            consultHref: provider?.profileHref ?? null,
                        }}
                    />
                );
            })}
        </div>
    );
}
