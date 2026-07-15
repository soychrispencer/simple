import {
    PLATFORM_OPS_BUSINESS_ID,
    type ConversationThreadStatus,
    type TimelineEventType,
} from '@simple/utils';
import { recordTimelineEvent } from '../platform/timeline-events.js';

const CONVERSATION_EVENT_TYPES = [
    'whatsapp.manual',
    'channel.inbound',
    'conversation.status_changed',
] as const satisfies readonly TimelineEventType[];

export type AdminConversationItem = {
    threadId: string;
    channel: string;
    status: ConversationThreadStatus;
    phone: string | null;
    name: string | null;
    lastMessage: string | null;
    sourceVertical: string | null;
    capturedByUserId: string | null;
    occurredAt: string;
    pendingSince: string;
    hoursPending: number;
    overdue24h: boolean;
    eventCount: number;
};

export type AdminConversationsSummary = {
    pendingCount: number;
    overdueCount: number;
    doneCount: number;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Normalize Chile-first WhatsApp / phone input to +56… or digits with +. */
export function normalizeConversationPhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 8) return `+569${digits}`;
    if (digits.startsWith('569') && digits.length === 11) return `+${digits}`;
    if (digits.startsWith('56') && digits.length >= 10) return `+${digits}`;
    if (digits.startsWith('9') && digits.length === 9) return `+56${digits}`;
    if (raw.trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
    if (digits.length >= 8) return `+${digits}`;
    return null;
}

export function conversationThreadId(channel: string, phone: string): string {
    return `${channel}:${phone}`;
}

type TimelineRow = {
    id: string;
    type: string;
    occurredAt: Date;
    personId: string | null;
    subjectId: string;
    payload: Record<string, unknown> | null;
};

function buildConversationItems(rows: TimelineRow[]): AdminConversationItem[] {
    const byThread = new Map<string, TimelineRow[]>();
    for (const row of rows) {
        const threadId = row.subjectId || row.personId;
        if (!threadId) continue;
        const list = byThread.get(threadId) ?? [];
        list.push(row);
        byThread.set(threadId, list);
    }

    const now = Date.now();
    const items: AdminConversationItem[] = [];

    for (const [threadId, events] of byThread) {
        events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
        const latest = events[events.length - 1]!;
        const latestPayload = asRecord(latest.payload);
        let status: ConversationThreadStatus = 'pending';
        if (latest.type === 'conversation.status_changed') {
            status = asString(latestPayload.status) === 'done' ? 'done' : 'pending';
        } else if (asString(latestPayload.status) === 'done') {
            status = 'done';
        }

        const firstPending = [...events].reverse().find((event) => {
            const payload = asRecord(event.payload);
            if (event.type === 'conversation.status_changed') {
                return asString(payload.status) !== 'done';
            }
            return asString(payload.status) !== 'done';
        }) ?? events[0]!;

        const openSince = status === 'pending' ? firstPending.occurredAt : latest.occurredAt;
        const hoursPending = Math.max(0, (now - openSince.getTime()) / (1000 * 60 * 60));
        const inbound = [...events].reverse().find((event) =>
            event.type === 'whatsapp.manual' || event.type === 'channel.inbound'
        ) ?? latest;
        const inboundPayload = asRecord(inbound.payload);

        items.push({
            threadId,
            channel: asString(inboundPayload.channel) || 'whatsapp',
            status,
            phone: asString(inboundPayload.phone),
            name: asString(inboundPayload.name),
            lastMessage: asString(latestPayload.message) || asString(inboundPayload.message) || asString(latestPayload.note),
            sourceVertical: asString(inboundPayload.sourceVertical),
            capturedByUserId: asString(inboundPayload.capturedByUserId),
            occurredAt: latest.occurredAt.toISOString(),
            pendingSince: openSince.toISOString(),
            hoursPending: Math.round(hoursPending * 10) / 10,
            overdue24h: status === 'pending' && hoursPending >= 24,
            eventCount: events.length,
        });
    }

    items.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return new Date(b.pendingSince).getTime() - new Date(a.pendingSince).getTime();
    });
    return items;
}

