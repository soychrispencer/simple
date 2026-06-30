'use client';

import type { ReactNode } from 'react';
import { IconClock, IconLoader2 } from '@tabler/icons-react';
import { formatBusinessScheduleRange, scheduleCrossesMidnight } from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelSectionSaveFooter, panelSectionSaveLabel } from './panel-section-save-footer.js';
import { PanelCard } from './panel-card.js';
import { PanelBlockHeader, PanelSwitch } from './panel-primitives.js';
import { PanelField } from './panel-display.js';
import { BusinessScheduleTimeSelect } from './business-schedule-fields.js';
import {
    BusinessBlockedDaysSection,
    type BusinessBlockedDaySlot,
    type BusinessBlockedDaysFormState,
} from './business-blocked-days-section.js';
import {
    BUSINESS_BLOCKED_DAYS_SECTION,
    BUSINESS_SCHEDULE_ALWAYS_OPEN_LABEL,
    BUSINESS_SCHEDULE_NOTE_FIELD,
    BUSINESS_SCHEDULE_PAGE,
    BUSINESS_WEEKLY_BREAK_SECTION,
} from './business-copy.js';

export type BusinessSchedulePanelDay = {
    key: string;
    dayOfWeek?: number;
    dayLabel: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
    toggling?: boolean;
};

export type BusinessSchedulePanelProps = {
    /** Oculta título cuando la página shell ya lo muestra. */
    hideTitle?: boolean;
    description?: string;
    days: BusinessSchedulePanelDay[];
    onStartTimeChange: (key: string, value: string) => void;
    onEndTimeChange: (key: string, value: string) => void;
    onDayToggle: (key: string) => void;
    alwaysOpen?: boolean;
    onAlwaysOpenChange?: (value: boolean) => void;
    weeklyBreak: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        onEnabledChange: (enabled: boolean) => void;
        onStartTimeChange: (value: string) => void;
        onEndTimeChange: (value: string) => void;
        error?: string | null;
    };
    scheduleNote?: string;
    onScheduleNoteChange?: (value: string) => void;
    blockedSlots: BusinessBlockedDaySlot[];
    showBlockedForm: boolean;
    onShowBlockedFormChange: (show: boolean) => void;
    blockedForm: BusinessBlockedDaysFormState;
    onBlockedFormFieldChange: <K extends keyof BusinessBlockedDaysFormState>(
        key: K,
        value: BusinessBlockedDaysFormState[K],
    ) => void;
    onBlockedSubmit: () => void;
    onBlockedCancel: () => void;
    onDeleteBlockedSlot: (id: string) => void;
    deletingBlockedSlotId?: string | null;
    blockedDescription?: string;
    onLoadTypicalSchedule?: () => void;
    loadingTypicalSchedule?: boolean;
    showLoadTypicalSchedule?: boolean;
    toolbarActions?: ReactNode;
    batchSave: {
        dirty: boolean;
        saving: boolean;
        status?: string;
        onSave: () => void;
        label?: string;
    };
    ruleErrors?: Record<string, string>;
    fieldsDisabled?: boolean;
    className?: string;
};

