'use client';

import {
    PanelMiNegocioShell,
    SERENATAS_BUSINESS_TABS,
    resolveSerenatasBusinessPageCopy,
} from '@simple/ui/panel';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';
import { ProviderSettingsView } from '@/components/panel/provider-settings-view';

export default function ConfiguracionesPage() {
    const { refresh } = useProviderGroupScope();
    const page = resolveSerenatasBusinessPageCopy('configuraciones');

    return (
        <PanelMiNegocioShell
            activeKey="configuraciones"
            tabs={SERENATAS_BUSINESS_TABS}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
        >
            <ProviderSettingsView refresh={refresh} />
        </PanelMiNegocioShell>
    );
}
