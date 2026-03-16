'use client';

import PublicPropertyListingPage from '@/components/listings/public-property-listing-page';

export default function ProyectosPage() {
    return (
        <PublicPropertyListingPage
            section="project"
            title="Proyectos inmobiliarios"
            breadcrumbLabel="Proyectos"
            description="Catálogo conectado a publicaciones reales activas en SimplePropiedades."
        />
    );
}