function CompactDayRow({
    day,
    disabled,
    onToggle,
    onStartTimeChange,
    onEndTimeChange,
    error,
}: {
    day: BusinessSchedulePanelDay;
    disabled?: boolean;
    onToggle: () => void;
    onStartTimeChange: (value: string) => void;
    onEndTimeChange: (value: string) => void;
    error?: string | null;
}) {
    const isActive = day.isActive !== false;
    const rowDisabled = disabled || !isActive;
    const overnight = isActive && scheduleCrossesMidnight(day.startTime, day.endTime);

    return (
        <div
            className={`rounded-xl border border-border px-3 py-2.5 transition-opacity ${isActive ? '' : 'opacity-55'}`}
        >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 sm:grid-cols-[auto_minmax(5rem,1fr)_7.5rem_7.5rem] sm:gap-3">
                <div className="flex items-center">
                    {day.toggling ? (
                        <IconLoader2 size={14} className="animate-spin text-fg-muted" />
                    ) : (
                        <PanelSwitch
                            checked={isActive}
                            onChange={onToggle}
                            disabled={disabled}
                            size="sm"
                            ariaLabel={isActive ? 'Cerrar día' : 'Abrir día'}
                        />
                    )}
                </div>
                <span className="truncate text-sm font-medium text-fg">{day.dayLabel}</span>
                <BusinessScheduleTimeSelect
                    value={day.startTime}
                    onChange={onStartTimeChange}
                    disabled={rowDisabled}
                    aria-label={`Inicio ${day.dayLabel}`}
                />
                <BusinessScheduleTimeSelect
                    value={day.endTime}
                    onChange={onEndTimeChange}
                    disabled={rowDisabled}
                    aria-label={`Fin ${day.dayLabel}`}
                />
            </div>
            {overnight ? (
                <p className="mt-1.5 pl-8 text-xs text-fg-muted sm:pl-9">
                    {formatBusinessScheduleRange(day.startTime, day.endTime)}
                </p>
            ) : null}
            {error ? <p className="mt-1.5 pl-8 text-xs text-(--color-error,#dc2626) sm:pl-9">{error}</p> : null}
        </div>
    );
}

