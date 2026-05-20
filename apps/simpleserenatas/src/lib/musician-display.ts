import type { MusicianPublicProfile } from '@/lib/serenatas-api';
import { musicianLocationLabel } from '@/lib/musician-location-label';
import { resolveAvatarDisplayUrl } from '@/lib/resolve-avatar-url';

export function splitMusicianName(name: string | null | undefined): { firstName: string; lastName: string } {
    const trimmed = name?.trim() ?? '';
    if (!trimmed) return { firstName: 'Músico', lastName: '' };
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function primaryInstrument(profile: {
    instrument?: string | null;
    instruments?: string[] | null;
}): string {
    if (profile.instrument?.trim()) return profile.instrument.trim();
    const first = profile.instruments?.find((item) => item.trim());
    return first?.trim() ?? 'Instrumento por confirmar';
}

export function musicianLocationShort(profile: Pick<MusicianPublicProfile, 'comuna' | 'region' | 'workZones'>): string {
    if (profile.comuna?.trim()) return profile.comuna.trim();
    if (profile.region?.trim()) return profile.region.trim();
    return musicianLocationLabel(profile as MusicianPublicProfile);
}

export function musicianInitials(name: string | null | undefined): string {
    const { firstName, lastName } = splitMusicianName(name);
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.trim().charAt(0).toUpperCase();
    return `${first}${last}`.trim() || 'M';
}

export function toMusicianPublicProfile(input: {
    id: string;
    musicianId?: string;
    name?: string | null;
    musicianName?: string | null;
    avatarUrl?: string | null;
    instrument?: string | null;
    instruments?: string[] | null;
    bio?: string | null;
    comuna?: string | null;
    region?: string | null;
    workZones?: string[] | null;
    experienceYears?: number | null;
    availableNow?: boolean | null;
    isAvailable?: boolean | null;
    userId?: string;
}): MusicianPublicProfile {
    return {
        id: input.musicianId ?? input.id,
        userId: input.userId ?? '',
        name: input.name ?? input.musicianName ?? 'Músico',
        avatarUrl: resolveAvatarDisplayUrl(input.avatarUrl ?? null),
        instrument: input.instrument ?? null,
        instruments: input.instruments ?? (input.instrument ? [input.instrument] : []),
        bio: input.bio ?? null,
        comuna: input.comuna ?? null,
        region: input.region ?? null,
        lat: null,
        lng: null,
        workZones: input.workZones ?? [],
        experienceYears: input.experienceYears ?? 0,
        availableNow: Boolean(input.availableNow),
        isAvailable: input.isAvailable ?? true,
    };
}
