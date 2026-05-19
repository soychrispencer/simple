'use client';

import { useCallback, useEffect, useState } from 'react';
import { PanelCard, PanelStatusBadge, PanelSwitch } from '@simple/ui';
import { IconLoader2 } from '@tabler/icons-react';
import type { MusicianProfile } from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';

export function MusicianAvailabilityBadge({ availableNow }: { availableNow: boolean }) {
    return (
        <PanelStatusBadge
            tone={availableNow ? 'success' : 'neutral'}
            label={availableNow ? 'Disponible' : 'No disponible'}
            size="sm"
        />
    );
}

type MusicianAvailabilityToggleProps = {
    musician: MusicianProfile | null;
    refresh: () => Promise<void>;
    variant?: 'card' | 'compact';
    className?: string;
};

export function MusicianAvailabilityToggle({
    musician,
    refresh,
    variant = 'card',
    className,
}: MusicianAvailabilityToggleProps) {
    const [availableNow, setAvailableNow] = useState(musician?.availableNow ?? false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setAvailableNow(musician?.availableNow ?? false);
    }, [musician?.availableNow]);

    const persist = useCallback(async (next: boolean) => {
        if (!musician || loading) return;
        const previous = availableNow;
        setError(null);
        setAvailableNow(next);
        setLoading(true);
        const response = await serenatasApi.setMusicianAvailableNow(next);
        setLoading(false);
        if (!response.ok) {
            setAvailableNow(previous);
            setError(response.error ?? 'No pudimos actualizar tu disponibilidad.');
            return;
        }
        await refresh();
    }, [availableNow, loading, musician, refresh]);

    if (!musician) return null;

    const label = 'Disponible para serenatas';
    const hint = availableNow
        ? 'Los grupos pueden verte como disponible ahora.'
        : 'Actívalo cuando puedas aceptar serenatas en este momento.';

    if (variant === 'compact') {
        return (
            <div
                className={`panel-surface-subtle flex items-center gap-3 rounded-button border px-3 py-2.5 ${className ?? ''}`}
            >
                <div className="min-w-0 flex-1">
                    <p className="panel-text-fg text-xs font-semibold">{label}</p>
                    <p className="panel-text-muted mt-0.5 text-[11px] leading-snug">
                        {availableNow ? 'Activo ahora' : 'Inactivo'}
                    </p>
                </div>
                {loading ? (
                    <IconLoader2 size={18} className="panel-text-muted shrink-0 animate-spin" />
                ) : (
                    <PanelSwitch
                        checked={availableNow}
                        onChange={(next) => void persist(next)}
                        disabled={loading}
                        ariaLabel={label}
                        size="sm"
                    />
                )}
            </div>
        );
    }

    return (
        <PanelCard className={className}>
            <div className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="panel-text-fg font-semibold leading-tight">{label}</h3>
                        <MusicianAvailabilityBadge availableNow={availableNow} />
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    {loading ? (
                        <IconLoader2 size={20} className="panel-text-muted animate-spin" />
                    ) : null}
                    <PanelSwitch
                        checked={availableNow}
                        onChange={(next) => void persist(next)}
                        disabled={loading}
                        ariaLabel={label}
                    />
                </div>
            </div>
            <p className="panel-text-muted mt-2 w-full text-sm leading-snug">{hint}</p>
            {error ? (
                <p className="mt-2 w-full text-sm text-[var(--danger)]" role="alert">
                    {error}
                </p>
            ) : null}
        </PanelCard>
    );
}
