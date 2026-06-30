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
    onBookingWindowDaysChange: (value: number) => void;
    onCancellationHoursChange: (value: number) => void;
    onAllowsRecurrentBookingChange?: (value: boolean) => void;
    onSlaHoursChange?: (value: number) => void;
};

export function BusinessBookingRulesFields({
    variant,
    bookingWindowDays,
    cancellationHours,
    allowsRecurrentBooking = true,
    recurrentDescription,
    slaHours = 24,
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
                    <input
                        type="number"
                        min={MIN_BOOKING_WINDOW_DAYS}
                        max={MAX_BOOKING_WINDOW_DAYS}
                        value={bookingWindowDays}
                        onChange={(event) => onBookingWindowDaysChange(Number(event.target.value))}
                        className={PANEL_INPUT_CLASS}
                    />
                </PanelField>

                <PanelField
                    label={BUSINESS_BOOKING_CANCELLATION_FIELD.label}
                    hint={BUSINESS_BOOKING_CANCELLATION_FIELD.hint}
                >
                    <input
                        type="number"
                        min={MIN_CANCELLATION_HOURS}
                        max={MAX_CANCELLATION_HOURS}
                        value={cancellationHours}
                        onChange={(event) => onCancellationHoursChange(Number(event.target.value))}
                        className={PANEL_INPUT_CLASS}
                    />
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
