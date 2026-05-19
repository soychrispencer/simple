'use client';

import { BrandLogo, MarketplaceFooter } from '@simple/ui';

const platformLinks = [
    { label: 'Clientes', href: '/#para-clientes' },
    { label: 'Músicos', href: '/#musicos' },
    { label: 'Dueños', href: '/para-duenos' },
    { label: 'Cómo funciona', href: '/#como-funciona' },
];

export function Footer() {
    return (
        <MarketplaceFooter
            logo={<BrandLogo appId="simpleserenatas" size="sm" />}
            description="La plataforma para coordinar serenatas, conectar músicos con clientes y organizar grupos."
            copyrightName="SimpleSerenatas"
            platformLinks={platformLinks}
        />
    );
}
