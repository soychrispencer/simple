import { eq } from 'drizzle-orm';
import { normalizeTimezone } from '@simple/utils';
import { db } from '../db/index.js';
import { agendaProfessionalProfiles, users } from '../db/schema.js';
import {
    inferTimezoneForAgendaProfile,
    inferTimezoneForResidence,
    operatingLocationFromAgendaProfile,
    residenceFromUserRow,
} from './structured-location.js';

/** Propaga TZ operativa (desde ubicación del negocio) al perfil profesional. */
export async function syncAgendaProfileTimezoneFromOperatingLocation(
    userId: string,
    profileRow: Record<string, unknown>,
): Promise<string> {
    const tz = normalizeTimezone(inferTimezoneForAgendaProfile(profileRow as Parameters<typeof inferTimezoneForAgendaProfile>[0]));
    await db
        .update(agendaProfessionalProfiles)
        .set({ timezone: tz, updatedAt: new Date() })
        .where(eq(agendaProfessionalProfiles.userId, userId));
    return tz;
}

export async function readUserTimezone(userId: string): Promise<string> {
    const row = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            timezone: true,
            residenceCountryCode: true,
            residenceRegionId: true,
            residenceRegionName: true,
            residenceLocalityId: true,
            residenceLocalityName: true,
        },
    });
    if (!row) return 'America/Santiago';
    const inferred = inferTimezoneForResidence(row);
    return normalizeTimezone(row.timezone ?? inferred);
}

/** TZ del panel = residencia; TZ operativa = ubicación del negocio. */
export async function resolveAgendaProfessionalTimezone(
    userId: string,
    profileRow: Record<string, unknown>,
): Promise<string> {
    const operating = operatingLocationFromAgendaProfile(profileRow as Parameters<typeof operatingLocationFromAgendaProfile>[0]);
    const hasOperating = Boolean(operating.regionName || operating.localityName || operating.regionId || operating.localityId);
    const userRow = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            timezone: true,
            residenceCountryCode: true,
            residenceRegionId: true,
            residenceRegionName: true,
            residenceLocalityId: true,
            residenceLocalityName: true,
        },
    });
    const panelTz = userRow
        ? normalizeTimezone(userRow.timezone ?? inferTimezoneForResidence(userRow))
        : 'America/Santiago';
    const operationalTz = hasOperating
        ? normalizeTimezone(inferTimezoneForAgendaProfile(profileRow as Parameters<typeof inferTimezoneForAgendaProfile>[0]))
        : panelTz;
    if ((profileRow.timezone as string | undefined) !== operationalTz) {
        await syncAgendaProfileTimezoneFromOperatingLocation(userId, profileRow);
    }
    return operationalTz;
}

export async function syncUserTimezoneFromResidence(userId: string): Promise<string> {
    const row = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            residenceCountryCode: true,
            residenceRegionId: true,
            residenceRegionName: true,
            residenceLocalityId: true,
            residenceLocalityName: true,
        },
    });
    if (!row) return 'America/Santiago';
    const tz = normalizeTimezone(inferTimezoneForResidence(row));
    await db.update(users).set({ timezone: tz, updatedAt: new Date() }).where(eq(users.id, userId));
    return tz;
}

export function publicResidenceFromUser(user: Record<string, unknown>) {
    const residence = residenceFromUserRow(user as Parameters<typeof residenceFromUserRow>[0]);
    return {
        residence,
        residenceCountryCode: residence.countryCode,
        residenceRegionId: residence.regionId,
        residenceRegionName: residence.regionName,
        residenceLocalityId: residence.localityId,
        residenceLocalityName: residence.localityName,
    };
}
