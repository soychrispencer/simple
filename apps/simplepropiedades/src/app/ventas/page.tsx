'use client';

import PublicPropertyListingPage from '@/components/listings/public-property-listing-page';

export default function VentasPage() {
    return (
        <PublicPropertyListingPage
            section="sale"
            title="Propiedades en venta"
            breadcrumbLabel="Ventas"
            description="Catálogo conectado a publicaciones reales activas en SimplePropiedades."
        />
    );
}
