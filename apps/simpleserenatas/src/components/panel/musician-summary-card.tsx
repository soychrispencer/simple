'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { IconMapPin, IconUser } from '@tabler/icons-react';
import type { MusicianPublicProfile } from '@/lib/serenatas-api';
import {
    musicianLocationShort,
    primaryInstrument,
    splitMusicianName,
} from '@/lib/musician-display';
import { MusicianInstrumentIcon } from '@/lib/musician-instrument-icon';
import { resolveAvatarDisplayUrl } from '@/lib/resolve-avatar-url';

function MusicianAvatarPlaceholder({ sizeClass, iconSize }: { sizeClass: string; iconSize: number }) {
    return (
        <div
            className={`${sizeClass} flex shrink-0 items-center justify-center rounded-2xl bg-bg-subtle text-fg-muted ring-1 ring-border`}
            aria-hidden
        >
            <IconUser size={iconSize} stroke={1.75} />
        </div>
    );
}

export function MusicianAvatar({
    name,
    avatarUrl,
    size = 'md',
}: {
    name: string;
    avatarUrl?: string | null;
    size?: 'sm' | 'md' | 'lg';
}) {
    const sizeClass = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
    const iconSize = size === 'sm' ? 20 : size === 'lg' ? 32 : 24;
    const resolvedUrl = resolveAvatarDisplayUrl(avatarUrl);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [resolvedUrl]);

    if (!resolvedUrl || imageFailed) {
        return <MusicianAvatarPlaceholder sizeClass={sizeClass} iconSize={iconSize} />;
    }

    return (
        <img
            src={resolvedUrl}
            alt={name ? `Foto de ${name}` : ''}
            className={`${sizeClass} shrink-0 rounded-2xl object-cover ring-1 ring-border`}
            onError={() => setImageFailed(true)}
        />
    );
}

export function MusicianSummaryCard({
    profile,
    musicianId,
    onOpenProfile,
    trailing,
    statusBadge,
    className = '',
    hideMeta = false,
    draggable = false,
    isDragging = false,
    onDragStart,
    onDragEnd,
}: {
    profile: Pick<MusicianPublicProfile, 'name' | 'avatarUrl' | 'instrument' | 'instruments' | 'comuna' | 'region' | 'workZones'>;
    musicianId?: string;
    onOpenProfile?: () => void;
    trailing?: ReactNode;
    /** Etiqueta de estado junto al nombre (un solo tag). */
    statusBadge?: ReactNode;
    className?: string;
    /** Oculta instrumento y ubicación (p. ej. cupo de grupo que ya muestra el instrumento). */
    hideMeta?: boolean;
    draggable?: boolean;
    isDragging?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}) {
    const displayName = profile.name?.trim() || splitMusicianName(profile.name).firstName;
    const instrument = primaryInstrument(profile);
    const location = musicianLocationShort(profile);

    return (
        <div
            draggable={draggable}
            onDragStart={(event) => {
                if (!draggable) return;
                if (musicianId) event.dataTransfer.setData('text/plain', musicianId);
                onDragStart?.();
                event.dataTransfer.effectAllowed = 'copy';
            }}
            onDragEnd={onDragEnd}
            className={[
                'rounded-xl border border-border bg-bg-subtle p-3 transition-colors',
                draggable ? 'cursor-grab active:cursor-grabbing' : '',
                isDragging ? 'border-accent bg-accent-soft opacity-80' : '',
                onOpenProfile ? 'hover:border-accent/40' : '',
                className,
            ].filter(Boolean).join(' ')}
        >
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    className="shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={onOpenProfile}
                    disabled={!onOpenProfile}
                    aria-label={onOpenProfile ? `Ver ficha de ${profile.name}` : undefined}
                >
                    <MusicianAvatar name={profile.name} avatarUrl={profile.avatarUrl} />
                </button>
                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                        onClick={onOpenProfile}
                        disabled={!onOpenProfile}
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <p className="min-w-0 truncate text-sm font-semibold leading-tight text-fg">{displayName}</p>
                            {statusBadge ? <span className="shrink-0">{statusBadge}</span> : null}
                        </div>
                        {hideMeta ? null : (
                            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-fg-muted">
                                <span className="inline-flex items-center gap-1">
                                    <MusicianInstrumentIcon instrument={instrument} />
                                    <span className="truncate">{instrument}</span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <IconMapPin size={13} className="shrink-0" aria-hidden />
                                    <span className="truncate">{location}</span>
                                </span>
                            </div>
                        )}
                    </button>
                </div>
                {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
            </div>
        </div>
    );
}
