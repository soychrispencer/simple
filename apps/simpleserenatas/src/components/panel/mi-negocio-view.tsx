'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PanelPillNav } from '@simple/ui';
import type { MusicianDirectoryItem } from '@/lib/serenatas-api';
import { type MiNegocioTab, isMiNegocioTab, miNegocioTabLabel, MI_NEGOCIO_TABS } from '@/lib/mi-negocio-tab';
import { panelMiNegocioHref } from '@/lib/panel-routes';
import { GroupsView } from '@/components/panel/groups-view';
import { ProviderGroupView } from '@/components/panel/provider-group-view';
import { ProviderAvailabilityView } from '@/components/panel/provider-availability-view';
import { ProviderSettingsView } from '@/components/panel/provider-settings-view';
import { ProviderServicesView } from '@/components/panel/provider-services-view';
import { ProviderPublishView } from '@/components/panel/provider-publish-view';
import { ProviderRepertoireView } from '@/components/panel/provider-repertoire-view';

export function MiNegocioView({
    tab,
    musicians,
    refresh,
}: {
    tab: MiNegocioTab;
    musicians: MusicianDirectoryItem[];
    refresh: () => Promise<void>;
}) {
    const router = useRouter();
    const pillItems = useMemo(
        () =>
            MI_NEGOCIO_TABS.map((key) => ({
                key,
                label: miNegocioTabLabel(key),
            })),
        [],
    );

    const changeTab = useCallback(
        (next: MiNegocioTab) => {
            router.replace(panelMiNegocioHref(next), { scroll: false });
        },
        [router],
    );

    return (
        <div className="grid w-full gap-5 lg:gap-6">
            <PanelPillNav
                items={pillItems}
                activeKey={tab}
                onChange={(key) => {
                    if (isMiNegocioTab(key)) changeTab(key);
                }}
                ariaLabel="Secciones de mi negocio"
                showMobileDropdown
                breakpoint="md"
                size="sm"
            />

            {tab === 'datos' ? (
                <ProviderGroupView refresh={refresh} />
            ) : null}
            {tab === 'disponibilidad' ? <ProviderAvailabilityView /> : null}
            {tab === 'servicios' ? <ProviderServicesView refresh={refresh} /> : null}
            {tab === 'repertorio' ? <ProviderRepertoireView refresh={refresh} /> : null}
            {tab === 'grupos' ? (
                <GroupsView musicians={musicians} refresh={refresh} />
            ) : null}
            {tab === 'configuraciones' ? <ProviderSettingsView refresh={refresh} /> : null}
            {tab === 'publicar' ? <ProviderPublishView refresh={refresh} /> : null}
        </div>
    );
}
