'use client';

import { BrandLogo } from '@simple/ui/brand';
import { MarketplaceFooter } from '@simple/ui/layout';

const legalLinks = [
    { label: 'Privacidad', href: 'https://simpleplataforma.app/privacidad' },
    { label: 'Términos', href: 'https://simpleplataforma.app/terminos' },
];

const socialLinks = [
    { label: 'SimpleSerenatas en Instagram', href: 'https://www.instagram.com/simpleserenata' },
];

export function Footer() {
    return (
        <MarketplaceFooter
            logo={<BrandLogo appId="simpleserenatas" size="sm" />}
            description="La plataforma para coordinar serenatas, conectar músicos con clientes y organizar grupos."
            copyrightName="SimpleSerenatas"
            legalLinks={legalLinks}
            socialLinks={socialLinks}
        />
    );
}
