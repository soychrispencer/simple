'use client';

import type { ComponentProps } from 'react';
import { MarketplaceMiNegocioSectionPage } from '@simple/ui/panel';

type MiNegocioSectionPageProps = Omit<ComponentProps<typeof MarketplaceMiNegocioSectionPage>, 'vertical'>;

export function MiNegocioSectionPage(props: MiNegocioSectionPageProps) {
    return <MarketplaceMiNegocioSectionPage vertical="propiedades" {...props} />;
}
