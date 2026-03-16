'use client';

import PublicVehicleListingPage from '@/components/listings/public-vehicle-listing-page';

export default function ArriendosPage() {
    return (
        <PublicVehicleListingPage
            section="rent"
            title="Vehículos en arriendo"
            breadcrumbLabel="Arriendos"
            description="Catálogo conectado a publicaciones reales activas en SimpleAutos."
        />
    );
}
