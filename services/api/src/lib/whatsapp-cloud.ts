import { createHmac, timingSafeEqual } from 'node:crypto';

const META_GRAPH_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION?.trim() || 'v27.0';
const DEFAULT_REMINDER_TEMPLATE = process.env.WHATSAPP_REMINDER_TEMPLATE_NAME?.trim() || 'cita_recordatorio_24h';
const DEFAULT_TEMPLATE_LANG = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG?.trim() || 'es_CL';

function resolveWhatsAppAccessToken(): string | undefined {
    return (
        process.env.WHATSAPP_ACCESS_TOKEN?.trim()
        || process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim()
        || undefined
    );
}

function resolveWhatsAppPhoneNumberId(): string | undefined {
    return (
        process.env.WHATSAPP_PHONE_NUMBER_ID_AGENDA?.trim()
        || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
        || process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim()
        || undefined
    );
}

function resolveWhatsAppWabaId(): string | undefined {
    return (
        process.env.WHATSAPP_WABA_ID_AGENDA?.trim()
        || process.env.WHATSAPP_WABA_ID?.trim()
        || undefined
    );
}

function resolveWhatsAppAppSecret(): string | undefined {
    return (
        process.env.WHATSAPP_APP_SECRET_AGENDA?.trim()
        || process.env.META_APP_SECRET_AGENDA?.trim()
        || process.env.WHATSAPP_CLOUD_APP_SECRET?.trim()
        || process.env.WHATSAPP_APP_SECRET?.trim()
        || process.env.META_APP_SECRET?.trim()
        // Simple Plataforma's Meta app ID is shared by the Instagram and
        // WhatsApp products, so both integrations use the same app secret.
        || process.env.INSTAGRAM_APP_SECRET?.trim()
        || undefined
    );
}

export function getWhatsAppWebhookVerifyToken(): string | undefined {
    return (
        process.env.WHATSAPP_VERIFY_TOKEN_AGENDA?.trim()
        || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN_AGENDA?.trim()
        || process.env.WHATSAPP_CLOUD_VERIFY_TOKEN?.trim()
        || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
        || process.env.WHATSAPP_VERIFY_TOKEN?.trim()
        || undefined
    );
}

export function isWhatsAppWebhookConfigured(): boolean {
    return Boolean(getWhatsAppWebhookVerifyToken() && resolveWhatsAppAppSecret());
}

export function isWhatsAppCloudConfigured(): boolean {
    return Boolean(
        process.env.WHATSAPP_AGENDA_ENABLED?.trim().toLowerCase() === 'true'
        && resolveWhatsAppAccessToken()
        && resolveWhatsAppPhoneNumberId()
        && isWhatsAppWebhookConfigured()
    );
}

/**
 * Normalizes a phone number into Meta Cloud API E.164 digit format (without '+').
 * Handles Chilean mobile numbers such as '+56 9 1234 5678' or '912345678'.
 */
export function normalizeWhatsAppRecipient(rawPhone?: string | null): string | null {
    if (!rawPhone) return null;
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('56') && digits.length === 11) return digits;
    if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
    if (digits.length >= 10 && digits.length <= 15) return digits;
    return null;
}

export function verifyWhatsAppWebhookSignature(rawBody: string, signatureHeader?: string | null): boolean {
    const appSecret = resolveWhatsAppAppSecret();
    if (!appSecret) return false;
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

    const receivedHex = signatureHeader.slice('sha256='.length).trim();
    if (!/^[a-f0-9]{64}$/i.test(receivedHex)) return false;

    const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
    const a = Buffer.from(receivedHex, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
}

export type WhatsAppOptOut = { from: string; messageId: string | null };

const WHATSAPP_OPTOUT_PHRASES = new Set([
    'stop',
    'unsubscribe',
    'opt out',
    'baja',
    'parar',
    'detener',
    'dejar de recibir',
    'no quiero recibir mas',
    'no quiero recibir mensajes',
    'no me escriban mas',
]);

function isWhatsAppOptOutMessage(rawText: string): boolean {
    const text = rawText
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[.!?,;:]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return WHATSAPP_OPTOUT_PHRASES.has(text)
        || /^(stop|unsubscribe|baja|parar|detener)(\s|$)/.test(text);
}

/** Extracts explicit inbound opt-out requests so future reminders can be suppressed. */
export function extractWhatsAppOptOuts(payload: unknown): WhatsAppOptOut[] {
    if (!payload || typeof payload !== 'object') return [];
    const entries = Array.isArray((payload as { entry?: unknown[] }).entry)
        ? (payload as { entry: unknown[] }).entry
        : [];
    const optOuts: WhatsAppOptOut[] = [];

    for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        const changes = Array.isArray((entry as { changes?: unknown[] }).changes)
            ? (entry as { changes: unknown[] }).changes
            : [];
        for (const change of changes) {
            if (!change || typeof change !== 'object') continue;
            const changeRecord = change as { field?: unknown; value?: Record<string, unknown> };
            // Coexistence mirrors messages sent from the Business app using the
            // `smb_message_echoes` field. They are not client replies and must
            // never be interpreted as opt-out requests.
            if (typeof changeRecord.field === 'string' && changeRecord.field !== 'messages') continue;
            const value = changeRecord.value;
            const messages = Array.isArray(value?.messages) ? value.messages : [];
            for (const message of messages) {
                if (!message || typeof message !== 'object') continue;
                const record = message as Record<string, unknown>;
                const text = (record.text as { body?: unknown } | undefined)?.body;
                if (
                    record.type !== 'text'
                    || typeof record.from !== 'string'
                    || typeof text !== 'string'
                    || !isWhatsAppOptOutMessage(text)
                ) continue;
                optOuts.push({
                    from: record.from,
                    messageId: typeof record.id === 'string' ? record.id : null,
                });
            }
        }
    }

    return optOuts;
}

