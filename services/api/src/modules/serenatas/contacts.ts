import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataClients, serenatas, timelineEvents, users } from '../../db/schema.js';

export type OwnerContact = {
    id: string;
    clientId: string | null;
    displayName: string;
    phone: string | null;
    email: string | null;
    serenataCount: number;
    completedCount: number;
    lastEventDate: string | null;
    lastStatus: string;
    lastSerenataId: string;
    sources: string[];
};

export type OwnerContactSerenata = {
    id: string;
    recipientName: string;
    status: string;
    source: string;
    eventDate: string | null;
    eventTime: string | null;
    price: number | null;
    comuna: string | null;
    address: string | null;
};

export type OwnerContactTimelineEvent = {
    id: string;
    type: string;
    occurredAt: string;
    actor: string;
    subjectKind: string;
    subjectId: string;
    payload: Record<string, unknown> | null;
};

export type OwnerContactDetail = {
    contact: OwnerContact;
    serenatas: OwnerContactSerenata[];
    events: OwnerContactTimelineEvent[];
};

function normalizePhone(value: string | null | undefined): string {
    return (value ?? '').replace(/\D/g, '');
}

function formatEventDate(raw: unknown): string | null {
    if (raw == null) return null;
    if (typeof raw === 'string') return raw.slice(0, 10);
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    return String(raw).slice(0, 10);
}

export function contactKey(row: {
    clientId: string | null;
    clientPhone: string | null;
    userPhone: string | null;
    recipientName: string;
}): string {
    if (row.clientId) return `client:${row.clientId}`;
    const phone = normalizePhone(row.clientPhone) || normalizePhone(row.userPhone);
    if (phone) return `phone:${phone}`;
    return `name:${row.recipientName.trim().toLowerCase() || 'sin-nombre'}`;
}

type ContactRow = {
    id: string;
    clientId: string | null;
    recipientName: string;
    clientPhone: string | null;
    status: string;
    source: string;
    eventDate: unknown;
    eventTime: string | null;
    price: number | null;
    comuna: string | null;
    address: string;
    createdAt: Date;
    userName: string | null;
    userEmail: string | null;
    userPhone: string | null;
    profilePhone: string | null;
    clientUserId: string | null;
};

async function loadOwnerContactRows(ownerId: string): Promise<ContactRow[]> {
    return db
        .select({
            id: serenatas.id,
            clientId: serenatas.clientId,
            recipientName: serenatas.recipientName,
            clientPhone: serenatas.clientPhone,
            status: serenatas.status,
            source: serenatas.source,
            eventDate: serenatas.eventDate,
            eventTime: serenatas.eventTime,
            price: serenatas.price,
            comuna: serenatas.comuna,
            address: serenatas.address,
            createdAt: serenatas.createdAt,
            userName: users.name,
            userEmail: users.email,
            userPhone: users.phone,
            profilePhone: serenataClients.phone,
            clientUserId: serenataClients.userId,
        })
        .from(serenatas)
        .leftJoin(serenataClients, eq(serenataClients.id, serenatas.clientId))
        .leftJoin(users, eq(users.id, serenataClients.userId))
        .where(eq(serenatas.ownerId, ownerId))
        .orderBy(desc(serenatas.createdAt));
}

function upsertContactMap(
    map: Map<string, OwnerContact & { _lastAt: number }>,
    row: ContactRow,
): void {
    const key = contactKey({
        clientId: row.clientId,
        clientPhone: row.clientPhone,
        userPhone: row.userPhone ?? row.profilePhone,
        recipientName: row.recipientName,
    });
    const eventDateStr = formatEventDate(row.eventDate);
    const phone = row.clientPhone || row.profilePhone || row.userPhone || null;
    const displayName = (row.userName?.trim() || row.recipientName?.trim() || 'Sin nombre');
    const createdMs = row.createdAt instanceof Date ? row.createdAt.getTime() : Date.now();

    const existing = map.get(key);
    if (!existing) {
        map.set(key, {
            id: key,
            clientId: row.clientId,
            displayName,
            phone,
            email: row.userEmail ?? null,
            serenataCount: 1,
            completedCount: row.status === 'completed' ? 1 : 0,
            lastEventDate: eventDateStr,
            lastStatus: row.status,
            lastSerenataId: row.id,
            sources: row.source ? [row.source] : [],
            _lastAt: createdMs,
        });
        return;
    }

    existing.serenataCount += 1;
    if (row.status === 'completed') existing.completedCount += 1;
    if (row.source && !existing.sources.includes(row.source)) {
        existing.sources.push(row.source);
    }
    if (!existing.phone && phone) existing.phone = phone;
    if (!existing.email && row.userEmail) existing.email = row.userEmail;
    if (!existing.clientId && row.clientId) existing.clientId = row.clientId;
    if (row.userName?.trim() && existing.displayName === row.recipientName) {
        existing.displayName = row.userName.trim();
    }
    if (createdMs >= existing._lastAt) {
        existing._lastAt = createdMs;
        existing.lastStatus = row.status;
        existing.lastSerenataId = row.id;
        existing.lastEventDate = eventDateStr ?? existing.lastEventDate;
    }
}

