'use client';

import {
    PanelMiNegocioShell,
    SERENATAS_BUSINESS_TABS,
    resolveSerenatasBusinessPageCopy,
} from '@simple/ui/panel';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { useSerenatasMusicians } from '@/hooks/use-serenatas-musicians';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';
import { GroupsView } from '@/components/panel/groups-view';

export default function GruposPage() {
    const { refresh } = useProviderGroupScope();
    const { musicians } = useSerenatasMusicians();
    const page = resolveSerenatasBusinessPageCopy('grupos');

    return (
        <PanelMiNegocioShell
            activeKey="grupos"
            tabs={SERENATAS_BUSINESS_TABS}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
        >
            <GroupsView musicians={musicians} refresh={refresh} />
        </PanelMiNegocioShell>
    );
}
