'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelBusinessPublishToggle, type PanelBusinessPublishStatus } from '@simple/ui/panel';
import { serenatasApi } from '@/lib/serenatas-api';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import {
    canPublishProviderGroup,
    countPricedActiveServices,
} from '@/lib/provider-group-publish';

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
            if (!response.ok) {
                setActiveServiceCount(0);
                return;
            }
            setActiveServiceCount(countPricedActiveServices(response.items));
        });
        return () => {
            cancelled = true;
        };
    }, [mariachi?.id, mariachi?.updatedAt]);

    const canPublish = useMemo(
        () => (mariachi ? canPublishProviderGroup(mariachi, activeServiceCount) : false),
        [mariachi, activeServiceCount, servicesLoading],
    );

    const isPublished = mariachi?.status === 'active';
    const isBusy = loading || toggling || servicesLoading;

    const status: PanelBusinessPublishStatus = !mariachi
        ? 'draft'
        : isPublished
          ? 'public'
          : canPublish
            ? 'paused'
            : 'incomplete';

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
        <PanelBusinessPublishToggle
            checked={isPublished}
            disabled={!mariachi || (!isPublished && !canPublish)}
            loading={isBusy}
            status={status}
            onChange={(next) => void handleToggle(next)}
            error={error}
            switchAriaLabel={
                !mariachi
                    ? 'Crea tu mariachi en Perfil público para publicar'
                    : isPublished
                      ? 'Pausar perfil público'
                      : 'Mostrar perfil público'
            }
        />
    );
}
