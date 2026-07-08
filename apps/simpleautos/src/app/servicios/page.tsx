import { Suspense } from 'react';
import { MarketplacePublicServicesPage } from '@simple/ui/panel';
import { BoostedCatalogSlider } from '@/components/featured/boosted-catalog-slider';

export default function ServiciosPage() {
    return (
        <Suspense fallback={null}>
            <BoostedCatalogSlider section="services" />
            <MarketplacePublicServicesPage vertical="autos" />
        </Suspense>
    );
}
