'use client';

import { IconLoader2, IconSparkles } from '@tabler/icons-react';
import { PanelBlockHeader, PanelSwitch } from './panel-primitives.js';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelField } from './panel-display.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import {
    BUSINESS_BOOKING_POLICIES_FIELD,
    BUSINESS_BOOKING_POLICIES_SECTION,
} from './business-copy.js';

export type BusinessBookingPoliciesSectionProps = {
    value: string;
    onChange: (value: string) => void;
    clientLabel: string;
    generating?: boolean;
    onGenerate?: () => void | Promise<void>;
    disabled?: boolean;
};

export function BusinessBookingPoliciesSection({
    value,
    onChange,
    clientLabel,
    generating = false,
    onGenerate,
    disabled = false,
}: BusinessBookingPoliciesSectionProps) {
    return (
        <PanelCard size="lg" className="space-y-4">
            <PanelBlockHeader
                title={BUSINESS_BOOKING_POLICIES_SECTION.title}
                description={BUSINESS_BOOKING_POLICIES_SECTION.description(clientLabel)}
                className="mb-0"
                actions={onGenerate ? (
                    <PanelButton
                        variant="secondary"
                        size="sm"
                        onClick={() => void onGenerate()}
                        disabled={generating || disabled}
                    >
                        {generating
                            ? <IconLoader2 size={14} className="animate-spin" />
                            : <IconSparkles size={14} />}
                        {generating ? 'Generando…' : 'Generar con IA'}
                    </PanelButton>
                ) : undefined}
            />
            <PanelField
                label={BUSINESS_BOOKING_POLICIES_FIELD.label}
                hint={BUSINESS_BOOKING_POLICIES_FIELD.hint}
            >
                <textarea
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={BUSINESS_BOOKING_POLICIES_FIELD.placeholder(clientLabel)}
                    rows={8}
                    disabled={disabled}
                    className={`${PANEL_INPUT_CLASS} form-textarea min-h-[12rem] leading-relaxed`}
                />
            </PanelField>
        </PanelCard>
    );
}
