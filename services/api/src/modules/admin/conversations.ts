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
    'crm.contact_created',
    'crm.contact_updated',
    'crm.activity_logged',
] as const satisfies readonly TimelineEventType[];

export type AdminConversationActivity = {
    id: string;
    direction: 'inbound' | 'outbound' | 'status' | 'activity';
    kind: string | null;
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
    relatedVerticals: string[];
    capturedByUserId: string | null;
    origin: string | null;
    originDetail: string | null;
    referredBy: string | null;
    relationshipContext: string | null;
    contactStage: string;
    nextAction: string | null;
    nextFollowUpDate: string | null;
    notes: string | null;
    followUpDue: boolean;
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
    followUpDueCount: number;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function isValidDateOnly(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day!));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

function chileDateString(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
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

export function conversationThreadId(channel: string, recipient: string): string {
    if (channel === 'email') return `contact:email:${recipient.trim().toLowerCase()}`;
    const phone = normalizeConversationPhone(recipient) ?? recipient.trim();
    return `contact:phone:${phone}`;
}

type TimelineRow = {
    id: string;
    type: string;
    occurredAt: Date;
    personId: string | null;
    subjectId: string;
    payload: Record<string, unknown> | null;
};

const LEGACY_THREAD_VERTICALS = new Set(['agenda', 'propiedades', 'autos', 'serenatas', 'platform', 'general']);

function normalizedEmail(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}

function identityTokensFromPayload(payload: Record<string, unknown>): string[] {
    const tokens = new Set<string>();
    const phone = typeof payload.phone === 'string' ? normalizeConversationPhone(payload.phone) : null;
    const email = normalizedEmail(payload.email);
    if (phone) tokens.add(`phone:${phone}`);
    if (email) tokens.add(`email:${email}`);
    return [...tokens];
}

function identityTokensForThread(threadId: string, rows: TimelineRow[]): string[] {
    const tokens = new Set<string>();
    const addPhone = (value: unknown) => {
        if (typeof value !== 'string') return;
        const phone = normalizeConversationPhone(value);
        if (phone) tokens.add(`phone:${phone}`);
    };
    const addEmail = (value: unknown) => {
        const email = normalizedEmail(value);
        if (email) tokens.add(`email:${email}`);
    };

    for (const row of rows) {
        identityTokensFromPayload(asRecord(row.payload)).forEach((token) => tokens.add(token));
    }

    const canonical = /^contact:(phone|email):(.+)$/.exec(threadId);
    if (canonical?.[1] === 'phone') addPhone(canonical[2]);
    if (canonical?.[1] === 'email') addEmail(canonical[2]);
    if (threadId.startsWith('whatsapp:')) addPhone(threadId.split(':')[1]);
    if (threadId.startsWith('email:')) {
        const parts = threadId.split(':');
        const last = parts.at(-1) ?? '';
        const valueParts = LEGACY_THREAD_VERTICALS.has(last) ? parts.slice(1, -1) : parts.slice(1);
        addEmail(valueParts.join(':'));
    }
    return [...tokens];
}

function groupTimelineRowsByContact(rows: TimelineRow[]): Array<{ threadId: string; events: TimelineRow[] }> {
    const bySubject = new Map<string, TimelineRow[]>();
    for (const row of rows) {
        const subjectId = row.subjectId || row.personId;
        if (!subjectId) continue;
        const events = bySubject.get(subjectId) ?? [];
        events.push(row);
        bySubject.set(subjectId, events);
    }

    const parent = new Map<string, string>();
    const find = (token: string): string => {
        const current = parent.get(token);
        if (!current) { parent.set(token, token); return token; }
        if (current === token) return token;
        const root = find(current);
        parent.set(token, root);
        return root;
    };
    const union = (a: string, b: string) => {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) parent.set(rootB, rootA);
    };

    const tokensBySubject = new Map<string, string[]>();
    for (const [subjectId, events] of bySubject) {
        const tokens = identityTokensForThread(subjectId, events);
        tokensBySubject.set(subjectId, tokens);
        if (tokens.length > 0) {
            find(tokens[0]!);
            for (const token of tokens.slice(1)) union(tokens[0]!, token);
        }
    }

    const eventsByRoot = new Map<string, TimelineRow[]>();
    const tokensByRoot = new Map<string, Set<string>>();
    const fallbackSubjectByRoot = new Map<string, string>();
    for (const [subjectId, events] of bySubject) {
        const tokens = tokensBySubject.get(subjectId) ?? [];
        const root = tokens.length ? find(tokens[0]!) : `subject:${subjectId}`;
        const group = eventsByRoot.get(root) ?? [];
        group.push(...events);
        eventsByRoot.set(root, group);
        if (!fallbackSubjectByRoot.has(root)) fallbackSubjectByRoot.set(root, subjectId);
        const rootTokens = tokensByRoot.get(root) ?? new Set<string>();
        tokens.forEach((token) => rootTokens.add(token));
        tokensByRoot.set(root, rootTokens);
    }

    return [...eventsByRoot].map(([root, events]) => {
        const tokens = [...(tokensByRoot.get(root) ?? [])];
        const phone = tokens.filter((token) => token.startsWith('phone:')).map((token) => token.slice(6)).sort()[0];
        const email = tokens.filter((token) => token.startsWith('email:')).map((token) => token.slice(6)).sort()[0];
        const threadId = phone ? `contact:phone:${phone}` : email ? `contact:email:${email}` : fallbackSubjectByRoot.get(root)!;
        return { threadId, events };
    });
}

