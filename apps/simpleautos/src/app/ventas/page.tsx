'use client';

import PublicVehicleListingPage from '@/components/listings/public-vehicle-listing-page';

export default function VentasPage() {
    return (
        <PublicVehicleListingPage
            section="sale"
            title="Vehículos en venta"
            breadcrumbLabel="Ventas"
            description="Catálogo conectado a publicaciones reales activas en SimpleAutos."
        />
    );
}
