'use client';

import {
    PanelMiNegocioShell,
    SERENATAS_BUSINESS_TABS,
    resolveSerenatasBusinessPageCopy,
} from '@simple/ui/panel';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';
import { ProviderServicesView } from '@/components/panel/provider-services-view';

export default function ServiciosPage() {
    const { refresh } = useProviderGroupScope();
    const page = resolveSerenatasBusinessPageCopy('servicios');

    return (
        <PanelMiNegocioShell
            activeKey="servicios"
            tabs={SERENATAS_BUSINESS_TABS}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
        >
            <ProviderServicesView refresh={refresh} />
        </PanelMiNegocioShell>
    );
}