export function BusinessSchedulePanel({
    hideTitle = false,
    description,
    days,
    onStartTimeChange,
    onEndTimeChange,
    onDayToggle,
    alwaysOpen,
    onAlwaysOpenChange,
    weeklyBreak,
    scheduleNote = '',
    onScheduleNoteChange,
    blockedSlots,
    showBlockedForm,
    onShowBlockedFormChange,
    blockedForm,
    onBlockedFormFieldChange,
    onBlockedSubmit,
    onBlockedCancel,
    onDeleteBlockedSlot,
    deletingBlockedSlotId,
    blockedDescription,
    onLoadTypicalSchedule,
    loadingTypicalSchedule,
    showLoadTypicalSchedule,
    toolbarActions,
    batchSave,
    ruleErrors,
    fieldsDisabled,
    className,
}: BusinessSchedulePanelProps) {
    const globalDisabled = fieldsDisabled || alwaysOpen;
    const hasActiveDays = days.some((day) => day.isActive !== false);
    const breakDisabled = globalDisabled || !hasActiveDays;

    return (
        <PanelCard size="lg" className={className}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    {hideTitle ? null : (
                        <PanelBlockHeader
                            title={BUSINESS_SCHEDULE_PAGE.title}
                            description={description || undefined}
                            className="mb-0"
                        />
                    )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {onAlwaysOpenChange ? (
                        <div className="flex items-center gap-2">
                            <PanelSwitch
                                checked={alwaysOpen ?? false}
                                onChange={onAlwaysOpenChange}
                                ariaLabel="Disponibilidad 24/7"
                                size="sm"
                            />
                            <span className="text-sm text-fg-secondary">{BUSINESS_SCHEDULE_ALWAYS_OPEN_LABEL}</span>
                        </div>
                    ) : null}
                    {showLoadTypicalSchedule && onLoadTypicalSchedule ? (
                        <PanelButton
                            variant="secondary"
                            size="sm"
                            onClick={onLoadTypicalSchedule}
                            disabled={loadingTypicalSchedule}
                        >
                            {loadingTypicalSchedule ? <IconLoader2 size={14} className="animate-spin" /> : null}
                            Cargar horario típico
                        </PanelButton>
                    ) : null}
                    {toolbarActions}
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
                <section className="space-y-6 lg:col-span-3">
                    <div className="space-y-2">
                        {days.map((day) => (
                            <CompactDayRow
                                key={day.key}
                                day={day}
                                disabled={globalDisabled}
                                onToggle={() => onDayToggle(day.key)}
                                onStartTimeChange={(value) => onStartTimeChange(day.key, value)}
                                onEndTimeChange={(value) => onEndTimeChange(day.key, value)}
                                error={ruleErrors?.[day.key] ?? null}
                            />
                        ))}
                    </div>

                    <div className="space-y-4 border-t border-border pt-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <PanelBlockHeader
                                title={BUSINESS_WEEKLY_BREAK_SECTION.title}
                                description={
                                    breakDisabled
                                        ? BUSINESS_WEEKLY_BREAK_SECTION.disabledHint
                                        : BUSINESS_WEEKLY_BREAK_SECTION.description
                                }
                                className="mb-0 flex-1"
                            />
                            <div className="flex shrink-0 items-center gap-2">
                                <PanelSwitch
                                    checked={weeklyBreak.enabled}
                                    onChange={weeklyBreak.onEnabledChange}
                                    disabled={breakDisabled}
                                    size="sm"
                                    ariaLabel="Activar colación semanal"
                                />
                                <span className="text-sm text-fg-secondary">Activar</span>
                            </div>
                        </div>
                        {weeklyBreak.enabled && !breakDisabled ? (
                            <div className="grid max-w-md grid-cols-2 gap-3 sm:max-w-lg">
                                <PanelField label="Inicio">
                                    <BusinessScheduleTimeSelect
                                        value={weeklyBreak.startTime}
                                        onChange={weeklyBreak.onStartTimeChange}
                                        aria-label="Inicio colación"
                                    />
                                </PanelField>
                                <PanelField label="Fin">
                                    <BusinessScheduleTimeSelect
                                        value={weeklyBreak.endTime}
                                        onChange={weeklyBreak.onEndTimeChange}
                                        aria-label="Fin colación"
                                    />
                                </PanelField>
                            </div>
                        ) : null}
                        {weeklyBreak.error ? (
                            <p className="text-xs text-(--color-error,#dc2626)">{weeklyBreak.error}</p>
                        ) : null}
                    </div>

                    {onScheduleNoteChange ? (
                        <div className="border-t border-border pt-5">
                            <PanelField label={BUSINESS_SCHEDULE_NOTE_FIELD.label}>
                                <div className="relative">
                                    <IconClock
                                        size={14}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                                    />
                                    <input
                                        className="form-input pl-9"
                                        value={scheduleNote}
                                        onChange={(event) => onScheduleNoteChange(event.target.value)}
                                        placeholder={BUSINESS_SCHEDULE_NOTE_FIELD.placeholder}
                                        disabled={globalDisabled}
                                    />
                                </div>
                            </PanelField>
                        </div>
                    ) : null}
                </section>

                <section className="lg:col-span-2">
                    <BusinessBlockedDaysSection
                        title={BUSINESS_BLOCKED_DAYS_SECTION.title}
                        description={blockedDescription ?? BUSINESS_BLOCKED_DAYS_SECTION.description}
                        slots={blockedSlots}
                        showForm={showBlockedForm}
                        onShowFormChange={onShowBlockedFormChange}
                        form={blockedForm}
                        onFormFieldChange={onBlockedFormFieldChange}
                        onSubmit={onBlockedSubmit}
                        onCancel={onBlockedCancel}
                        onDeleteSlot={onDeleteBlockedSlot}
                        deletingSlotId={deletingBlockedSlotId}
                    />
                </section>
            </div>

            <PanelSectionSaveFooter
                saving={batchSave.saving}
                saved={batchSave.status === 'Guardado'}
                saveError={batchSave.status && batchSave.status !== 'Guardado' ? batchSave.status : null}
                disabled={!batchSave.dirty}
                onSave={batchSave.onSave}
                saveLabel={batchSave.label ?? panelSectionSaveLabel('horarios')}
                savedMessage="Horario guardado."
            />
        </PanelCard>
    );
}
