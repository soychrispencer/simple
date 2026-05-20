'use client';

import { PanelButton, PanelNotice } from '@simple/ui';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { ProviderSettingsEditor } from '@/components/panel/provider-settings-editor';
import { EmptyBlock } from './shared';

export function ProviderSettingsView({ refresh }: { refresh: () => Promise<void> }) {
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
                title="Crea tu perfil comercial primero"
                description="Configura tu mariachi en la pestaña Perfil comercial y luego define reglas de reservas y pagos aquí."
            />
        );
    }

    return <ProviderSettingsEditor group={mariachi} onSaved={handleSaved} />;
}
