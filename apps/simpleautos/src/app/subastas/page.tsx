'use client';

import PublicVehicleListingPage from '@/components/listings/public-vehicle-listing-page';

export default function SubastasPage() {
    return (
        <PublicVehicleListingPage
            section="auction"
            title="Subastas de vehículos"
            breadcrumbLabel="Subastas"
            description="Catálogo conectado a publicaciones reales activas en SimpleAutos."
        />
    );
}
