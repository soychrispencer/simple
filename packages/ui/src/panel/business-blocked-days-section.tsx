'use client';

import { IconCalendarOff, IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react';
import { formatBusinessBlockedSlotRange } from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelEmptyState, PanelField, PanelIconButton } from './panel-display.js';
import { BusinessScheduleTimeSelect } from './business-schedule-fields.js';
import {
    BUSINESS_BLOCKED_DAYS_EMPTY,
    BUSINESS_BLOCKED_DAYS_SECTION,
} from './business-copy.js';

export type BusinessBlockedDaySlot = {
    id: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
};

export type BusinessBlockedDaysFormState = {
    mode: 'fullDay' | 'hours';
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    reason: string;
    error?: string;
    saving?: boolean;
};

export type BusinessBlockedDaysSectionProps = {
    title?: string;
    description?: string;
    slots: BusinessBlockedDaySlot[];
    showForm: boolean;
    onShowFormChange: (show: boolean) => void;
    form: BusinessBlockedDaysFormState;
    onFormFieldChange: <K extends keyof BusinessBlockedDaysFormState>(
        key: K,
        value: BusinessBlockedDaysFormState[K],
    ) => void;
    onSubmit: () => void;
    onCancel: () => void;
    onDeleteSlot: (id: string) => void;
    deletingSlotId?: string | null;
    emptyDescription?: string;
    formatRange?: (startsAt: string, endsAt: string) => string;
    className?: string;
};

export function BusinessBlockedDaysSection({
    title = BUSINESS_BLOCKED_DAYS_SECTION.title,
    description = BUSINESS_BLOCKED_DAYS_SECTION.description,
    slots,
    showForm,
    onShowFormChange,
    form,
    onFormFieldChange,
    onSubmit,
    onCancel,
    onDeleteSlot,
    deletingSlotId,
    emptyDescription = BUSINESS_BLOCKED_DAYS_EMPTY.description,
    formatRange = formatBusinessBlockedSlotRange,
    className,
}: BusinessBlockedDaysSectionProps) {
    return (
        <div className={className}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="shrink-0 text-sm font-semibold text-fg">{title}</h2>
                {!showForm ? (
                    <PanelButton
                        variant="secondary"
                        size="sm"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => onShowFormChange(true)}
                    >
                        <IconPlus size={14} /> Bloquear fechas
                    </PanelButton>
                ) : null}
            </div>
            {description ? (
                <p className="mb-4 text-xs text-fg-muted">{description}</p>
            ) : null}

            {showForm ? (
                <div className="mb-4">
                    <PanelCard size="md" className="border-accent/30">
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-2">
                                {(['fullDay', 'hours'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => onFormFieldChange('mode', mode)}
                                        className="flex-1 rounded-xl border py-2.5 text-sm transition-colors"
                                        style={{
                                            borderColor: form.mode === mode ? 'var(--accent)' : 'var(--border)',
                                            background: form.mode === mode ? 'var(--accent-soft)' : 'transparent',
                                            color: form.mode === mode ? 'var(--accent)' : 'var(--fg-secondary)',
                                            fontWeight: form.mode === mode ? 600 : 400,
                                        }}
                                    >
                                        {mode === 'fullDay' ? 'Día(s) completo(s)' : 'Horario específico'}
                                    </button>
                                ))}
                            </div>

                            {form.mode === 'fullDay' ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <PanelField label="Desde" required>
                                        <input
                                            type="date"
                                            value={form.startDate}
                                            onChange={(event) => onFormFieldChange('startDate', event.target.value)}
                                            className="form-input"
                                        />
                                    </PanelField>
                                    <PanelField label="Hasta" required>
                                        <input
                                            type="date"
                                            value={form.endDate}
                                            onChange={(event) => onFormFieldChange('endDate', event.target.value)}
                                            className="form-input"
                                        />
                                    </PanelField>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <PanelField label="Fecha" required>
                                        <input
                                            type="date"
                                            value={form.startDate}
                                            onChange={(event) => onFormFieldChange('startDate', event.target.value)}
                                            className="form-input"
                                        />
                                    </PanelField>
                                    <PanelField label="Desde" required>
                                        <BusinessScheduleTimeSelect
                                            value={form.startTime}
                                            onChange={(value) => onFormFieldChange('startTime', value)}
                                            aria-label="Hora de inicio del bloqueo"
                                        />
                                    </PanelField>
                                    <PanelField label="Hasta" required>
                                        <BusinessScheduleTimeSelect
                                            value={form.endTime}
                                            onChange={(value) => onFormFieldChange('endTime', value)}
                                            aria-label="Hora de fin del bloqueo"
                                        />
                                    </PanelField>
                                </div>
                            )}

                            <PanelField label="Motivo" hint="Opcional, solo para tu referencia.">
                                <input
                                    type="text"
                                    value={form.reason}
                                    onChange={(event) => onFormFieldChange('reason', event.target.value)}
                                    placeholder={form.mode === 'fullDay' ? 'Ej: Vacaciones, feriado' : 'Ej: Reunión, imprevisto'}
                                    className="form-input w-full"
                                />
                            </PanelField>

                            {form.error ? <p className="text-xs text-(--color-error,#dc2626)">{form.error}</p> : null}

                            <div className="flex gap-3">
                                <PanelButton variant="accent" onClick={onSubmit} disabled={form.saving}>
                                    {form.saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                    {form.saving ? 'Guardando…' : 'Bloquear'}
                                </PanelButton>
                                <PanelButton variant="secondary" onClick={onCancel}>
                                    Cancelar
                                </PanelButton>
                            </div>
                        </div>
                    </PanelCard>
                </div>
            ) : null}

            {slots.length === 0 && !showForm ? (
                <PanelEmptyState
                    title={BUSINESS_BLOCKED_DAYS_EMPTY.title}
                    description={emptyDescription}
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {slots.map((slot) => {
                        const isDeleting = deletingSlotId === slot.id;
                        return (
                            <PanelCard key={slot.id} size="sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-muted text-fg-muted">
                                        <IconCalendarOff size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-fg">
                                            {formatRange(slot.startsAt, slot.endsAt)}
                                        </p>
                                        {slot.reason ? <p className="mt-0.5 text-xs text-fg-muted">{slot.reason}</p> : null}
                                    </div>
                                    <PanelIconButton
                                        label="Quitar bloqueo"
                                        onClick={() => onDeleteSlot(slot.id)}
                                        disabled={isDeleting}
                                        className="border border-border hover:border-red-500/40 hover:bg-red-500/10"
                                    >
                                        {isDeleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                    </PanelIconButton>
                                </div>
                            </PanelCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
