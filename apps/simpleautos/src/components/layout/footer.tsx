'use client';

import { BrandLogo } from '@simple/ui/brand';
import { MarketplaceFooter } from '@simple/ui/layout';

const sections = [
    {
        title: 'Vehículos',
        links: [
            { label: 'Comprar', href: '/ventas' },
            { label: 'Arrendar', href: '/arriendos' },
            { label: 'Subastas', href: '/subastas' },
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
            logo={<BrandLogo appId="simpleautos" size="sm" />}
            description="SimpleAutos simplifica la compra y venta de vehículos en Chile."
            copyrightName="SimpleAutos"
            sections={sections}
            legalLinks={legalLinks}
        />
    );
}