/** Accepts only message or coexistence callbacks for the configured Agenda assets. */
export function isWhatsAppWebhookForConfiguredAssets(payload: unknown): boolean {
    const expectedPhoneNumberId = resolveWhatsAppPhoneNumberId();
    const expectedWabaId = resolveWhatsAppWabaId();
    if (!payload || typeof payload !== 'object') return false;
    const payloadObject = (payload as { object?: unknown }).object;
    if (payloadObject !== undefined && payloadObject !== 'whatsapp_business_account') return false;
    const entries = Array.isArray((payload as { entry?: unknown[] }).entry)
        ? (payload as { entry: unknown[] }).entry
        : [];
    let receivedConfiguredAsset = false;

    for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        const entryRecord = entry as { id?: unknown; changes?: unknown[] };
        const changes = Array.isArray((entry as { changes?: unknown[] }).changes)
            ? (entry as { changes: unknown[] }).changes
            : [];
        for (const change of changes) {
            if (!change || typeof change !== 'object') continue;
            const changeRecord = change as { field?: unknown; value?: Record<string, unknown> };
            const field = typeof changeRecord.field === 'string' ? changeRecord.field : '';
            const value = changeRecord.value;

            if (field === 'messages') {
                const metadata = value?.metadata as { phone_number_id?: unknown } | undefined;
                if (
                    !expectedPhoneNumberId
                    || typeof metadata?.phone_number_id !== 'string'
                    || metadata.phone_number_id !== expectedPhoneNumberId
                ) return false;

                if (expectedWabaId && entryRecord.id !== expectedWabaId) return false;
                receivedConfiguredAsset = true;
                continue;
            }

            // Preserve compatibility with legacy webhook payloads that were
            // constructed without Meta's `object` and `field` envelope fields.
            if (!field) {
                const metadata = value?.metadata as { phone_number_id?: unknown } | undefined;
                if (
                    !expectedPhoneNumberId
                    || typeof metadata?.phone_number_id !== 'string'
                    || metadata.phone_number_id !== expectedPhoneNumberId
                ) return false;
                receivedConfiguredAsset = true;
                continue;
            }

            // Meta sends these fields for WhatsApp Business app + Cloud API
            // coexistence. account_update identifies the shared WABA inside
            // `waba_info`; the other three use the WABA as entry.id.
            if (['account_update', 'history', 'smb_app_state_sync', 'smb_message_echoes'].includes(field)) {
                const wabaInfo = value?.waba_info as { waba_id?: unknown } | undefined;
                const eventWabaId = typeof wabaInfo?.waba_id === 'string'
                    ? wabaInfo.waba_id
                    : entryRecord.id;
                if (!expectedWabaId || eventWabaId !== expectedWabaId) return false;
                receivedConfiguredAsset = true;
                continue;
            }

            // A subscribed WABA event may not have message metadata. For an
            // unrecognized field, trust only the already-configured WABA ID;
            // the downstream message parsers ignore this event safely.
            if (!expectedWabaId || entryRecord.id !== expectedWabaId) return false;
            receivedConfiguredAsset = true;
        }
    }

    return receivedConfiguredAsset;
}

/** @deprecated Use isWhatsAppWebhookForConfiguredAssets. */
export const isWhatsAppWebhookForConfiguredPhoneNumber = isWhatsAppWebhookForConfiguredAssets;

export type WhatsAppButtonAction = {
    action: 'confirm' | 'cancel';
    appointmentId: string;
    from: string | null;
    messageId: string | null;
};

