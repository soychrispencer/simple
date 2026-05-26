'use client';

import { BrandLogo } from '@simple/ui/brand';
import { MarketplaceFooter } from '@simple/ui/layout';

export function Footer() {
    return (
        <MarketplaceFooter
            logo={<BrandLogo appId="simpleserenatas" size="sm" />}
            description="La plataforma para coordinar serenatas, conectar músicos con clientes y organizar grupos."
            copyrightName="SimpleSerenatas"
        />
    );
}
