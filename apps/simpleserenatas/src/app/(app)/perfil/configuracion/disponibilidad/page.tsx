'use client';

import { IconCalendar, IconClock, IconLoader, IconToggleLeft, IconToggleRight } from '@tabler/icons-react';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { useAvailability } from '@/hooks';

function AvailabilityRow({
    title,
    description,
    active,
    disabled,
    onClick,
}: {
    title: string;
    description: string;
    active: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    const ToggleIcon = active ? IconToggleRight : IconToggleLeft;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-wait disabled:opacity-70"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
        >
            <span className="min-w-0">
                <span className="block font-medium" style={{ color: 'var(--fg)' }}>
                    {title}
                </span>
                <span className="mt-1 block text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {description}
                </span>
            </span>
            <ToggleIcon
                size={34}
                stroke={1.8}
                className="shrink-0"
                style={{ color: active ? 'var(--accent)' : 'var(--fg-muted)' }}
            />
        </button>
    );
}

export default function DisponibilidadPage() {
    const { isAvailable, availableNow, isLoading, toggleAvailability, toggleAvailableNow } = useAvailability();

    return (
        <SerenatasPageShell width="default">
            <SerenatasPageHeader
                title="Disponibilidad"
                description="Define si puedes recibir invitaciones de coordinadores."
            />

            <div className="space-y-4">
                <AvailabilityRow
                    title="Disponible para esta semana"
                    description="Los coordinadores podrán invitarte a serenatas y cuadrillas."
                    active={isAvailable}
                    disabled={isLoading}
                    onClick={() => void toggleAvailability()}
                />

                <AvailabilityRow
                    title="Disponible ahora"
                    description="Úsalo solo cuando puedas responder urgencias durante la jornada."
                    active={availableNow}
                    disabled={isLoading}
                    onClick={() => void toggleAvailableNow()}
                />

                <div
                    className="rounded-xl border p-4"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="mb-3 flex items-center gap-2">
                        <IconCalendar size={18} style={{ color: 'var(--accent)' }} />
                        <h2 className="font-medium" style={{ color: 'var(--fg)' }}>
                            Próximo paso
                        </h2>
                    </div>
                    <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        <IconClock size={16} className="mt-0.5 shrink-0" />
                        <p>
                            El calendario por bloques horarios queda para la siguiente fase. Por ahora estos estados
                            alimentan las invitaciones y urgencias.
                        </p>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader size={16} className="animate-spin" />
                    Guardando disponibilidad...
                </div>
            )}
        </SerenatasPageShell>
    );
}
