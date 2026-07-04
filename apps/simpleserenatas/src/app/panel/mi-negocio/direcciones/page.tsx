'use client';

import {
    PanelMiNegocioShell,
    PanelBusinessAddressesContent,
    SERENATAS_BUSINESS_TABS,
    resolveSerenatasBusinessPageCopy,
} from '@simple/ui/panel';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';

export default function DireccionesPage() {
    const { refresh } = useProviderGroupScope();
    const page = resolveSerenatasBusinessPageCopy('direcciones');

    return (
        <PanelMiNegocioShell
            activeKey="direcciones"
            tabs={SERENATAS_BUSINESS_TABS}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
        >
            <PanelBusinessAddressesContent vertical="serenatas" />
        </PanelMiNegocioShell>
    );
}
