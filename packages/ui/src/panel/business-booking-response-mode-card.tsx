'use client';

import type { ReactNode } from 'react';
import { IconCalendarCheck, IconPointer } from '@tabler/icons-react';
import { PanelCard } from './panel-card.js';

export type BusinessBookingResponseMode = 'manual' | 'automatic';

export type BusinessBookingResponseModeCardProps = {
    title: string;
    description: string;
    mode: BusinessBookingResponseMode;
    onModeChange: (mode: BusinessBookingResponseMode) => void;
    manualTitle?: string;
    manualDescription?: string;
    automaticTitle?: string;
    automaticDescription?: string;
    automaticDisabled?: boolean;
    footer?: ReactNode;
    showActiveBadge?: boolean;
    hasUnsavedChanges?: boolean;
};

export function BusinessBookingResponseModeCard({
    title,
    description,
    mode,
    onModeChange,
    manualTitle = 'Revisar manualmente',
    manualDescription = 'Cada solicitud queda pendiente para que la apruebes desde el panel.',
    automaticTitle = 'Confirmar automáticamente',
    automaticDescription = 'Si el horario está disponible, se confirma sin intervención manual.',
    automaticDisabled = false,
    footer,
    showActiveBadge = true,
    hasUnsavedChanges = false,
}: BusinessBookingResponseModeCardProps) {
    const automaticSelected = mode === 'automatic';

    return (
        <PanelCard size="lg" className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-base font-semibold text-fg">{title}</p>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>
                </div>
                {showActiveBadge && automaticSelected && !hasUnsavedChanges ? (
                    <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                        Automático activo
                    </span>
                ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <button
                    type="button"
                    onClick={() => onModeChange('manual')}
                    className={`min-h-[132px] rounded-2xl border p-4 text-left transition-colors ${
                        !automaticSelected
                            ? 'border-accent-border bg-accent-soft text-fg'
                            : 'border-(--border) bg-(--surface) text-fg hover:border-(--border-strong)'
                    }`}
                >
                    <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--bg-subtle) text-accent">
                            <IconPointer size={18} />
                        </span>
                        <span className="text-sm font-semibold">{manualTitle}</span>
                    </span>
                    <span className="mt-3 block text-sm leading-relaxed text-fg-muted">{manualDescription}</span>
                </button>

                <button
                    type="button"
                    disabled={automaticDisabled}
                    onClick={() => onModeChange('automatic')}
                    className={`min-h-[132px] rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        automaticSelected
                            ? 'border-accent-border bg-accent-soft text-fg'
                            : 'border-(--border) bg-(--surface) text-fg hover:border-(--border-strong)'
                    }`}
                >
                    <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--bg-subtle) text-accent">
                            <IconCalendarCheck size={18} />
                        </span>
                        <span className="text-sm font-semibold">{automaticTitle}</span>
                    </span>
                    <span className="mt-3 block text-sm leading-relaxed text-fg-muted">{automaticDescription}</span>
                </button>
            </div>

            {footer}
        </PanelCard>
    );
}
