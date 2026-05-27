'use client';

import { BrandLogo } from '@simple/ui/brand';
import { MarketplaceFooter } from '@simple/ui/layout';

const sections = [
    {
        title: 'Servicios',
        links: [
            { label: 'Agenda', href: '/agenda' },
            { label: 'Calendario', href: '/calendario' },
            { label: 'Reservas', href: '/reservas' },
        ],
    },
    {
        title: 'Soporte',
        links: [
            { label: 'Ayuda', href: '/ayuda' },
            { label: 'Contacto', href: '/contacto' },
            { label: 'Preguntas frecuentes', href: '/faq' },
        ],
    },
];

const legalLinks = [
    { label: 'Privacidad', href: '/privacidad' },
    { label: 'Términos', href: '/terminos' },
];

export function Footer() {
    return (
        <MarketplaceFooter
            logo={<BrandLogo appId="simpleagenda" size="sm" />}
            description="SimpleAgenda simplifica la gestión de citas y reservas."
            copyrightName="SimpleAgenda"
            sections={sections}
            legalLinks={legalLinks}
        />
    );
}
