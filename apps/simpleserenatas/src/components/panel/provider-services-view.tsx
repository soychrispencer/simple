'use client';

import { PanelButton, PanelNotice } from '@simple/ui/panel';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { ProviderServicesEditor } from '@/components/panel/provider-services-editor';
import { EmptyBlock } from './shared';

export function ProviderServicesView({ refresh }: { refresh: () => Promise<void> }) {
    const { mariachi, hasMariachi, loading, error, refresh: refreshMariachi } = useMyMariachi();

    const handleSaved = async () => {
        await refreshMariachi();
        await refresh();
    };

    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando…</p>;
    }

    if (error) {
        return (
            <PanelNotice tone="error">
                {error}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refreshMariachi()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    if (!hasMariachi || !mariachi) {
        return (
            <EmptyBlock
                title="Crea tus datos comerciales primero"
                description="Configura tu mariachi en Datos comerciales y luego publica tus servicios aquí."
            />
        );
    }

    return <ProviderServicesEditor key={mariachi.id} group={mariachi} onSaved={handleSaved} />;
}
