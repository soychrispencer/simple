'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PanelPillNav } from './panel-navigation.js';
import { getVerticalAdvertisingConfig, type AdvertisingVertical } from '@simple/utils';

export type MarketplacePublicidadShellProps = {
    vertical: AdvertisingVertical;
    header?: ReactNode;
    boostContent: ReactNode;
    campaignsContent: ReactNode;
};

export function MarketplacePublicidadShell({
    vertical,
    header,
    boostContent,
    campaignsContent,
}: MarketplacePublicidadShellProps) {
    const config = getVerticalAdvertisingConfig(vertical);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') === 'campaigns' ? 'campaigns' : 'boost';

    const setActiveTab = (tab: 'campaigns' | 'boost') => {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set('tab', tab);
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    };

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            {header}

            <div className="mb-6">
                <PanelPillNav
                    items={[
                        { key: 'boost', label: config.copy.boostTabLabel },
                        { key: 'campaigns', label: config.copy.campaignsTabLabel },
                    ]}
                    activeKey={activeTab}
                    onChange={(key: string) => setActiveTab(key as 'campaigns' | 'boost')}
                    breakpoint="md"
                    size="sm"
                    mobileLabel="Sección publicitaria"
                    ariaLabel="Secciones de publicidad"
                />
            </div>

            {activeTab === 'boost' ? boostContent : campaignsContent}
        </div>
    );
}
