import { API_BASE } from '@simple/config';
import type { StructuredLocation } from '@simple/types';
import { normalizeStructuredLocation } from './structured-location.js';
import { inferTimezoneFromStructuredLocation, timezoneShortLabel } from './location-timezone.js';
import { structuredLocationSchema } from '@simple/types';

export type AccountResidenceUser = {
    id: string;
    timezone?: string;
    residence?: StructuredLocation | null;
};

export function parseResidenceFromUser(user: Record<string, unknown> | null | undefined): StructuredLocation {
    if (!user) return normalizeStructuredLocation({ countryCode: 'CL' });
    const nested = user.residence;
    if (nested && typeof nested === 'object') {
        return normalizeStructuredLocation(structuredLocationSchema.partial().parse(nested));
    }
    return normalizeStructuredLocation({
        countryCode: typeof user.residenceCountryCode === 'string' ? user.residenceCountryCode : 'CL',
        regionId: typeof user.residenceRegionId === 'string' ? user.residenceRegionId : null,
        regionName: typeof user.residenceRegionName === 'string' ? user.residenceRegionName : null,
        localityId: typeof user.residenceLocalityId === 'string' ? user.residenceLocalityId : null,
        localityName: typeof user.residenceLocalityName === 'string' ? user.residenceLocalityName : null,
    });
}

export async function fetchAccountResidence(): Promise<{
    residence: StructuredLocation;
    timezone: string;
}> {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        const data = await response.json().catch(() => null) as { ok?: boolean; user?: Record<string, unknown> } | null;
        const residence = parseResidenceFromUser(data?.user);
        const timezone = typeof data?.user?.timezone === 'string'
            ? data.user.timezone
            : inferTimezoneFromStructuredLocation(residence);
        return { residence, timezone };
    } catch {
        const residence = normalizeStructuredLocation({ countryCode: 'CL' });
        return { residence, timezone: inferTimezoneFromStructuredLocation(residence) };
    }
}

export async function updateAccountResidence(
    residence: StructuredLocation,
): Promise<{
    ok: boolean;
    residence?: StructuredLocation;
    timezone?: string;
    timezoneLabel?: string;
    error?: string;
    unauthorized?: boolean;
}> {
    const normalized = normalizeStructuredLocation(residence);
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                residenceCountryCode: normalized.countryCode,
                residenceRegionId: normalized.regionId,
                residenceRegionName: normalized.regionName,
                residenceLocalityId: normalized.localityId,
                residenceLocalityName: normalized.localityName,
            }),
        });
        const data = await response.json().catch(() => null) as {
            ok?: boolean;
            user?: Record<string, unknown>;
            error?: string;
        } | null;
        if (response.status === 401) {
            return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
        }
        if (!response.ok || !data?.ok) {
            return { ok: false, error: data?.error ?? 'No pudimos guardar tu ubicación.' };
        }
        const saved = parseResidenceFromUser(data.user);
        const timezone = typeof data.user?.timezone === 'string'
            ? data.user.timezone
            : inferTimezoneFromStructuredLocation(saved);
        return {
            ok: true,
            residence: saved,
            timezone,
            timezoneLabel: timezoneShortLabel(timezone),
        };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}
