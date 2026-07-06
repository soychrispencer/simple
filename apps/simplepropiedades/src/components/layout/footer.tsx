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
            { label: 'Simulador hipotecario', href: '/simulador-hipotecario' },
            { label: 'Publicar', href: '/panel/publicar' },
            { label: 'Gestión inmobiliaria', href: '/servicios/venta-asistida' },
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
];

const socialLinks = [
    { label: 'SimplePropiedades en Instagram', href: 'https://www.instagram.com/simplepropiedades.app' },
];

export function Footer() {
    return (
        <MarketplaceFooter
            logo={<BrandLogo appId="simplepropiedades" size="sm" />}
            description="SimplePropiedades simplifica la búsqueda y publicación de propiedades en Chile."
            copyrightName="SimplePropiedades"
            sections={sections}
            legalLinks={legalLinks}
            socialLinks={socialLinks}
            legalNotice="SimplePropiedades es un marketplace inmobiliario de publicación. No es corredora de propiedades ni entidad financiera; el simulador hipotecario es referencial."
        />
    );
}
