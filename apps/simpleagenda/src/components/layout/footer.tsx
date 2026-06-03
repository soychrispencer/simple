'use client';

import { BrandLogo } from '@simple/ui/brand';
import { MarketplaceFooter } from '@simple/ui/layout';

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
            legalLinks={legalLinks}
        />
    );
}