function stripLastAt(contact: OwnerContact & { _lastAt: number }): OwnerContact {
    const { _lastAt: _, ...rest } = contact;
    return rest;
}

/** Aggregates contratantes from owner serenatas (no separate CRM table). */
export async function listOwnerContacts(ownerId: string): Promise<OwnerContact[]> {
    const rows = await loadOwnerContactRows(ownerId);
    const map = new Map<string, OwnerContact & { _lastAt: number }>();
    for (const row of rows) upsertContactMap(map, row);

    return Array.from(map.values())
        .map(stripLastAt)
        .sort((a, b) => {
            const aDate = a.lastEventDate ?? '';
            const bDate = b.lastEventDate ?? '';
            if (aDate !== bDate) return bDate.localeCompare(aDate);
            return b.serenataCount - a.serenataCount;
        });
}

function personKeysForContact(rows: ContactRow[], contact: OwnerContact): string[] {
    const keys = new Set<string>();
    if (contact.clientId) {
        keys.add(contact.clientId);
        keys.add(`serenata_client:${contact.clientId}`);
    }
    for (const row of rows) {
        if (row.clientUserId) keys.add(row.clientUserId);
    }
    const phone = normalizePhone(contact.phone);
    if (phone) keys.add(`phone:${phone}`);
    return Array.from(keys);
}

export async function getOwnerContactDetail(
    ownerId: string,
    contactId: string,
): Promise<OwnerContactDetail | null> {
    const key = decodeURIComponent(contactId).trim();
    if (!key) return null;

    const allRows = await loadOwnerContactRows(ownerId);
    const rows = allRows.filter((row) => contactKey({
        clientId: row.clientId,
        clientPhone: row.clientPhone,
        userPhone: row.userPhone ?? row.profilePhone,
        recipientName: row.recipientName,
    }) === key);

    if (rows.length === 0) return null;

    const map = new Map<string, OwnerContact & { _lastAt: number }>();
    for (const row of rows) upsertContactMap(map, row);
    const contact = stripLastAt(Array.from(map.values())[0]!);

    const serenataItems: OwnerContactSerenata[] = rows.map((row) => ({
        id: row.id,
        recipientName: row.recipientName,
        status: row.status,
        source: row.source,
        eventDate: formatEventDate(row.eventDate),
        eventTime: row.eventTime,
        price: row.price,
        comuna: row.comuna,
        address: row.address,
    }));

    const serenataIds = rows.map((row) => row.id);
    const personIds = personKeysForContact(rows, contact);

    const subjectFilter = and(
        eq(timelineEvents.vertical, 'serenatas'),
        eq(timelineEvents.subjectKind, 'serenata'),
        inArray(timelineEvents.subjectId, serenataIds),
    );
    const personFilter = personIds.length > 0
        ? and(
            eq(timelineEvents.vertical, 'serenatas'),
            inArray(timelineEvents.personId, personIds),
        )
        : null;

    const eventRows = await db
        .select()
        .from(timelineEvents)
        .where(personFilter ? or(subjectFilter, personFilter)! : subjectFilter!)
        .orderBy(desc(timelineEvents.occurredAt))
        .limit(100);

    // Deduplicate if a row matched both filters
    const seen = new Set<string>();
    const events: OwnerContactTimelineEvent[] = [];
    for (const event of eventRows) {
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        events.push({
            id: event.id,
            type: event.type,
            occurredAt: event.occurredAt instanceof Date
                ? event.occurredAt.toISOString()
                : String(event.occurredAt),
            actor: event.actor,
            subjectKind: event.subjectKind,
            subjectId: event.subjectId,
            payload: event.payload ?? null,
        });
    }

    return { contact, serenatas: serenataItems, events };
}

/** Optional narrow search helper for future filters. */
export function filterOwnerContacts(items: OwnerContact[], q: string): OwnerContact[] {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
        const hay = [item.displayName, item.phone ?? '', item.email ?? ''].join(' ').toLowerCase();
        return hay.includes(needle);
    });
}
