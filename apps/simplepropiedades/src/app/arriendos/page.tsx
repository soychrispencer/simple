'use client';

import PublicPropertyListingPage from '@/components/listings/public-property-listing-page';

export default function ArriendosPage() {
    return (
        <PublicPropertyListingPage
            section="rent"
            title="Propiedades en arriendo"
            breadcrumbLabel="Arriendos"
            description="Catálogo conectado a publicaciones reales activas en SimplePropiedades."
        />
    );
}
