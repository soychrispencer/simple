'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconClock } from '@tabler/icons-react';
import type { StructuredLocation } from '@simple/types';
import {
    fetchAccountResidence,
    formatStructuredLocationLabel,
    inferTimezoneFromStructuredLocation,
    normalizeStructuredLocation,
    timezoneOptionLabel,
    timezoneShortLabel,
    updateAccountResidence,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelNotice } from './panel-primitives.js';
import { StructuredLocationFields } from './structured-location-fields.js';
import { accountResidenceDescription } from './account-copy.js';
import type { PanelAccountPersonalDataUser } from './account-personal-data-section.js';

function residenceFromUser(user?: PanelAccountPersonalDataUser | null): StructuredLocation | null {
    if (!user) return null;
    if (user.residence) return normalizeStructuredLocation(user.residence);
    if (
        user.residenceCountryCode
        || user.residenceRegionId
        || user.residenceRegionName
        || user.residenceLocalityId
        || user.residenceLocalityName
    ) {
        return normalizeStructuredLocation({
            countryCode: user.residenceCountryCode ?? 'CL',
            regionId: user.residenceRegionId ?? null,
            regionName: user.residenceRegionName ?? null,
            localityId: user.residenceLocalityId ?? null,
            localityName: user.residenceLocalityName ?? null,
        });
    }
    return null;
}

export type PanelAccountResidenceSectionProps = {
    user?: PanelAccountPersonalDataUser | null;
    appLabel?: string;
    onSaved?: () => Promise<unknown> | unknown;
    onUnauthorized?: () => void;
};

export function PanelAccountResidenceSection({
    user,
    appLabel = 'Simple',
    onSaved,
    onUnauthorized,
}: PanelAccountResidenceSectionProps) {
    const [residence, setResidence] = useState<StructuredLocation>(() => (
        residenceFromUser(user) ?? normalizeStructuredLocation({ countryCode: 'CL' })
    ));
    const [savedResidence, setSavedResidence] = useState<StructuredLocation>(() => (
        residenceFromUser(user) ?? normalizeStructuredLocation({ countryCode: 'CL' })
    ));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const nextResidence = residenceFromUser(user);
        if (nextResidence) {
            setResidence(nextResidence);
            setSavedResidence(nextResidence);
        }
    }, [
        user?.residence,
        user?.residenceCountryCode,
        user?.residenceRegionId,
        user?.residenceRegionName,
        user?.residenceLocalityId,
        user?.residenceLocalityName,
    ]);

    useEffect(() => {
        if (residenceFromUser(user)) return;
        let cancelled = false;
        void (async () => {
            setLoading(true);
            const data = await fetchAccountResidence();
            if (cancelled) return;
            setResidence(data.residence);
            setSavedResidence(data.residence);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [user]);

    const residenceDirty = useMemo(
        () => JSON.stringify(residence) !== JSON.stringify(savedResidence),
        [residence, savedResidence],
    );

    const displayTimezone = useMemo(
        () => inferTimezoneFromStructuredLocation(residence),
        [residence],
    );

    const saveResidence = async () => {
        setSaving(true);
        setNotice(null);
        const result = await updateAccountResidence(residence);
        setSaving(false);
        if (!result.ok) {
            if (result.unauthorized) onUnauthorized?.();
            setNotice({ tone: 'error', text: result.error ?? 'No pudimos guardar tu residencia.' });
            return;
        }
        const nextResidence = result.residence ?? residence;
        setResidence(nextResidence);
        setSavedResidence(nextResidence);
        await onSaved?.();
        setNotice({ tone: 'success', text: 'Residencia actualizada.' });
    };

    if (loading) {
        return <p className="text-sm text-[var(--fg-muted)]">Cargando residencia…</p>;
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="text-xs leading-relaxed text-[var(--fg-muted)]">{accountResidenceDescription(appLabel)}</p>
            <StructuredLocationFields
                value={residence}
                onChange={setResidence}
                disabled={saving}
            />
            <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2.5 text-xs text-[var(--fg-muted)]">
                <IconClock size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden />
                <span>
                    Zona horaria del panel:{' '}
                    <strong className="text-[var(--fg)]">
                        {timezoneOptionLabel(displayTimezone)} ({timezoneShortLabel(displayTimezone)})
                    </strong>
                    {' · '}
                    {formatStructuredLocationLabel(residence)}
                </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <PanelButton
                    variant="accent"
                    onClick={() => void saveResidence()}
                    disabled={saving || !residenceDirty}
                >
                    {saving ? 'Guardando...' : 'Guardar residencia'}
                </PanelButton>
                {notice ? (
                    <PanelNotice tone={notice.tone} className="sm:max-w-md">
                        {notice.text}
                    </PanelNotice>
                ) : null}
            </div>
        </div>
    );
}
