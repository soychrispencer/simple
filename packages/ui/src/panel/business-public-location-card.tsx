'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { StructuredLocation } from '@simple/types';
import {
    formatAddressBookEntryFullAddress,
    inferTimezoneFromStructuredLocation,
    normalizeStructuredLocation,
    normalizeTimezone,
    timezoneOptionLabel,
    timezoneShortLabel,
} from '@simple/utils';
import type { AddressBookEntry } from '@simple/types';
import { IconClock } from '@tabler/icons-react';
import { PanelBlockHeader } from './panel-primitives.js';
import { PanelCard } from './panel-card.js';
import { PanelField } from './panel-display.js';
import { PanelSwitch } from './panel-primitives.js';
import { StructuredLocationFields } from './structured-location-fields.js';
import {
    BUSINESS_OPERATING_TIMEZONE_HINT,
    BUSINESS_PUBLIC_LOCATION_SECTION,
    BUSINESS_PUBLIC_PRIMARY_ADDRESS_FIELD,
    businessOperatingTimezoneLabel,
    type BusinessTimezoneContext,
} from './business-copy.js';

export type DefaultBusinessAddress = {
    id: string;
    label: string;
};

export function resolveDefaultBusinessAddress(
    entries: Array<Pick<AddressBookEntry, 'id' | 'isDefault' | 'addressLine1' | 'addressLine2' | 'neighborhood' | 'communeName' | 'regionName'>>,
): DefaultBusinessAddress | null {
    const entry = entries.find((item) => item.isDefault);
    if (!entry) return null;
    return {
        id: entry.id,
        label: formatAddressBookEntryFullAddress(entry),
    };
}

export type BusinessPublicLocationCardProps = {
    section?: typeof BUSINESS_PUBLIC_LOCATION_SECTION;
    primaryAddressField?: typeof BUSINESS_PUBLIC_PRIMARY_ADDRESS_FIELD;
    addressesHref: string;
    defaultAddress: DefaultBusinessAddress | null;
    showPrimaryAddress: boolean;
    onShowPrimaryAddressChange: (show: boolean) => void | Promise<void>;
    structuredLocation: StructuredLocation;
    onStructuredLocationChange: (next: StructuredLocation) => void;
    disabled?: boolean;
    /** TZ persistida en el negocio; si falta, se infiere de región/comuna (default Chile). */
    timezone?: string;
    timezoneContext: BusinessTimezoneContext;
    regionLabel?: string;
    localityLabel?: string;
    embedded?: boolean;
};

export function BusinessPublicLocationCard({
    section = BUSINESS_PUBLIC_LOCATION_SECTION,
    primaryAddressField = BUSINESS_PUBLIC_PRIMARY_ADDRESS_FIELD,
    addressesHref,
    defaultAddress,
    showPrimaryAddress,
    onShowPrimaryAddressChange,
    structuredLocation,
    onStructuredLocationChange,
    disabled = false,
    timezone,
    timezoneContext,
    regionLabel,
    localityLabel,
    embedded = false,
}: BusinessPublicLocationCardProps) {
    const operatingTimezone = useMemo(
        () => normalizeTimezone(timezone ?? inferTimezoneFromStructuredLocation(structuredLocation)),
        [timezone, structuredLocation],
    );

    const body = (
        <>
            {!embedded ? (
                <PanelBlockHeader
                    title={section.title}
                    description={section.description}
                    className="mb-0"
                />
            ) : null}

            <PanelField label={primaryAddressField.label}>
                {defaultAddress ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
                        <p className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--fg-secondary)' }}>
                            {defaultAddress.label}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                                {showPrimaryAddress ? 'Ocultar' : 'Mostrar'}
                            </span>
                            <PanelSwitch
                                checked={showPrimaryAddress}
                                onChange={onShowPrimaryAddressChange}
                                disabled={disabled}
                                size="sm"
                                ariaLabel={`${showPrimaryAddress ? 'Ocultar' : 'Mostrar'} ${primaryAddressField.label.toLowerCase()}`}
                            />
                        </div>
                    </div>
                ) : (
                    <p className="text-xs leading-5" style={{ color: 'var(--fg-muted)' }}>
                        {primaryAddressField.missingDefaultHint}{' '}
                        <Link href={addressesHref} className="font-medium text-accent hover:underline">
                            {primaryAddressField.missingDefaultHintLink}
                        </Link>
                        .
                    </p>
                )}
            </PanelField>

            <StructuredLocationFields
                value={structuredLocation}
                onChange={(next) => onStructuredLocationChange(normalizeStructuredLocation(next))}
                disabled={disabled}
                regionLabel={regionLabel}
                localityLabel={localityLabel}
                showTimezonePreview={false}
            />

            <div className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                <IconClock size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                <span>
                    {businessOperatingTimezoneLabel(timezoneContext)}:{' '}
                    <strong className="text-fg">
                        {timezoneOptionLabel(operatingTimezone)} ({timezoneShortLabel(operatingTimezone)})
                    </strong>
                    {' · '}
                    {BUSINESS_OPERATING_TIMEZONE_HINT}
                </span>
            </div>
        </>
    );

    if (embedded) {
        return <div className="space-y-5">{body}</div>;
    }

    return (
        <PanelCard size="lg" className="space-y-5">
            {body}
        </PanelCard>
    );
}
