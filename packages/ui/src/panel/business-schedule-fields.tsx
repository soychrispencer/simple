'use client';

import type { ReactNode } from 'react';
import {
    BUSINESS_SCHEDULE_TIME_OPTIONS,
    formatBusinessScheduleRange,
    scheduleCrossesMidnight,
} from '@simple/utils';
import { PanelField } from './panel-display.js';
import { PanelSelect } from './panel-select.js';

export type BusinessScheduleTimeSelectProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    allowEmpty?: boolean;
    emptyLabel?: string;
    'aria-label'?: string;
};

export function BusinessScheduleTimeSelect({
    value,
    onChange,
    disabled,
    allowEmpty = false,
    emptyLabel = '—',
    'aria-label': ariaLabel,
}: BusinessScheduleTimeSelectProps) {
    return (
        <PanelSelect
            value={value}
            disabled={disabled}
            aria-label={ariaLabel}
            className="min-w-[5.5rem] [&>span>span:last-child]:overflow-visible [&>span>span:last-child]:whitespace-nowrap"
            onChange={(event) => onChange(event.target.value)}
        >
            {allowEmpty ? <option value="">{emptyLabel}</option> : null}
            {BUSINESS_SCHEDULE_TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </PanelSelect>
    );
}

export function BusinessScheduleOvernightHint({
    startTime,
    endTime,
}: {
    startTime: string;
    endTime: string;
}) {
    if (!startTime || !endTime || !scheduleCrossesMidnight(startTime, endTime)) return null;
    return (
        <p className="mt-1.5 text-xs leading-5" style={{ color: 'var(--fg-muted)' }}>
            {formatBusinessScheduleRange(startTime, endTime)}. El cierre es al día siguiente (turno nocturno).
        </p>
    );
}

export type BusinessScheduleRangeFieldsProps = {
    startTime: string;
    endTime: string;
    onStartTimeChange: (value: string) => void;
    onEndTimeChange: (value: string) => void;
    disabled?: boolean;
    error?: string | null;
    footer?: ReactNode;
    /** @deprecated La colación va en la sección de colación de `BusinessSchedulePanel`. */
    showBreak?: boolean;
    breakStart?: string;
    breakEnd?: string;
    onBreakStartChange?: (value: string) => void;
    onBreakEndChange?: (value: string) => void;
};

/** Campos Inicio / Fin con selects unificados. */
export function BusinessScheduleRangeFields({
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
    disabled,
    error,
    footer,
}: BusinessScheduleRangeFieldsProps) {
    return (
        <div className="space-y-2">
            <div className="grid max-w-md grid-cols-2 gap-3 sm:max-w-lg">
                <PanelField label="Inicio">
                    <BusinessScheduleTimeSelect
                        value={startTime}
                        onChange={onStartTimeChange}
                        disabled={disabled}
                        aria-label="Hora de inicio"
                    />
                </PanelField>
                <PanelField label="Fin">
                    <BusinessScheduleTimeSelect
                        value={endTime}
                        onChange={onEndTimeChange}
                        disabled={disabled}
                        aria-label="Hora de fin"
                    />
                </PanelField>
            </div>
            <BusinessScheduleOvernightHint startTime={startTime} endTime={endTime} />
            {error ? <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p> : null}
            {footer}
        </div>
    );
}
