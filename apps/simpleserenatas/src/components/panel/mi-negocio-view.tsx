'use client';

import type { MusicianDirectoryItem } from '@/lib/serenatas-api';
import { type MiNegocioTab } from '@/lib/mi-negocio-tab';
import { GroupsView } from '@/components/panel/groups-view';
import { ProviderGroupView } from '@/components/panel/provider-group-view';
import { ProviderAvailabilityView } from '@/components/panel/provider-availability-view';
import { ProviderSettingsView } from '@/components/panel/provider-settings-view';
import { ProviderServicesView } from '@/components/panel/provider-services-view';
import { ProviderRepertoireView } from '@/components/panel/provider-repertoire-view';
import { ProviderPaymentMethodsView } from '@/components/panel/provider-payment-methods-view';
import { PanelBusinessShell, SERENATAS_BUSINESS_TABS } from '@simple/ui/panel';

export function MiNegocioView({
    tab,
    musicians,
    refresh,
}: {
    tab: MiNegocioTab;
    musicians: MusicianDirectoryItem[];
    refresh: () => Promise<void>;
}) {
    return (
        <PanelBusinessShell activeKey={tab} tabs={SERENATAS_BUSINESS_TABS} className="w-full">
            {tab === 'datos' ? (
                <ProviderGroupView refresh={refresh} />
            ) : null}
            {tab === 'servicios' ? <ProviderServicesView refresh={refresh} /> : null}
            {tab === 'medios-pago' ? <ProviderPaymentMethodsView refresh={refresh} /> : null}
            {tab === 'disponibilidad' ? <ProviderAvailabilityView /> : null}
            {tab === 'repertorio' ? <ProviderRepertoireView refresh={refresh} /> : null}
            {tab === 'grupos' ? (
                <GroupsView musicians={musicians} refresh={refresh} />
            ) : null}
            {tab === 'configuraciones' ? <ProviderSettingsView refresh={refresh} /> : null}
        </PanelBusinessShell>
    );
}
