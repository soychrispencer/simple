'use client';

import type { ReactNode } from 'react';
import { PanelPageHeader } from '../panel';
import { PanelAccountLocationContent } from '../panel/account-location-content';
import { ACCOUNT_LOCATION_PAGE } from '../panel/account-copy';

export function PanelAddressesPage({
    afterHeader,
    appLabel = 'Simple',
}: {
    afterHeader?: ReactNode;
    appLabel?: string;
}) {
    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader
                title={ACCOUNT_LOCATION_PAGE.title}
                description={ACCOUNT_LOCATION_PAGE.description}
            />
            {afterHeader}
            <PanelAccountLocationContent appLabel={appLabel} />
        </div>
    );
}
