'use client';

import {
    MAX_BOOKING_WINDOW_DAYS,
    MAX_CANCELLATION_HOURS,
    MAX_RESPONSE_SLA_HOURS,
    MIN_BOOKING_WINDOW_DAYS,
    MIN_CANCELLATION_HOURS,
    MIN_RESPONSE_SLA_HOURS,
} from '@simple/utils';
import { PanelBlockHeader, PanelSwitch } from './panel-primitives.js';
import { PanelCard } from './panel-card.js';
import { PanelField } from './panel-display.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import {
    BUSINESS_BOOKING_CANCELLATION_FIELD,
    BUSINESS_BOOKING_RECURRENT_FIELD,
    BUSINESS_BOOKING_RESPONSE_SLA_FIELD,
    BUSINESS_BOOKING_RULES_SECTION,
    BUSINESS_BOOKING_WINDOW_FIELD,
} from './business-copy.js';

export type BusinessBookingRulesVariant = 'agenda' | 'serenatas';

export type BusinessBookingRulesFieldsProps = {
    variant: BusinessBookingRulesVariant;
    bookingWindowDays: number;
    cancellationHours: number;
    allowsRecurrentBooking?: boolean;
    recurrentDescription?: string;
    slaHours?: number;
    showQuickPresets?: boolean;
    onBookingWindowDaysChange: (value: number) => void;
    onCancellationHoursChange: (value: number) => void;
    onAllowsRecurrentBookingChange?: (value: boolean) => void;
    onSlaHoursChange?: (value: number) => void;
};

const WINDOW_DAY_PRESETS = [7, 15, 30, 60] as const;
const CANCELLATION_HOUR_PRESETS = [
    { value: 0, label: 'Sin mínimo' },
    { value: 12, label: '12 h' },
    { value: 24, label: '24 h' },
    { value: 48, label: '48 h' },
] as const;

export function BusinessBookingRulesFields({
    variant,
    bookingWindowDays,
    cancellationHours,
    allowsRecurrentBooking = true,
    recurrentDescription,
    slaHours = 24,
    showQuickPresets = false,
    onBookingWindowDaysChange,
    onCancellationHoursChange,
    onAllowsRecurrentBookingChange,
    onSlaHoursChange,
}: BusinessBookingRulesFieldsProps) {
    const showRecurrent = variant === 'agenda' && onAllowsRecurrentBookingChange;
    const showResponseSla = variant === 'serenatas' && onSlaHoursChange;

    return (
        <PanelCard size="lg" className="space-y-4">
            <PanelBlockHeader
                title={BUSINESS_BOOKING_RULES_SECTION.title}
                description={BUSINESS_BOOKING_RULES_SECTION.description}
                className="mb-0"
            />

            <div className={`grid gap-4 ${showResponseSla ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <PanelField
                    label={BUSINESS_BOOKING_WINDOW_FIELD.label}
                    hint={BUSINESS_BOOKING_WINDOW_FIELD.hint}
                >
                    <div className="space-y-2">
                        {showQuickPresets ? (
                            <div className="flex flex-wrap gap-1.5">
                                {WINDOW_DAY_PRESETS.map((days) => {
                                    const active = bookingWindowDays === days;
                                    return (
                                        <button
                                            key={days}
                                            type="button"
                                            onClick={() => onBookingWindowDaysChange(days)}
                                            className={[
                                                'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                                                active
                                                    ? 'border-(--signal,var(--accent)) bg-(--accent-soft)/50 text-accent-ink'
                                                    : 'border-border bg-bg-subtle text-fg-secondary hover:text-fg',
                                            ].join(' ')}
                                        >
                                            {days} días
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                        <input
                            type="number"
                            min={MIN_BOOKING_WINDOW_DAYS}
                            max={MAX_BOOKING_WINDOW_DAYS}
                            value={bookingWindowDays}
                            onChange={(event) => onBookingWindowDaysChange(Number(event.target.value))}
                            className={PANEL_INPUT_CLASS}
                        />
                    </div>
                </PanelField>

                <PanelField
                    label={BUSINESS_BOOKING_CANCELLATION_FIELD.label}
                    hint={BUSINESS_BOOKING_CANCELLATION_FIELD.hint}
                >
                    <div className="space-y-2">
                        {showQuickPresets ? (
                            <div className="flex flex-wrap gap-1.5">
                                {CANCELLATION_HOUR_PRESETS.map((preset) => {
                                    const active = cancellationHours === preset.value;
                                    return (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => onCancellationHoursChange(preset.value)}
                                            className={[
                                                'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                                                active
                                                    ? 'border-(--signal,var(--accent)) bg-(--accent-soft)/50 text-accent-ink'
                                                    : 'border-border bg-bg-subtle text-fg-secondary hover:text-fg',
                                            ].join(' ')}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                        <input
                            type="number"
                            min={MIN_CANCELLATION_HOURS}
                            max={MAX_CANCELLATION_HOURS}
                            value={cancellationHours}
                            onChange={(event) => onCancellationHoursChange(Number(event.target.value))}
                            className={PANEL_INPUT_CLASS}
                        />
                    </div>
                </PanelField>

                {showResponseSla ? (
                    <PanelField
                        label={BUSINESS_BOOKING_RESPONSE_SLA_FIELD.label}
                        hint={BUSINESS_BOOKING_RESPONSE_SLA_FIELD.hint}
                    >
                        <input
                            type="number"
                            min={MIN_RESPONSE_SLA_HOURS}
                            max={MAX_RESPONSE_SLA_HOURS}
                            value={slaHours}
                            onChange={(event) => onSlaHoursChange(Number(event.target.value))}
                            className={PANEL_INPUT_CLASS}
                        />
                    </PanelField>
                ) : null}
            </div>

            {showRecurrent ? (
                <div className="flex items-start gap-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg">{BUSINESS_BOOKING_RECURRENT_FIELD.title}</p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                            {recurrentDescription ?? BUSINESS_BOOKING_RECURRENT_FIELD.description}
                        </p>
                    </div>
                    <PanelSwitch
                        checked={allowsRecurrentBooking}
                        onChange={onAllowsRecurrentBookingChange}
                        size="sm"
                        ariaLabel={
                            allowsRecurrentBooking
                                ? 'Desactivar reservas recurrentes'
                                : 'Activar reservas recurrentes'
                        }
                    />
                </div>
            ) : null}
        </PanelCard>
    );
}
