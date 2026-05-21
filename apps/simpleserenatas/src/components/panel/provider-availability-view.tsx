'use client';

import { PanelButton, PanelNotice } from '@simple/ui';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { ProviderAvailabilityEditor } from '@/components/panel/provider-availability-editor';
import { EmptyBlock } from './shared';

export function ProviderAvailabilityView() {
    const { mariachi, hasMariachi, loading, error, refresh } = useMyMariachi();

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

    if (!hasMariachi || !mariachi) {
        return (
            <EmptyBlock
                title="Crea tus datos comerciales primero"
                description="Configura tu mariachi en Datos comerciales y luego define horarios aquí."
            />
        );
    }

    return <ProviderAvailabilityEditor group={mariachi} />;
}
