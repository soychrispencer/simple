'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconEye, IconEyeOff, IconLoader2, IconAlertCircle } from '@tabler/icons-react';
import { PanelSwitch } from '@simple/ui/panel';
import { serenatasApi } from '@/lib/serenatas-api';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import {
    canPublishProviderGroup,
    countPricedActiveServices,
} from '@/lib/provider-group-publish';

/**
 * Toggle compacto de visibilidad del mariachi para el encabezado de Mi Negocio.
 * Se muestra en todas las pestañas de la sección.
 */
export function MiNegocioPublishToggle({ refresh }: { refresh: () => Promise<void> }) {
    const { mariachi, loading, refresh: refreshMariachi } = useMyMariachi();
    const [toggling, setToggling] = useState(false);
    const [activeServiceCount, setActiveServiceCount] = useState(0);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!mariachi?.id) {
            setActiveServiceCount(0);
            return;
        }
        let cancelled = false;
        setServicesLoading(true);
        void serenatasApi.providerGroupServices(mariachi.id).then((response) => {
            if (cancelled) return;
            setServicesLoading(false);
            if (!response.ok) { setActiveServiceCount(0); return; }
            setActiveServiceCount(countPricedActiveServices(response.items));
        });
        return () => { cancelled = true; };
    }, [mariachi?.id, mariachi?.updatedAt]);

    const canPublish = useMemo(
        () => (mariachi ? canPublishProviderGroup(mariachi, activeServiceCount) : false),
        [mariachi, activeServiceCount, servicesLoading],
    );

    if (loading || !mariachi) return null;

    const isPublished = mariachi.status === 'active';
    const isBusy = toggling || servicesLoading;

    async function handleToggle(next: boolean) {
        if (!mariachi) return;
        if (next && !canPublish) return;
        setError(null);
        setToggling(true);
        const response = await serenatasApi.updateProviderGroup(mariachi.id, {
            status: next ? 'active' : 'paused',
        });
        setToggling(false);
        if (!response.ok) {
            setError(response.error ?? 'No pudimos actualizar la visibilidad.');
            return;
        }
        await refreshMariachi();
        await refresh();
    }

    return (
        <div className="grid gap-2.5">
        <div className="flex items-center gap-2.5">
            {/* Badge de estado */}
            <span
                className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex"
                style={{
                    background: isPublished
                        ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
                        : !canPublish
                          ? 'color-mix(in oklab, #f59e0b 10%, var(--surface))'
                          : 'var(--bg-subtle)',
                    color: isPublished ? 'var(--accent)' : !canPublish ? '#92400e' : 'var(--fg-muted)',
                }}
            >
                {isPublished ? (
                    <IconEye size={12} />
                ) : !canPublish ? (
                    <IconAlertCircle size={12} />
                ) : (
                    <IconEyeOff size={12} />
                )}
                {isPublished ? 'Público' : canPublish ? 'Pausado' : 'Incompleto'}
            </span>

            {/* Toggle o spinner */}
            {isBusy ? (
                <IconLoader2 size={20} className="animate-spin text-fg-muted" />
            ) : (
                <PanelSwitch
                    checked={isPublished}
                    onChange={(next) => void handleToggle(next)}
                    disabled={!isPublished && !canPublish}
                    ariaLabel={isPublished ? 'Pausar visibilidad en marketplace' : 'Publicar en marketplace'}
                />
            )}
            {error ? (
                <p className="text-sm text-rose-500">{error}</p>
            ) : null}
        </div>
        </div>
    );
}
