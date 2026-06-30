'use client';

import { PanelButton, PanelNotice } from '@simple/ui/panel';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { ProviderGroupServicesCatalog } from '@/components/panel/provider-group-services-catalog';

export function ProviderServicesView({ refresh }: { refresh: () => Promise<void> }) {
    const { group, loading, error, refresh: refreshAll, ensureGroup } = useProviderGroupScope(refresh);

    const handleSaved = async () => {
        await refreshAll();
    };

    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando…</p>;
    }

    if (error) {
        return (
            <PanelNotice tone="error">
                {error}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refreshAll()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    return (
        <ProviderGroupServicesCatalog
            group={group}
            ensureGroup={ensureGroup}
            onSaved={handleSaved}
        />
    );
}
