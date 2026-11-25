import { createHmac, timingSafeEqual } from 'node:crypto';

const META_GRAPH_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION?.trim() || 'v21.0';
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

function resolveWhatsAppAppSecret(): string | undefined {
    return (
        process.env.WHATSAPP_CLOUD_APP_SECRET?.trim()
        || process.env.WHATSAPP_APP_SECRET?.trim()
        || process.env.META_APP_SECRET?.trim()
        || undefined
    );
}

export function isWhatsAppCloudConfigured(): boolean {
    return Boolean(resolveWhatsAppAccessToken() && resolveWhatsAppPhoneNumberId());
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
    if (!appSecret) return true;
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

    const receivedHex = signatureHeader.slice('sha256='.length).trim();
    if (!/^[a-f0-9]{64}$/i.test(receivedHex)) return false;

    const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
    const a = Buffer.from(receivedHex, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
}

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
            const value = (change as { value?: Record<string, unknown> }).value;
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
    if (!token || !phoneNumberId) {
        return { ok: false, error: 'WhatsApp Cloud API no configurada' };
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

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

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
