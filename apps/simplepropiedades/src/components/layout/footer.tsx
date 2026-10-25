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
            { label: 'Gestión para propietarios', href: '/servicios/venta-asistida' },
            { label: 'Alianzas inmobiliarias', href: '/alianzas-inmobiliarias' },
            { label: 'Simulador de crédito hipotecario', href: '/simulador-hipotecario' },
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
            currentPlatformHref="https://simplepropiedades.app"
            legalLinks={legalLinks}
            socialLinks={socialLinks}
            legalNotice="SimplePropiedades ofrece publicación y apoyo de comercialización según el alcance acordado con cada propietario o aliado. Los contratos se celebran entre las partes correspondientes; no somos una entidad financiera y el simulador hipotecario es referencial."
        />
    );
}
