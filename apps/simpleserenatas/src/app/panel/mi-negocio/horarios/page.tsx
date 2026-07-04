'use client';

import {
    PanelMiNegocioShell,
    SERENATAS_BUSINESS_TABS,
    resolveSerenatasBusinessPageCopy,
} from '@simple/ui/panel';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';
import { ProviderAvailabilityView } from '@/components/panel/provider-availability-view';

export default function HorariosPage() {
    const { refresh } = useProviderGroupScope();
    const page = resolveSerenatasBusinessPageCopy('horarios');

    return (
        <PanelMiNegocioShell
            activeKey="horarios"
            tabs={SERENATAS_BUSINESS_TABS}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
        >
            <ProviderAvailabilityView />
        </PanelMiNegocioShell>
    );
}
