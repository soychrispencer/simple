'use client';

import { PanelButton, PanelNotice } from '@simple/ui/panel';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { ProviderAvailabilityEditor } from '@/components/panel/provider-availability-editor';

export function ProviderAvailabilityView() {
    const { group, loading, error, refresh, ensureGroup } = useProviderGroupScope();

    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando…</p>;
    }

    if (error) {
        return (
            <PanelNotice tone="error">
                {error}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refresh()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    return <ProviderAvailabilityEditor group={group} ensureGroup={ensureGroup} />;
}
