import { Suspense } from 'react';
import { MarketplacePublicProductsPage } from '@simple/ui/panel';
import { BoostedCatalogSlider } from '@/components/featured/boosted-catalog-slider';

export default function ProductosPage() {
    return (
        <Suspense fallback={null}>
            <BoostedCatalogSlider section="products" />
            <MarketplacePublicProductsPage vertical="propiedades" />
        </Suspense>
    );
}
