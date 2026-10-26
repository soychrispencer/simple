import {
    PLATFORM_OPS_BUSINESS_ID,
    type ConversationThreadStatus,
    type TimelineEventType,
} from '@simple/utils';
import { recordTimelineEvent } from '../platform/timeline-events.js';

const CONVERSATION_EVENT_TYPES = [
    'conversation.message_sent',
    'whatsapp.manual',
    'channel.inbound',
    'conversation.status_changed',
] as const satisfies readonly TimelineEventType[];

export type AdminConversationActivity = {
    id: string;
    direction: 'inbound' | 'outbound' | 'status';
    channel: string | null;
    message: string | null;
    sourceVertical: string | null;
    purpose: string | null;
    campaignName: string | null;
    occurredAt: string;
};

export type AdminConversationItem = {
    threadId: string;
    channel: string;
    status: ConversationThreadStatus;
    phone: string | null;
    name: string | null;
    email: string | null;
    company: string | null;
    lastMessage: string | null;
    purpose: string | null;
    campaignName: string | null;
    activities: AdminConversationActivity[];
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

export function conversationThreadId(channel: string, recipient: string, sourceVertical?: string | null): string {
    return `${channel}:${recipient}${sourceVertical ? `:${sourceVertical}` : ''}`;
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
        const lastMessageEvent = [...events].reverse().find((event) =>
            event.type === 'whatsapp.manual' || event.type === 'channel.inbound' || event.type === 'conversation.message_sent'
        );
        const lastMessagePayload = asRecord(lastMessageEvent?.payload);
        const outbound = [...events].reverse().find((event) => event.type === 'conversation.message_sent');
        const outboundPayload = asRecord(outbound?.payload);
        const contactPayload = [...events].reverse()
            .map((event) => asRecord(event.payload))
            .find((payload) => asString(payload.phone) || asString(payload.email) || asString(payload.name)) ?? inboundPayload;
        const payloadsNewestFirst = [...events].reverse().map((event) => asRecord(event.payload));
        const verticalPayload = payloadsNewestFirst.find((payload) => asString(payload.sourceVertical)) ?? contactPayload;
        const purposePayload = payloadsNewestFirst.find((payload) => asString(payload.purpose)) ?? contactPayload;
        const campaignPayload = payloadsNewestFirst.find((payload) => asString(payload.campaignName)) ?? contactPayload;

        items.push({
            threadId,
            channel: asString(lastMessagePayload.channel) || asString(latestPayload.channel) || asString(outboundPayload.channel) || 'whatsapp',
            status,
            phone: asString(contactPayload.phone),
            name: asString(contactPayload.name),
            email: asString(contactPayload.email),
            company: asString(contactPayload.company),
            lastMessage: asString(lastMessagePayload.message) || asString(latestPayload.message) || asString(latestPayload.note),
            sourceVertical: asString(verticalPayload.sourceVertical),
            purpose: asString(purposePayload.purpose),
            campaignName: asString(campaignPayload.campaignName),
            activities: events.slice(-20).reverse().map((event) => {
                const payload = asRecord(event.payload);
                const direction: AdminConversationActivity['direction'] = event.type === 'conversation.message_sent'
                    ? 'outbound'
                    : event.type === 'conversation.status_changed' ? 'status' : 'inbound';
                const statusMessage = event.type === 'conversation.status_changed'
                    ? asString(payload.note) || (asString(payload.status) === 'done' ? 'Conversación marcada como respondida.' : 'Conversación reabierta.')
                    : null;
                return {
                    id: event.id,
                    direction,
                    channel: asString(payload.channel),
                    message: asString(payload.message) || statusMessage,
                    sourceVertical: asString(payload.sourceVertical),
                    purpose: asString(payload.purpose),
                    campaignName: asString(payload.campaignName),
                    occurredAt: event.occurredAt.toISOString(),
                };
            }),
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
    vertical?: string | null;
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
    const vertical = deps.vertical ?? 'all';
    const byVertical = vertical === 'all'
        ? all
        : vertical === 'unclassified'
            ? all.filter((item) => !item.sourceVertical)
            : all.filter((item) => item.sourceVertical === vertical);
    const summary = summarizeConversations(byVertical);
    const status = deps.status ?? 'pending';
    const items = status === 'all' ? byVertical : byVertical.filter((item) => item.status === status);
    return { items, summary };
}

export async function captureManualResponse(deps: {
    db: any;
    tables: { timelineEvents: any };
    adminUserId: string;
    channel: 'whatsapp_personal' | 'whatsapp_business' | 'email';
    phone?: string | null;
    email?: string | null;
    name?: string | null;
    message: string;
    sourceVertical: 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general';
    purpose: 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other';
    campaignName?: string | null;
}): Promise<{ threadId: string }> {
    const phone = deps.phone?.trim() ? normalizeConversationPhone(deps.phone) : null;
    if (deps.phone?.trim() && !phone) throw new Error('INVALID_PHONE');
    const email = deps.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
    if (deps.channel === 'email' && !email) throw new Error('EMAIL_REQUIRED');
    if (deps.channel !== 'email' && !phone) throw new Error('PHONE_REQUIRED');
    const message = deps.message.trim();
    if (message.length < 1 || message.length > 6000) throw new Error('INVALID_MESSAGE');
    const threadId = deps.channel === 'email'
        ? conversationThreadId('email', email!, deps.sourceVertical)
        : conversationThreadId('whatsapp', phone!, deps.sourceVertical);
    await recordTimelineEvent(deps.db, deps.tables.timelineEvents, {
        type: 'channel.inbound',
        business: { vertical: 'platform', id: PLATFORM_OPS_BUSINESS_ID },
        person: deps.channel === 'email' ? { kind: 'email', id: email! } : { kind: 'opaque', id: phone! },
        subject: { kind: 'channel_thread', id: threadId },
        actor: 'admin',
        payload: {
            status: 'pending',
            channel: deps.channel,
            phone,
            email,
            name: deps.name?.trim() || null,
            message,
            sourceVertical: deps.sourceVertical,
            purpose: deps.purpose,
            campaignName: deps.campaignName?.trim() || null,
            capturedByUserId: deps.adminUserId,
        },
    });
    return { threadId };
}

export type AdminOutboundMessageInput = {
    adminUserId: string;
    channel: 'whatsapp_personal' | 'whatsapp_business' | 'email';
    phone?: string | null;
    email?: string | null;
    name?: string | null;
    company?: string | null;
    message: string;
    sourceVertical: 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general';
    purpose: 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other';
    campaignName?: string | null;
};

export async function recordAdminOutboundMessage(deps: {
    db: any;
    tables: { timelineEvents: any };
    input: AdminOutboundMessageInput;
}): Promise<{ threadId: string }> {
    const { input } = deps;
    const message = input.message.trim();
    if (message.length < 2 || message.length > 6000) throw new Error('INVALID_MESSAGE');

    const phone = input.phone?.trim() ? normalizeConversationPhone(input.phone) : null;
    if (input.phone?.trim() && !phone) throw new Error('INVALID_PHONE');
    const email = input.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
    if (input.channel === 'email' && !email) throw new Error('EMAIL_REQUIRED');
    if (input.channel !== 'email' && !phone) throw new Error('PHONE_REQUIRED');

    const threadId = input.channel === 'email'
        ? conversationThreadId('email', email!, input.sourceVertical)
        : conversationThreadId('whatsapp', phone!, input.sourceVertical);
    await recordTimelineEvent(deps.db, deps.tables.timelineEvents, {
        type: 'conversation.message_sent',
        business: { vertical: 'platform', id: PLATFORM_OPS_BUSINESS_ID },
        person: input.channel === 'email'
            ? { kind: 'email', id: email! }
            : { kind: 'opaque', id: phone! },
        subject: { kind: 'channel_thread', id: threadId },
        actor: 'admin',
        payload: {
            direction: 'outbound',
            status: 'pending',
            channel: input.channel,
            phone,
            email,
            name: input.name?.trim() || null,
            company: input.company?.trim() || null,
            message,
            sourceVertical: input.sourceVertical,
            purpose: input.purpose,
            campaignName: input.campaignName?.trim() || null,
            capturedByUserId: input.adminUserId,
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
