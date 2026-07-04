'use client';

import {
    PanelMiNegocioShell,
    SERENATAS_BUSINESS_TABS,
    resolveSerenatasBusinessPageCopy,
} from '@simple/ui/panel';
import { ProviderGroupView } from '@/components/panel/provider-group-view';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';

export default function DatosPage() {
    const { refresh } = useProviderGroupScope();
    const page = resolveSerenatasBusinessPageCopy('datos');

    return (
        <PanelMiNegocioShell
            activeKey="datos"
            tabs={SERENATAS_BUSINESS_TABS}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
        >
            <ProviderGroupView refresh={refresh} />
        </PanelMiNegocioShell>
    );
}
