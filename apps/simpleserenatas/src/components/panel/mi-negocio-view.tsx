'use client';

import type { MusicianDirectoryItem } from '@/lib/serenatas-api';
import { type MiNegocioTab } from '@/lib/mi-negocio-tab';
import { GroupsView } from '@/components/panel/groups-view';
import { ProviderGroupView } from '@/components/panel/provider-group-view';
import { ProviderAvailabilityView } from '@/components/panel/provider-availability-view';
import { ProviderSettingsView } from '@/components/panel/provider-settings-view';
import { ProviderRepertoireView } from '@/components/panel/provider-repertoire-view';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';
import {
    PanelBusinessAddressesContent,
    PanelMiNegocioShell,
    SERENATAS_BUSINESS_TABS,
    resolveSerenatasBusinessPageCopy,
} from '@simple/ui/panel';

export function MiNegocioView({
    tab,
    musicians,
    refresh,
    onTabChange,
}: {
    tab: MiNegocioTab;
    musicians: MusicianDirectoryItem[];
    refresh: () => Promise<void>;
    onTabChange?: (tab: MiNegocioTab) => void;
}) {
    const page = resolveSerenatasBusinessPageCopy(tab);

    return (
        <PanelMiNegocioShell
            activeKey={tab}
            tabs={SERENATAS_BUSINESS_TABS}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
            onTabChange={onTabChange ? (key) => onTabChange(key as MiNegocioTab) : undefined}
        >
            {tab === 'datos' ? (
                <ProviderGroupView refresh={refresh} />
            ) : null}
            {tab === 'direcciones' ? <PanelBusinessAddressesContent vertical="serenatas" /> : null}
            {tab === 'horarios' ? <ProviderAvailabilityView /> : null}
            {tab === 'repertorio' ? <ProviderRepertoireView refresh={refresh} /> : null}
            {tab === 'grupos' ? (
                <GroupsView musicians={musicians} refresh={refresh} />
            ) : null}
            {tab === 'configuraciones' ? <ProviderSettingsView refresh={refresh} /> : null}
        </PanelMiNegocioShell>
    );
}
