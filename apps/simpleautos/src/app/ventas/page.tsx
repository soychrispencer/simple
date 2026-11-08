'use client';

import PublicVehicleListingPage from '@/components/listings/public-vehicle-listing-page';

export default function VentasPage() {
    return (
        <PublicVehicleListingPage
            title="Explora vehículos"
            breadcrumbLabel="Explorar"
            integratedFeed
        />
    );
}
