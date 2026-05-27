'use client';

import { BrandLogo } from '@simple/ui/brand';
import { MarketplaceFooter } from '@simple/ui/layout';

const sections = [
    {
        title: 'Propiedades',
        links: [
            { label: 'Comprar', href: '/ventas' },
            { label: 'Arrendar', href: '/arriendos' },
            { label: 'Proyectos nuevos', href: '/proyectos' },
            { label: 'Publicar', href: '/panel/publicar' },
        ],
    },
    {
        title: 'Empresa',
        links: [
            { label: 'Nosotros', href: '/nosotros' },
            { label: 'Contacto', href: '/contacto' },
            { label: 'Blog', href: '/blog' },
        ],
    },
];

const legalLinks = [
    { label: 'Términos', href: '/terminos' },
    { label: 'Privacidad', href: '/privacidad' },
    { label: 'Preguntas frecuentes', href: '/faq' },
];

export function Footer() {
    return (
        <MarketplaceFooter
            logo={<BrandLogo appId="simplepropiedades" size="sm" />}
            description="SimplePropiedades simplifica la búsqueda y publicación de propiedades en Chile."
            copyrightName="SimplePropiedades"
            sections={sections}
            legalLinks={legalLinks}
        />
    );
}
