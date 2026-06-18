import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    serenataAvailabilityRules,
    serenataGroupServices,
    serenataGroups,
    serenataGroupMembers,
    serenataProviderGroupBlockedSlots,
    serenataProviderGroups,
    serenatas,
} from '../../db/schema.js';
import { eventDateYmd, SERENATA_TIMEZONE, todayYmdInChile, todayYmdInTimezone } from './lifecycle.js';

export const DEFAULT_SLA_HOURS = 24;
/** Plazo único de respuesta del dueño en solicitudes marketplace pagadas (expiración + cronómetro). */
export const MARKETPLACE_RESPONSE_SLA_HOURS = 24;
export const MARKETPLACE_MIN_LEAD_HOURS = 2;
export const MARKETPLACE_DAY_START = '09:00';
export const MARKETPLACE_DAY_END = '23:00';

export const BLOCKING_SERENATA_STATUSES = ['accepted_pending_group', 'scheduled'] as const;
/** Incluye `pending` para anti-doble-booking: máximo una solicitud pendiente por slot/grupo. */
const STRICT_BLOCKING_STATUSES = ['pending', 'accepted_pending_group', 'scheduled'] as const;

export type ProviderGroupSlotOptions = {
    dayStart?: string;
    dayEnd?: string;
    bufferMinutes?: number;
    blockedSlots?: { startsAt: Date; endsAt: Date }[];
    timezone?: string;
};

export type ProviderGroupBlockedSlotRow = typeof serenataProviderGroupBlockedSlots.$inferSelect;

export type SerenataAvailabilityRuleInput = {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
};