/**
 * Extracts appointment confirmation/cancellation actions from Meta Cloud API webhook payloads.
 */
export function extractWhatsAppButtonActions(payload: unknown): WhatsAppButtonAction[] {
    if (!payload || typeof payload !== 'object') return [];
    const entries = Array.isArray((payload as { entry?: unknown[] }).entry)
        ? (payload as { entry: unknown[] }).entry
        : [];
    const actions: WhatsAppButtonAction[] = [];

    for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        const changes = Array.isArray((entry as { changes?: unknown[] }).changes)
            ? (entry as { changes: unknown[] }).changes
            : [];
        for (const change of changes) {
            if (!change || typeof change !== 'object') continue;
            const changeRecord = change as { field?: unknown; value?: Record<string, unknown> };
            // Do not act on `smb_message_echoes`: it contains messages sent by
            // the business through its WhatsApp Business app, not client input.
            if (typeof changeRecord.field === 'string' && changeRecord.field !== 'messages') continue;
            const value = changeRecord.value;
            const messages = Array.isArray(value?.messages) ? value.messages : [];
            for (const msg of messages) {
                if (!msg || typeof msg !== 'object') continue;
                const record = msg as Record<string, unknown>;
                const buttonPayload =
                    (record.button as { payload?: unknown } | undefined)?.payload
                    ?? (record.interactive as { button_reply?: { id?: unknown } } | undefined)?.button_reply?.id;
                if (typeof buttonPayload !== 'string') continue;

                const confirmMatch = /^CONFIRM_APPT:([0-9a-f-]{36})$/i.exec(buttonPayload.trim());
                if (confirmMatch) {
                    actions.push({
                        action: 'confirm',
                        appointmentId: confirmMatch[1],
                        from: typeof record.from === 'string' ? record.from : null,
                        messageId: typeof record.id === 'string' ? record.id : null,
                    });
                    continue;
                }
                const cancelMatch = /^CANCEL_APPT:([0-9a-f-]{36})$/i.exec(buttonPayload.trim());
                if (cancelMatch) {
                    actions.push({
                        action: 'cancel',
                        appointmentId: cancelMatch[1],
                        from: typeof record.from === 'string' ? record.from : null,
                        messageId: typeof record.id === 'string' ? record.id : null,
                    });
                }
            }
        }
    }

    return actions;
}

export async function sendAppointmentReminderWhatsApp(input: {
    appointmentId: string;
    toPhone: string;
    clientName: string;
    professionalName: string;
    serviceName?: string | null;
    whenLabel: string;
    locationLabel: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const token = resolveWhatsAppAccessToken();
    const phoneNumberId = resolveWhatsAppPhoneNumberId();
    if (!token || !phoneNumberId || !isWhatsAppCloudConfigured()) {
        return { ok: false, error: 'WhatsApp Cloud API de Agenda no está habilitada o su configuración está incompleta' };
    }

    const to = normalizeWhatsAppRecipient(input.toPhone);
    if (!to) {
        return { ok: false, error: 'Número de teléfono inválido para WhatsApp' };
    }

    const endpoint = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`;
    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
            name: DEFAULT_REMINDER_TEMPLATE,
            language: { code: DEFAULT_TEMPLATE_LANG },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: input.clientName.slice(0, 60) },
                        { type: 'text', text: input.professionalName.slice(0, 60) },
                        { type: 'text', text: (input.serviceName || 'tu cita').slice(0, 80) },
                        { type: 'text', text: input.whenLabel.slice(0, 60) },
                        { type: 'text', text: input.locationLabel.slice(0, 100) },
                    ],
                },
                {
                    type: 'button',
                    sub_type: 'quick_reply',
                    index: '0',
                    parameters: [{ type: 'payload', payload: `CONFIRM_APPT:${input.appointmentId}` }],
                },
                {
                    type: 'button',
                    sub_type: 'quick_reply',
                    index: '1',
                    parameters: [{ type: 'payload', payload: `CANCEL_APPT:${input.appointmentId}` }],
                },
            ],
        },
    };

    let res: Response;
    try {
        res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15_000),
        });
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error && error.name === 'TimeoutError'
                ? 'Meta tardó demasiado en responder al envío de WhatsApp'
                : 'No fue posible conectar con WhatsApp Cloud API',
        };
    }

    const data = await res.json().catch(() => ({})) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
    };

    if (!res.ok) {
        return {
            ok: false,
            error: data.error?.message || `Meta API HTTP ${res.status}`,
        };
    }

    return {
        ok: true,
        messageId: data.messages?.[0]?.id,
    };
}