function buildConversationItems(rows: TimelineRow[]): AdminConversationItem[] {
    const now = Date.now();
    const items: AdminConversationItem[] = [];

    for (const { threadId, events } of groupTimelineRowsByContact(rows)) {
        events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
        const latest = events[events.length - 1]!;
        const latestPayload = asRecord(latest.payload);
        const statusEvent = [...events].reverse().find((event) => {
            const value = asString(asRecord(event.payload).status);
            return value === 'pending' || value === 'done';
        });
        const statusPayload = asRecord(statusEvent?.payload);
        const status: ConversationThreadStatus = asString(statusPayload.status) === 'pending' ? 'pending' : 'done';
        const pendingEvent = [...events].reverse().find((event) => asString(asRecord(event.payload).status) === 'pending');
        const openSince = status === 'pending' ? (pendingEvent ?? events[0]!).occurredAt : (statusEvent ?? latest).occurredAt;
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
        const contactData: Record<string, unknown> = {};
        for (const event of events) {
            const payload = asRecord(event.payload);
            for (const key of ['phone', 'name', 'email', 'company']) {
                const canClear = event.type === 'crm.contact_created' || event.type === 'crm.contact_updated';
                if (hasOwn(payload, key) && (canClear || payload[key] !== null)) contactData[key] = payload[key];
            }
        }
        const contactPayload = { ...inboundPayload, ...contactData };
        const payloadsNewestFirst = [...events].reverse().map((event) => asRecord(event.payload));
        const verticalPayload = payloadsNewestFirst.find((payload) => asString(payload.sourceVertical)) ?? contactPayload;
        const purposePayload = payloadsNewestFirst.find((payload) => asString(payload.purpose)) ?? contactPayload;
        const campaignPayload = payloadsNewestFirst.find((payload) => asString(payload.campaignName)) ?? contactPayload;
        const contactFields: Record<string, unknown> = {
            sourceVertical: null,
            purpose: null,
            campaignName: null,
            origin: null,
            originDetail: null,
            referredBy: null,
            relationshipContext: null,
            contactStage: 'new',
            nextAction: null,
            nextFollowUpDate: null,
            notes: null,
        };
        const contactProfileKeys = new Set<string>();
        for (const event of events) {
            const payload = asRecord(event.payload);
            if (event.type === 'crm.contact_created' || event.type === 'crm.contact_updated') {
                for (const key of Object.keys(contactFields)) {
                    if (hasOwn(payload, key)) {
                        contactFields[key] = payload[key];
                        contactProfileKeys.add(key);
                    }
                }
            }
            if (event.type === 'crm.activity_logged') {
                if (hasOwn(payload, 'nextAction')) contactFields.nextAction = payload.nextAction;
                if (hasOwn(payload, 'nextFollowUpDate')) contactFields.nextFollowUpDate = payload.nextFollowUpDate;
            }
        }
        const activityEvents = events;
        const lastInteraction = [...activityEvents].reverse().find((event) =>
            event.type === 'whatsapp.manual'
            || event.type === 'channel.inbound'
            || event.type === 'conversation.message_sent'
            || event.type === 'conversation.status_changed'
            || event.type === 'crm.activity_logged'
            || event.type === 'crm.contact_created'
        ) ?? latest;
        const lastInteractionPayload = asRecord(lastInteraction.payload);
        const nextAction = asString(contactFields.nextAction);
        const nextFollowUpDate = asString(contactFields.nextFollowUpDate);
        const relatedVerticals = [...new Set(events
            .map((event) => asString(asRecord(event.payload).sourceVertical))
            .filter((vertical): vertical is string => Boolean(vertical)))];

        items.push({
            threadId,
            channel: asString(lastMessagePayload.channel) || asString(latestPayload.channel) || asString(outboundPayload.channel) || 'whatsapp',
            status,
            phone: asString(contactPayload.phone),
            name: asString(contactPayload.name),
            email: asString(contactPayload.email),
            company: asString(contactPayload.company),
            lastMessage: asString(lastInteractionPayload.message)
                || asString(lastInteractionPayload.summary)
                || asString(lastMessagePayload.message)
                || asString(latestPayload.message)
                || asString(latestPayload.note),
            sourceVertical: contactProfileKeys.has('sourceVertical')
                ? asString(contactFields.sourceVertical)
                : asString(verticalPayload.sourceVertical),
            relatedVerticals,
            purpose: contactProfileKeys.has('purpose') ? asString(contactFields.purpose) : asString(purposePayload.purpose),
            campaignName: contactProfileKeys.has('campaignName')
                ? asString(contactFields.campaignName)
                : asString(campaignPayload.campaignName),
            activities: activityEvents.slice().reverse().map((event) => {
                const payload = asRecord(event.payload);
                const isProfileEvent = event.type === 'crm.contact_created' || event.type === 'crm.contact_updated';
                const direction: AdminConversationActivity['direction'] = event.type === 'conversation.message_sent'
                    ? 'outbound'
                    : event.type === 'conversation.status_changed' ? 'status'
                        : isProfileEvent ? 'activity'
                        : event.type === 'crm.activity_logged'
                            ? (asString(payload.direction) === 'inbound' || asString(payload.direction) === 'outbound'
                                ? asString(payload.direction) as 'inbound' | 'outbound'
                                : 'activity')
                            : 'inbound';
                const statusMessage = event.type === 'conversation.status_changed'
                    ? asString(payload.note) || (asString(payload.status) === 'done' ? 'Conversación marcada como respondida.' : 'Conversación reabierta.')
                    : null;
                return {
                    id: event.id,
                    direction,
                    kind: asString(payload.activityType) || (isProfileEvent ? event.type : null),
                    channel: asString(payload.channel),
                    message: asString(payload.message) || asString(payload.summary) || statusMessage
                        || (event.type === 'crm.contact_created' ? 'Contacto registrado en SimpleAdmin.' : null)
                        || (event.type === 'crm.contact_updated' ? 'Ficha de contacto actualizada.' : null),
                    sourceVertical: asString(payload.sourceVertical),
                    purpose: asString(payload.purpose),
                    campaignName: asString(payload.campaignName),
                    occurredAt: event.occurredAt.toISOString(),
                };
            }),
            capturedByUserId: asString(inboundPayload.capturedByUserId),
            origin: asString(contactFields.origin),
            originDetail: asString(contactFields.originDetail),
            referredBy: asString(contactFields.referredBy),
            relationshipContext: asString(contactFields.relationshipContext),
            contactStage: asString(contactFields.contactStage) || 'new',
            nextAction,
            nextFollowUpDate,
            notes: asString(contactFields.notes),
            followUpDue: Boolean(nextFollowUpDate && nextFollowUpDate <= chileDateString()),
            occurredAt: latest.occurredAt.toISOString(),
            pendingSince: openSince.toISOString(),
            hoursPending: Math.round(hoursPending * 10) / 10,
            overdue24h: status === 'pending' && hoursPending >= 24,
            eventCount: activityEvents.length,
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
        followUpDueCount: items.filter((item) => item.followUpDue).length,
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
            ? all.filter((item) => item.relatedVerticals.length === 0)
            : all.filter((item) => item.relatedVerticals.includes(vertical) || item.sourceVertical === vertical);
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
        ? conversationThreadId('email', email!)
        : conversationThreadId('whatsapp', phone!);
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
        ? conversationThreadId('email', email!)
        : conversationThreadId('whatsapp', phone!);
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

export type AdminContactProfileInput = {
    name?: string | null;
    email?: string | null;
    company?: string | null;
    sourceVertical?: 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general' | null;
    purpose?: 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other' | null;
    campaignName?: string | null;
    origin?: string | null;
    originDetail?: string | null;
    referredBy?: string | null;
    relationshipContext?: string | null;
    contactStage?: 'new' | 'contacted' | 'registered' | 'setup_pending' | 'activated' | 'first_booking' | 'paid' | 'paused' | 'closed' | null;
    nextAction?: string | null;
    nextFollowUpDate?: string | null;
    notes?: string | null;
};

export type AdminContactCreateInput = AdminContactProfileInput & {
    channel: 'whatsapp_personal' | 'whatsapp_business' | 'email';
    phone?: string | null;
    email?: string | null;
};

const CONTACT_STAGE_VALUES = new Set([
    'new', 'contacted', 'registered', 'setup_pending', 'activated', 'first_booking', 'paid', 'paused', 'closed',
]);
const CONTACT_ORIGIN_VALUES = new Set([
    'unknown', 'instagram', 'facebook', 'whatsapp', 'website', 'referral', 'personal_network', 'organic_search', 'direct', 'other',
]);

const CONTACT_TEXT_LIMITS: Record<string, number> = {
    name: 160,
    company: 160,
    origin: 120,
    originDetail: 180,
    referredBy: 120,
    relationshipContext: 500,
    campaignName: 160,
    nextAction: 500,
    notes: 3000,
};

function normalizeContactText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;
    const clean = value.trim();
    if (!clean) return null;
    if (clean.length > maxLength) throw new Error('CONTACT_FIELD_TOO_LONG');
    return clean;
}

function normalizeContactEmail(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
    return email;
}

function normalizeContactProfile(input: AdminContactProfileInput): Record<string, unknown> {
    const profile: Record<string, unknown> = {};
    for (const [key, maxLength] of Object.entries(CONTACT_TEXT_LIMITS)) {
        if (Object.prototype.hasOwnProperty.call(input, key)) profile[key] = normalizeContactText((input as Record<string, unknown>)[key], maxLength);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'email')) profile.email = normalizeContactEmail(input.email);
    if (Object.prototype.hasOwnProperty.call(input, 'origin')) {
        const origin = typeof input.origin === 'string' ? input.origin.trim() : '';
        if (origin && !CONTACT_ORIGIN_VALUES.has(origin)) throw new Error('INVALID_CONTACT_ORIGIN');
        profile.origin = origin || null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'sourceVertical')) profile.sourceVertical = input.sourceVertical || null;
    if (Object.prototype.hasOwnProperty.call(input, 'purpose')) profile.purpose = input.purpose || null;
    if (Object.prototype.hasOwnProperty.call(input, 'contactStage')) {
        const stage = input.contactStage || null;
        if (stage && !CONTACT_STAGE_VALUES.has(stage)) throw new Error('INVALID_CONTACT_STAGE');
        profile.contactStage = stage ?? 'new';
    }
    if (typeof input.nextFollowUpDate !== 'undefined') {
        const date = input.nextFollowUpDate?.trim() || null;
        if (date && !isValidDateOnly(date)) throw new Error('INVALID_FOLLOW_UP_DATE');
        profile.nextFollowUpDate = date;
    }
    return profile;
}

function contactRef(threadId: string) {
    return {
        business: { vertical: 'platform' as const, id: PLATFORM_OPS_BUSINESS_ID },
        person: { kind: 'opaque' as const, id: threadId },
        subject: { kind: 'channel_thread' as const, id: threadId },
        actor: 'admin' as const,
    };
}

export async function createAdminContact(deps: {
    db: any;
    eq: any;
    and: any;
    inArray: any;
    desc: any;
    tables: { timelineEvents: any };
    adminUserId: string;
    input: AdminContactCreateInput;
}): Promise<{ threadId: string; created: boolean }> {
    const input = deps.input;
    const phone = input.phone?.trim() ? normalizeConversationPhone(input.phone) : null;
    if (input.phone?.trim() && !phone) throw new Error('INVALID_PHONE');
    const email = normalizeContactEmail(input.email);
    if (input.channel === 'email' && !email) throw new Error('EMAIL_REQUIRED');
    if (input.channel !== 'email' && !phone) throw new Error('PHONE_REQUIRED');

    const identity = input.channel === 'email' ? email! : phone!;
    const requestedTokens = new Set(identityTokensFromPayload({ phone, email }));
    const recentEvents = await deps.db
        .select({ subjectId: deps.tables.timelineEvents.subjectId, payload: deps.tables.timelineEvents.payload })
        .from(deps.tables.timelineEvents)
        .where(deps.and(
            deps.eq(deps.tables.timelineEvents.vertical, 'platform'),
            deps.eq(deps.tables.timelineEvents.businessId, PLATFORM_OPS_BUSINESS_ID),
            deps.inArray(deps.tables.timelineEvents.type, [...CONVERSATION_EVENT_TYPES]),
        ))
        .orderBy(deps.desc(deps.tables.timelineEvents.occurredAt))
        .limit(5000);
    const existing = recentEvents.find((row: { subjectId: string; payload: Record<string, unknown> | null }) => {
        const tokens = new Set([
            ...identityTokensFromPayload(asRecord(row.payload)),
            ...identityTokensForThread(row.subjectId, []),
        ]);
        return [...requestedTokens].some((token) => tokens.has(token));
    });
    const threadId = existing?.subjectId || (input.channel === 'email'
        ? conversationThreadId('email', identity)
        : conversationThreadId('whatsapp', identity));
    const isNew = !existing;
    const profileInput: AdminContactProfileInput = isNew ? { ...input } : {};
    if (isNew && typeof input.email !== 'undefined') profileInput.email = email;
    if (!isNew) {
        const mergeableTextFields = ['name', 'company', 'originDetail', 'referredBy', 'relationshipContext', 'campaignName', 'nextAction', 'notes'] as const;
        for (const key of mergeableTextFields) {
            const value = input[key];
            if (typeof value === 'string' && value.trim()) profileInput[key] = value;
        }
        if (input.sourceVertical) profileInput.sourceVertical = input.sourceVertical;
        if (input.origin && input.origin !== 'unknown') profileInput.origin = input.origin;
        if (input.contactStage && input.contactStage !== 'new') profileInput.contactStage = input.contactStage;
        if (input.purpose && input.purpose !== 'follow_up') profileInput.purpose = input.purpose;
        if (input.nextFollowUpDate) profileInput.nextFollowUpDate = input.nextFollowUpDate;
    }
    if (isNew && !profileInput.contactStage) profileInput.contactStage = 'new';
    const profile = normalizeContactProfile(profileInput);
    await recordTimelineEvent(deps.db, deps.tables.timelineEvents, {
        type: isNew ? 'crm.contact_created' : 'crm.contact_updated',
        ...contactRef(threadId),
        payload: {
            ...(isNew ? { status: 'done', channel: input.channel } : {}),
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
            ...profile,
            capturedByUserId: deps.adminUserId,
        },
    });
    return { threadId, created: isNew };
}

export async function updateAdminContact(deps: {
    db: any;
    tables: { timelineEvents: any };
    adminUserId: string;
    threadId: string;
    input: AdminContactProfileInput;
}): Promise<void> {
    const threadId = deps.threadId.trim();
    if (!threadId || threadId.length > 400) throw new Error('INVALID_THREAD');
    const profile = normalizeContactProfile(deps.input);
    if (Object.keys(profile).length === 0) throw new Error('EMPTY_CONTACT_UPDATE');
    await recordTimelineEvent(deps.db, deps.tables.timelineEvents, {
        type: 'crm.contact_updated',
        ...contactRef(threadId),
        payload: { ...profile, updatedByUserId: deps.adminUserId },
    });
}

export type AdminContactActivityInput = {
    activityType: 'message_inbound' | 'message_outbound' | 'call' | 'meeting' | 'support' | 'note' | 'other';
    channel: 'whatsapp_personal' | 'whatsapp_business' | 'email' | 'instagram_dm' | 'phone' | 'meeting' | 'other';
    summary: string;
    nextAction?: string | null;
    nextFollowUpDate?: string | null;
};

export async function recordAdminContactActivity(deps: {
    db: any;
    tables: { timelineEvents: any };
    adminUserId: string;
    threadId: string;
    input: AdminContactActivityInput;
}): Promise<void> {
    const threadId = deps.threadId.trim();
    const summary = deps.input.summary.trim();
    if (!threadId || threadId.length > 400) throw new Error('INVALID_THREAD');
    if (!summary || summary.length > 6000) throw new Error('INVALID_ACTIVITY_SUMMARY');
    const nextAction = typeof deps.input.nextAction === 'string'
        ? normalizeContactText(deps.input.nextAction, CONTACT_TEXT_LIMITS.nextAction!)
        : undefined;
    const nextFollowUpDate = typeof deps.input.nextFollowUpDate === 'string'
        ? (deps.input.nextFollowUpDate.trim() || null)
        : undefined;
    if (nextFollowUpDate && !isValidDateOnly(nextFollowUpDate)) throw new Error('INVALID_FOLLOW_UP_DATE');
    const direction = deps.input.activityType === 'message_inbound'
        ? 'inbound'
        : deps.input.activityType === 'message_outbound' ? 'outbound' : 'activity';
    await recordTimelineEvent(deps.db, deps.tables.timelineEvents, {
        type: 'crm.activity_logged',
        ...contactRef(threadId),
        payload: {
            ...(direction === 'activity' ? {} : { status: 'pending' }),
            direction,
            activityType: deps.input.activityType,
            channel: deps.input.channel,
            summary,
            ...(typeof nextAction !== 'undefined' ? { nextAction } : {}),
            ...(typeof nextFollowUpDate !== 'undefined' ? { nextFollowUpDate } : {}),
            loggedByUserId: deps.adminUserId,
        },
    });
}

export async function updateConversationStatus(deps: {
    db: any;
    tables: { timelineEvents: any };
    adminUserId: string;
    threadId: string;
    status: ConversationThreadStatus;
    note?: string | null;
}): Promise<void> {
    const channel = deps.threadId.startsWith('contact:email:')
        ? 'email'
        : deps.threadId.startsWith('contact:phone:')
            ? 'whatsapp'
            : deps.threadId.includes(':') ? deps.threadId.split(':')[0]! : 'whatsapp';
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