export function summarizeConversations(items: AdminConversationItem[]): AdminConversationsSummary {
    return {
        pendingCount: items.filter((item) => item.status === 'pending').length,
        overdueCount: items.filter((item) => item.overdue24h).length,
        doneCount: items.filter((item) => item.status === 'done').length,
    };
}

export async function listAdminConversations(deps: {
    db: any;
    eq: any;
    and: any;
    inArray: any;
    desc: any;
    tables: { timelineEvents: any };
    status?: ConversationThreadStatus | 'all';
}): Promise<{ items: AdminConversationItem[]; summary: AdminConversationsSummary }> {
    const rows = await deps.db
        .select({
            id: deps.tables.timelineEvents.id,
            type: deps.tables.timelineEvents.type,
            occurredAt: deps.tables.timelineEvents.occurredAt,
            personId: deps.tables.timelineEvents.personId,
            subjectId: deps.tables.timelineEvents.subjectId,
            payload: deps.tables.timelineEvents.payload,
        })
        .from(deps.tables.timelineEvents)
        .where(deps.and(
            deps.eq(deps.tables.timelineEvents.vertical, 'platform'),
            deps.eq(deps.tables.timelineEvents.businessId, PLATFORM_OPS_BUSINESS_ID),
            deps.inArray(deps.tables.timelineEvents.type, [...CONVERSATION_EVENT_TYPES]),
        ))
        .orderBy(deps.desc(deps.tables.timelineEvents.occurredAt))
        .limit(500);

    const all = buildConversationItems(rows as TimelineRow[]);
    const summary = summarizeConversations(all);
    const status = deps.status ?? 'pending';
    const items = status === 'all' ? all : all.filter((item) => item.status === status);
    return { items, summary };
}

export async function captureWhatsappManual(deps: {
    db: any;
    tables: { timelineEvents: any };
    adminUserId: string;
    phone: string;
    name?: string | null;
    message?: string | null;
    sourceVertical?: string | null;
}): Promise<{ threadId: string }> {
    const phone = normalizeConversationPhone(deps.phone);
    if (!phone) throw new Error('INVALID_PHONE');
    const threadId = conversationThreadId('whatsapp', phone);
    await recordTimelineEvent(deps.db, deps.tables.timelineEvents, {
        type: 'whatsapp.manual',
        business: { vertical: 'platform', id: PLATFORM_OPS_BUSINESS_ID },
        person: { kind: 'opaque', id: threadId },
        subject: { kind: 'channel_thread', id: threadId },
        actor: 'admin',
        payload: {
            status: 'pending',
            channel: 'whatsapp',
            phone,
            name: deps.name?.trim() || null,
            message: deps.message?.trim() || null,
            sourceVertical: deps.sourceVertical?.trim() || null,
            capturedByUserId: deps.adminUserId,
        },
    });
    return { threadId };
}

export async function updateConversationStatus(deps: {
    db: any;
    tables: { timelineEvents: any };
    adminUserId: string;
    threadId: string;
    status: ConversationThreadStatus;
    note?: string | null;
}): Promise<void> {
    const channel = deps.threadId.includes(':') ? deps.threadId.split(':')[0]! : 'whatsapp';
    await recordTimelineEvent(deps.db, deps.tables.timelineEvents, {
        type: 'conversation.status_changed',
        business: { vertical: 'platform', id: PLATFORM_OPS_BUSINESS_ID },
        person: { kind: 'opaque', id: deps.threadId },
        subject: { kind: 'channel_thread', id: deps.threadId },
        actor: 'admin',
        payload: {
            status: deps.status,
            channel,
            note: deps.note?.trim() || null,
            changedByUserId: deps.adminUserId,
        },
    });
}
