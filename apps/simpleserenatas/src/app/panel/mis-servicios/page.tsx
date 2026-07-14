'use client';

import {
    PanelMiNegocioShell,
    resolveSerenatasBusinessPageCopy,
} from '@simple/ui/panel';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';
import { ProviderServicesView } from '@/components/panel/provider-services-view';

export default function MisServiciosPage() {
    const { refresh } = useProviderGroupScope();
    const page = resolveSerenatasBusinessPageCopy('servicios');

    return (
        <PanelMiNegocioShell
            activeKey="servicios"
            tabs={[]}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
        >
            <ProviderServicesView refresh={refresh} />
        </PanelMiNegocioShell>
    );
}
