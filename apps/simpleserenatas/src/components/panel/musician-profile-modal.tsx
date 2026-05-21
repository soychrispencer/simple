'use client';

import { useEffect, useState } from 'react';
import { IconLoader2, IconMapPin, IconX } from '@tabler/icons-react';
import { PanelCard, PanelField, PanelStatusBadge } from '@simple/ui';
import type { MusicianPublicProfile } from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';
import {
    musicianLocationShort,
    primaryInstrument,
    splitMusicianName,
    toMusicianPublicProfile,
} from '@/lib/musician-display';
import { MusicianInstrumentIcon } from '@/lib/musician-instrument-icon';
import { MusicianAvatar } from '@/components/panel/musician-summary-card';
import { MusicianAvailabilityBadge } from '@/components/panel/musician-availability-toggle';
import { PanelSheet } from './panel-sheet';

export function MusicianProfileModal({
    profile: initialProfile,
    musicianId,
    onClose,
}: {
    profile?: MusicianPublicProfile | null;
    musicianId?: string | null;
    onClose: () => void;
}) {
    const [profile, setProfile] = useState<MusicianPublicProfile | null>(initialProfile ?? null);
    const [loading, setLoading] = useState(Boolean(musicianId && !initialProfile));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialProfile) {
            setProfile(initialProfile);
            setLoading(false);
            setError(null);
            return;
        }
        if (!musicianId) {
            setProfile(null);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        void serenatasApi.musicianProfile(musicianId).then((response) => {
            if (cancelled) return;
            if (!response.ok || !response.item) {
                setError(response.error ?? 'No pudimos cargar la ficha del músico.');
                setProfile(null);
            } else {
                setProfile(toMusicianPublicProfile(response.item));
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [initialProfile, musicianId]);

    const displayName = profile?.name?.trim() || splitMusicianName(profile?.name).firstName;
    const instrument = profile ? primaryInstrument(profile) : '';

    return (
        <PanelSheet onClose={onClose} ariaLabel="Ficha del músico" maxWidthClass="sm:max-w-lg">
            <PanelCard size="lg">
                <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg font-semibold text-fg">Ficha del músico</h2>
                    <button type="button" className="rounded-xl bg-bg-subtle p-2 text-fg-muted" onClick={onClose}>
                        <IconX size={18} />
                    </button>
                </div>

                {loading ? (
                    <p className="mt-6 flex items-center gap-2 text-sm text-fg-muted">
                        <IconLoader2 size={16} className="animate-spin" />
                        Cargando ficha…
                    </p>
                ) : error ? (
                    <p className="mt-6 text-sm text-fg-muted">{error}</p>
                ) : profile ? (
                    <div className="mt-6 grid gap-5">
                        <div className="flex items-start gap-4">
                            <MusicianAvatar name={profile.name} avatarUrl={profile.avatarUrl} size="lg" />
                            <div className="min-w-0">
                                <p className="text-xl font-semibold text-fg">{displayName}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <MusicianAvailabilityBadge availableNow={profile.availableNow} />
                                    {profile.isAvailable ? (
                                        <PanelStatusBadge tone="success" label="Disponible para serenatas" size="xs" />
                                    ) : (
                                        <PanelStatusBadge tone="neutral" label="No disponible" size="xs" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <PanelField label="Instrumento principal">
                                <p className="inline-flex items-center gap-2 text-sm text-fg">
                                    <MusicianInstrumentIcon instrument={instrument} size={16} />
                                    {instrument}
                                </p>
                            </PanelField>
                            <PanelField label="Comuna">
                                <p className="inline-flex items-center gap-1.5 text-sm text-fg">
                                    <IconMapPin size={15} className="text-fg-muted" aria-hidden />
                                    {musicianLocationShort(profile)}
                                </p>
                            </PanelField>
                        </div>

                        {profile.instruments.length > 1 ? (
                            <PanelField label="Instrumentos">
                                <div className="flex flex-wrap gap-2">
                                    {profile.instruments.map((item) => (
                                        <span
                                            key={item}
                                            className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-xs text-fg"
                                        >
                                            <MusicianInstrumentIcon instrument={item} size={12} />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </PanelField>
                        ) : null}

                        {profile.experienceYears > 0 ? (
                            <PanelField label="Experiencia">
                                <p className="text-sm text-fg">
                                    {profile.experienceYears} año{profile.experienceYears === 1 ? '' : 's'}
                                </p>
                            </PanelField>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                            {profile.hasInstrument ? (
                                <PanelStatusBadge tone="success" label="Instrumento propio" size="sm" />
                            ) : null}
                            {profile.hasMariachiAttire ? (
                                <PanelStatusBadge tone="neutral" label="Tenida de mariachi" size="sm" />
                            ) : null}
                        </div>

                        {profile.bio?.trim() ? (
                            <PanelField label="Presentación">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{profile.bio.trim()}</p>
                            </PanelField>
                        ) : null}
                    </div>
                ) : null}
            </PanelCard>
        </PanelSheet>
    );
}