export function toNumber(value: string | null): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function toDateRange(rawDate: string | undefined): { start: Date; end: Date } | null {
    if (!rawDate) return null;
    const start = new Date(`${rawDate}T00:00:00.000Z`);
    const end = new Date(`${rawDate}T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end };
}

export function minutesFromTime(value: string) {
    const [rawHours, rawMinutes] = value.split(':');
    const hours = Number(rawHours);
    const minutes = Number(rawMinutes);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function rangesOverlap(startA: number, durationA: number, startB: number, durationB: number) {
    return startA < startB + durationB && startB < startA + durationA;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const radius = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * radius * Math.asin(Math.sqrt(h));
}

function estimatedTravelMinutes(a: typeof serenatas.$inferSelect, b: typeof serenatas.$inferSelect) {
    const aLat = toNumber(a.lat);
    const aLng = toNumber(a.lng);
    const bLat = toNumber(b.lat);
    const bLng = toNumber(b.lng);
    if (aLat == null || aLng == null || bLat == null || bLng == null) return 15;
    return Math.max(10, Math.ceil((distanceKm({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng }) / 28) * 60) + 8);
}

function timePartsInTimezone(date = new Date(), timezone = SERENATA_TIMEZONE) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? NaN);
    return {
        ymd: `${read('year')}-${String(read('month')).padStart(2, '0')}-${String(read('day')).padStart(2, '0')}`,
        minutes: read('hour') * 60 + read('minute'),
    };
}

/** UTC ms para una fecha/hora expresada en la zona indicada (default Chile). */
export function wallClockToMs(ymd: string, minutes: number, timezone = SERENATA_TIMEZONE): number | null {
    const [year, month, day] = ymd.split('-').map(Number);
    if (!year || !month || !day || !Number.isFinite(minutes)) return null;
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    for (let offset = -5; offset <= -2; offset += 1) {
        const candidate = Date.UTC(year, month - 1, day, hh - offset, mm);
        const parts = formatter.formatToParts(new Date(candidate));
        const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? NaN);
        const candidateYmd = `${read('year')}-${String(read('month')).padStart(2, '0')}-${String(read('day')).padStart(2, '0')}`;
        const candidateMinutes = read('hour') * 60 + read('minute');
        if (candidateYmd === ymd && candidateMinutes === minutes) return candidate;
    }
    return null;
}

/** @deprecated Usar `wallClockToMs`. */
export function chileWallClockToMs(ymd: string, minutes: number): number | null {
    return wallClockToMs(ymd, minutes, SERENATA_TIMEZONE);
}

export function dayOfWeekInTimezone(ymd: string, timezone = SERENATA_TIMEZONE): number {
    const ms = wallClockToMs(ymd, 12 * 60, timezone);
    const date = ms != null ? new Date(ms) : new Date(`${ymd}T12:00:00.000Z`);
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
    }).format(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const index = days.indexOf(weekday);
    return index >= 0 ? index : date.getUTCDay();
}

/** @deprecated Usar `dayOfWeekInTimezone`. */
export function dayOfWeekChile(ymd: string): number {
    return dayOfWeekInTimezone(ymd, SERENATA_TIMEZONE);
}

export function resolveBufferMinutes(value?: number | null) {
    if (!Number.isFinite(value) || value == null || value < 0) return 0;
    return Math.min(120, Math.floor(value));
}

export const DEFAULT_WEEKLY_RULES: SerenataAvailabilityRuleInput[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: MARKETPLACE_DAY_START,
    endTime: MARKETPLACE_DAY_END,
    isActive: true,
}));

export async function listProviderGroupAvailabilityRules(providerGroupId: string) {
    return db.select().from(serenataAvailabilityRules).where(
        eq(serenataAvailabilityRules.providerGroupId, providerGroupId),
    ).orderBy(asc(serenataAvailabilityRules.dayOfWeek), asc(serenataAvailabilityRules.startTime));
}

export async function listProviderGroupBlockedSlots(providerGroupId: string) {
    const now = new Date();
    return db.select().from(serenataProviderGroupBlockedSlots).where(and(
        eq(serenataProviderGroupBlockedSlots.providerGroupId, providerGroupId),
        gte(serenataProviderGroupBlockedSlots.endsAt, now),
    )).orderBy(asc(serenataProviderGroupBlockedSlots.startsAt));
}

function slotRangeOverlapsBlocked(
    dayYmd: string,
    slotStartMinutes: number,
    slotEndMinutes: number,
    blocked: { startsAt: Date; endsAt: Date }[],
    timezone = SERENATA_TIMEZONE,
): boolean {
    const slotStartMs = wallClockToMs(dayYmd, slotStartMinutes, timezone);
    const slotEndMs = wallClockToMs(dayYmd, slotEndMinutes, timezone);
    if (slotStartMs == null || slotEndMs == null) return false;
    return blocked.some((block) => slotStartMs < block.endsAt.getTime() && block.startsAt.getTime() < slotEndMs);
}

export async function getProviderGroupSlotOptions(
    providerGroupId: string,
    dayYmd: string,
): Promise<ProviderGroupSlotOptions | null> {
    const group = await db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.id, providerGroupId),
        columns: { bufferMinutes: true, timezone: true },
    });
    if (!group) return null;

    const tz = group.timezone ?? SERENATA_TIMEZONE;
    const dow = dayOfWeekInTimezone(dayYmd, tz);
    const rules = await listProviderGroupAvailabilityRules(providerGroupId);
    const activeRules = rules.filter((rule) => rule.isActive);
    const dayRule = activeRules.length > 0
        ? activeRules.find((rule) => rule.dayOfWeek === dow)
        : DEFAULT_WEEKLY_RULES.find((rule) => rule.dayOfWeek === dow);

    if (!dayRule) {
        return { bufferMinutes: resolveBufferMinutes(group.bufferMinutes), timezone: tz };
    }

    return {
        dayStart: dayRule.startTime,
        dayEnd: dayRule.endTime,
        bufferMinutes: resolveBufferMinutes(group.bufferMinutes),
        timezone: tz,
    };
}

export async function replaceProviderGroupAvailabilityRules(
    providerGroupId: string,
    rules: SerenataAvailabilityRuleInput[],
) {
    const now = new Date();
    await db.delete(serenataAvailabilityRules).where(eq(serenataAvailabilityRules.providerGroupId, providerGroupId));
    if (rules.length === 0) return [];
    return db.insert(serenataAvailabilityRules).values(rules.map((rule) => ({
        providerGroupId,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        isActive: rule.isActive ?? true,
        createdAt: now,
        updatedAt: now,
    }))).returning();
}

export function resolveSlaHours(groupSlaHours?: number | null, ownerSlaHours?: number | null) {
    const value = groupSlaHours ?? ownerSlaHours ?? DEFAULT_SLA_HOURS;
    if (!Number.isFinite(value) || value < 1) return DEFAULT_SLA_HOURS;
    return Math.min(168, Math.max(1, Math.floor(value)));
}

export function computeMarketplaceResponseDueAt(from = new Date()): Date {
    return new Date(from.getTime() + MARKETPLACE_RESPONSE_SLA_HOURS * 60 * 60 * 1000);
}

export function validateMarketplaceEventLead(
    eventDate: Date,
    eventTime: string | null | undefined,
    minLeadHours = MARKETPLACE_MIN_LEAD_HOURS,
    timezone = SERENATA_TIMEZONE,
): string | null {
    const ymd = eventDateYmd(eventDate);
    if (!ymd) return 'Fecha inválida.';
    if (!eventTime) return null;
    const eventMinutes = minutesFromTime(eventTime);
    if (eventMinutes == null) return 'Hora inválida.';
    const eventMs = wallClockToMs(ymd, eventMinutes, timezone);
    if (eventMs == null) return 'Fecha u hora inválida.';
    const nowMs = Date.now();
    if (eventMs < nowMs) return 'La fecha y hora del evento deben ser futuras.';
    if (eventMs - nowMs < minLeadHours * 60 * 60 * 1000) {
        return `Reserva con al menos ${minLeadHours} horas de anticipación.`;
    }
    return null;
}

export async function validateGroupForSerenata<TClient extends Pick<typeof db, 'query' | 'select'>>(
    tx: TClient,
    input: {
        ownerId: string;
        serenataId?: string;
        groupId: string | null | undefined;
        requiredMusicians?: number;
        eventDate: Date;
        eventTime: string | null;
        duration: number;
    },
) {
    if (!input.groupId || !input.eventTime) return null;
    const group = await tx.query.serenataGroups.findFirst({
        where: and(eq(serenataGroups.id, input.groupId), eq(serenataGroups.ownerId, input.ownerId)),
    });
    if (!group) return 'Grupo no encontrado.';

    const requiredMusicians = input.requiredMusicians ?? 0;
    if (requiredMusicians > 0) {
        const members = await tx.select({ id: serenataGroupMembers.id }).from(serenataGroupMembers)
            .where(and(
                eq(serenataGroupMembers.groupId, input.groupId),
                inArray(serenataGroupMembers.status, ['invited', 'accepted']),
            ));
        if (members.length < requiredMusicians) {
            return `Este servicio requiere ${requiredMusicians} músicos. El grupo seleccionado tiene ${members.length}.`;
        }
    }

    const eventDate = input.eventDate.toISOString().slice(0, 10);
    const range = toDateRange(eventDate);
    if (!range) return null;
    const currentStart = minutesFromTime(input.eventTime);
    if (currentStart == null) return null;
    const existing = await tx.select().from(serenatas).where(and(
        eq(serenatas.ownerId, input.ownerId),
        eq(serenatas.groupId, input.groupId),
        inArray(serenatas.status, [...BLOCKING_SERENATA_STATUSES]),
        gte(serenatas.eventDate, range.start),
        lte(serenatas.eventDate, range.end),
    ));
    const conflicting = existing.find((item) => {
        if (input.serenataId && item.id === input.serenataId) return false;
        if (!item.eventTime) return false;
        const otherStart = minutesFromTime(item.eventTime);
        return otherStart != null && rangesOverlap(currentStart, input.duration, otherStart, item.duration);
    });
    if (conflicting) {
        return `Ese grupo ya tiene una serenata a las ${conflicting.eventTime ?? '—'}. Ajusta horario o selecciona otro grupo.`;
    }

    return null;
}

export async function countOwnerBlockingSerenatas(ownerId: string): Promise<number> {
    const rows = await db.select({ id: serenatas.id }).from(serenatas).where(and(
        eq(serenatas.ownerId, ownerId),
        inArray(serenatas.status, [...BLOCKING_SERENATA_STATUSES]),
    ));
    return rows.length;
}

export async function ownerCalendarIsClear(ownerId: string): Promise<boolean> {
    return (await countOwnerBlockingSerenatas(ownerId)) === 0;
}

export async function validateOwnerAvailability(
    client: Pick<typeof db, 'select'>,
    input: {
        ownerId: string;
        serenata: typeof serenatas.$inferSelect;
        excludeId?: string;
    },
) {
    const eventDate = input.serenata.eventDate.toISOString().slice(0, 10);
    const range = toDateRange(eventDate);
    if (!range) return null;
    if (!input.serenata.eventTime) return null;
    const start = minutesFromTime(input.serenata.eventTime);
    if (start == null) return null;
    const items = await client.select().from(serenatas).where(and(
        eq(serenatas.ownerId, input.ownerId),
        inArray(serenatas.status, [...BLOCKING_SERENATA_STATUSES]),
        gte(serenatas.eventDate, range.start),
        lte(serenatas.eventDate, range.end),
    ));

    for (const item of items) {
        if (item.id === input.serenata.id || item.id === input.excludeId) continue;
        if (!item.eventTime) continue;
        const otherStart = minutesFromTime(item.eventTime);
        if (otherStart == null) continue;
        const travel = estimatedTravelMinutes(input.serenata, item);
        const currentBeforeOther = start <= otherStart;
        const currentEndWithTravel = start + input.serenata.duration + travel;
        const otherEndWithTravel = otherStart + item.duration + travel;
        if ((currentBeforeOther && currentEndWithTravel > otherStart) || (!currentBeforeOther && otherEndWithTravel > start)) {
            return `No hay tiempo suficiente con ${item.recipientName} a las ${item.eventTime}. Considera otro horario o reordenar la ruta.`;
        }
    }

    return null;
}

export async function validateProviderGroupSlot(
    client: Pick<typeof db, 'select'>,
    input: {
        ownerId: string;
        providerGroupId: string;
        eventDate: Date;
        eventTime: string;
        duration: number;
        excludeId?: string;
        includePending?: boolean;
    },
): Promise<string | null> {
    const draft = {
        id: input.excludeId ?? '',
        ownerId: input.ownerId,
        providerGroupId: input.providerGroupId,
        eventDate: input.eventDate,
        eventTime: input.eventTime,
        duration: input.duration,
        lat: null,
        lng: null,
    } as typeof serenatas.$inferSelect;

    const ownerConflict = await validateOwnerAvailability(client, {
        ownerId: input.ownerId,
        serenata: draft,
        excludeId: input.excludeId,
    });
    if (ownerConflict) return ownerConflict;

    const ymd = eventDateYmd(input.eventDate);
    const range = ymd ? toDateRange(ymd) : null;
    const currentStart = minutesFromTime(input.eventTime);
    if (!ymd || !range || currentStart == null) return null;

    const statuses = input.includePending
        ? [...STRICT_BLOCKING_STATUSES]
        : [...BLOCKING_SERENATA_STATUSES];

    const existing = await client.select().from(serenatas).where(and(
        eq(serenatas.providerGroupId, input.providerGroupId),
        inArray(serenatas.status, statuses),
        gte(serenatas.eventDate, range.start),
        lte(serenatas.eventDate, range.end),
    ));

    const conflicting = existing.find((item) => {
        if (input.excludeId && item.id === input.excludeId) return false;
        if (!item.eventTime) return false;
        const otherStart = minutesFromTime(item.eventTime);
        return otherStart != null && rangesOverlap(currentStart, input.duration, otherStart, item.duration);
    });

    if (conflicting) {
        const label = conflicting.status === 'pending' ? 'solicitud pendiente' : 'serenata';
        return `Ese horario se solapa con una ${label} a las ${conflicting.eventTime}. Elige otro horario.`;
    }

    const blocked = await listProviderGroupBlockedSlots(input.providerGroupId);
    const slotEndMinutes = currentStart + input.duration;
    if (slotRangeOverlapsBlocked(ymd, currentStart, slotEndMinutes, blocked)) {
        return 'Ese horario cae en un período bloqueado. Elige otra fecha u horario.';
    }

    return null;
}

type SlotSerenata = Pick<typeof serenatas.$inferSelect, 'eventTime' | 'duration' | 'status'>;

export function generateMarketplaceTimeSlots(
    durationMinutes: number,
    dayYmd: string,
    existing: SlotSerenata[],
    options?: ProviderGroupSlotOptions,
): string[] {
    const dayStart = minutesFromTime(options?.dayStart ?? MARKETPLACE_DAY_START) ?? 9 * 60;
    const dayEnd = minutesFromTime(options?.dayEnd ?? MARKETPLACE_DAY_END) ?? 23 * 60;
    const bufferMinutes = resolveBufferMinutes(options?.bufferMinutes);
    const blocked = options?.blockedSlots ?? [];
    const tz = options?.timezone ?? SERENATA_TIMEZONE;
    const step = durationMinutes + bufferMinutes;
    if (dayEnd <= dayStart || step <= 0) return [];

    const slots: string[] = [];
    const today = todayYmdInTimezone(tz);
    const nowParts = timePartsInTimezone(new Date(), tz);

    for (let cursor = dayStart; cursor + durationMinutes <= dayEnd; cursor += step) {
        if (dayYmd === today && cursor <= nowParts.minutes) continue;
        const overlaps = existing.some((item) => {
            if (!item.eventTime) return false;
            const otherStart = minutesFromTime(item.eventTime);
            if (otherStart == null) return false;
            return rangesOverlap(
                cursor,
                durationMinutes + bufferMinutes,
                otherStart,
                item.duration + bufferMinutes,
            );
        });
        if (overlaps) continue;
        if (slotRangeOverlapsBlocked(dayYmd, cursor, cursor + durationMinutes + bufferMinutes, blocked, tz)) continue;
        slots.push(minutesToTime(cursor));
    }

    return slots;
}

export async function listProviderGroupBusySerenatas(
    providerGroupId: string,
    dayYmd: string,
    includePending = true,
) {
    const range = toDateRange(dayYmd);
    if (!range) return [];
    const statuses = includePending
        ? [...STRICT_BLOCKING_STATUSES]
        : [...BLOCKING_SERENATA_STATUSES];
    const rows = await db.select({
        eventTime: serenatas.eventTime,
        duration: serenatas.duration,
        status: serenatas.status,
    }).from(serenatas).where(and(
        eq(serenatas.providerGroupId, providerGroupId),
        inArray(serenatas.status, statuses),
        gte(serenatas.eventDate, range.start),
        lte(serenatas.eventDate, range.end),
    ));
    return rows.filter((row) => row.eventTime != null);
}

type BusySerenataSlot = Pick<typeof serenatas.$inferSelect, 'eventTime' | 'duration' | 'status'>;

export async function listProviderGroupsBusySerenatas(
    providerGroupIds: string[],
    dayYmd: string,
    includePending = true,
) {
    if (providerGroupIds.length === 0) return [] as Array<BusySerenataSlot & { providerGroupId: string }>;
    const range = toDateRange(dayYmd);
    if (!range) return [];
    const statuses = includePending
        ? [...STRICT_BLOCKING_STATUSES]
        : [...BLOCKING_SERENATA_STATUSES];
    const rows = await db.select({
        providerGroupId: serenatas.providerGroupId,
        eventTime: serenatas.eventTime,
        duration: serenatas.duration,
        status: serenatas.status,
    }).from(serenatas).where(and(
        inArray(serenatas.providerGroupId, providerGroupIds),
        inArray(serenatas.status, statuses),
        gte(serenatas.eventDate, range.start),
        lte(serenatas.eventDate, range.end),
    ));
    return rows.filter((row): row is BusySerenataSlot & { providerGroupId: string } => (
        row.providerGroupId != null && row.eventTime != null
    ));
}

export async function filterProviderGroupsAvailableOnDate(
    groups: (typeof serenataProviderGroups.$inferSelect)[],
    dayYmd: string,
) {
    if (groups.length === 0) return groups;
    const groupIds = groups.map((group) => group.id);
    const now = new Date();

    const [services, rules, blockedSlots, busySerenatas] = await Promise.all([
        db.select({
            providerGroupId: serenataGroupServices.providerGroupId,
            durationMinutes: serenataGroupServices.durationMinutes,
        }).from(serenataGroupServices).where(and(
            inArray(serenataGroupServices.providerGroupId, groupIds),
            eq(serenataGroupServices.isActive, true),
        )),
        db.select().from(serenataAvailabilityRules).where(
            inArray(serenataAvailabilityRules.providerGroupId, groupIds),
        ),
        db.select().from(serenataProviderGroupBlockedSlots).where(and(
            inArray(serenataProviderGroupBlockedSlots.providerGroupId, groupIds),
            gte(serenataProviderGroupBlockedSlots.endsAt, now),
        )),
        listProviderGroupsBusySerenatas(groupIds, dayYmd, true),
    ]);

    const dow = dayOfWeekInTimezone(dayYmd, SERENATA_TIMEZONE);

    return groups.filter((group) => {
        const groupTz = group.timezone ?? SERENATA_TIMEZONE;
        const groupDow = groupTz === SERENATA_TIMEZONE ? dow : dayOfWeekInTimezone(dayYmd, groupTz);
        const groupServices = services.filter((service) => service.providerGroupId === group.id);
        if (groupServices.length === 0) return false;

        const groupRules = rules.filter((rule) => rule.providerGroupId === group.id);
        const activeRules = groupRules.filter((rule) => rule.isActive);
        const dayRule = activeRules.length > 0
            ? activeRules.find((rule) => rule.dayOfWeek === groupDow)
            : DEFAULT_WEEKLY_RULES.find((rule) => rule.dayOfWeek === groupDow);
        if (activeRules.length > 0 && !dayRule) return false;

        const slotOptions: ProviderGroupSlotOptions = {
            dayStart: dayRule?.startTime,
            dayEnd: dayRule?.endTime,
            bufferMinutes: resolveBufferMinutes(group.bufferMinutes),
            blockedSlots: blockedSlots
                .filter((slot) => slot.providerGroupId === group.id)
                .map((slot) => ({ startsAt: slot.startsAt, endsAt: slot.endsAt })),
            timezone: groupTz,
        };
        const busy = busySerenatas.filter((item) => item.providerGroupId === group.id);

        return groupServices.some((service) => (
            generateMarketplaceTimeSlots(service.durationMinutes, dayYmd, busy, slotOptions).length > 0
        ));
    });
}
