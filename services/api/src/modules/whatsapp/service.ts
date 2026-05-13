/**
 * WhatsApp Cloud API (Meta) helper — shared across all Simple verticals
 *
 * Architecture:
 *   One Meta App → one WABA → one Phone Number ID per vertical
 *   All verticals share the same WHATSAPP_ACCESS_TOKEN (system user token).
 *   Each vertical has its own WHATSAPP_PHONE_NUMBER_ID_* so messages come
 *   from a branded number (SimpleAgenda, SimpleAutos, SimplePropiedades).
 *
 * Env vars:
 *   WHATSAPP_ACCESS_TOKEN               — system user token (shared)
 *   WHATSAPP_PHONE_NUMBER_ID_AGENDA     — SimpleAgenda number
 *   WHATSAPP_PHONE_NUMBER_ID_AUTOS      — SimpleAutos number
 *   WHATSAPP_PHONE_NUMBER_ID_PROPIEDADES — SimplePropiedades number
 *   WHATSAPP_PHONE_NUMBER_ID            — fallback / default number
 *
 * Templates (approved in Meta Business Manager, per vertical):
 *   SimpleAgenda:
 *     simpleagenda_confirmacion       — cita confirmada
 *     simpleagenda_recordatorio_24h   — recordatorio día anterior
 *     simpleagenda_recordatorio_30min — recordatorio 30 min antes
 *     simpleagenda_cancelacion        — cita cancelada
 */

import { fmtDateTz, fmtTime } from '@simple/utils';
import { logger } from '@simple/logger';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

import type { VerticalType } from '@simple/types';
export type WaVertical = VerticalType;

function getPhoneNumberId(vertical?: WaVertical): string | null {
    if (vertical === 'agenda')       return process.env.WHATSAPP_PHONE_NUMBER_ID_AGENDA    ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
    if (vertical === 'autos')        return process.env.WHATSAPP_PHONE_NUMBER_ID_AUTOS     ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
    if (vertical === 'propiedades')  return process.env.WHATSAPP_PHONE_NUMBER_ID_PROPIEDADES ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
    return process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
}

function isConfigured(vertical?: WaVertical): boolean {
    return !!(process.env.WHATSAPP_ACCESS_TOKEN && getPhoneNumberId(vertical));
}

/** Normalize a Chilean phone number to E.164 format: +56912345678 */
function normalizePhone(raw: string): string | null {
    // Strip everything except digits and leading +
    let digits = raw.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    // If it starts with 56 (Chile country code) it's already correct
    if (digits.startsWith('56') && digits.length >= 11) return digits;
    // If it starts with 9 (mobile) or 2 (landline), prepend 56
    if (digits.startsWith('9') && digits.length === 9) return `56${digits}`;
    if (digits.length >= 8) return `56${digits}`;
    return null;
}

async function sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    bodyParams: string[],
    vertical: WaVertical = 'agenda',
): Promise<void> {
    if (!isConfigured(vertical)) return;

    const phoneNumberId = getPhoneNumberId(vertical)!;
    const normalized = normalizePhone(to);
    if (!normalized) {
        logger.warn('[whatsapp] Invalid phone number', { to });
        return;
    }

    const body = {
        messaging_product: 'whatsapp',
        to: normalized,
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode },
            components: [
                {
                    type: 'body',
                    parameters: bodyParams.map((text) => ({ type: 'text', text })),
                },
            ],
        },
    };

    try {
        const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error(`[whatsapp] Template "${templateName}" failed:`, err);
        }
    } catch (e) {
        console.error('[whatsapp] Fetch error:', e);
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type WaAppointmentInfo = {
    clientName: string | null;
    clientPhone: string | null;
    startsAt: Date;
    endsAt: Date;
    seriesCount?: number | null;
    seriesFrequency?: 'weekly' | 'biweekly' | 'monthly' | null;
};

function seriesSuffix(info: { seriesCount?: number | null; seriesFrequency?: 'weekly' | 'biweekly' | 'monthly' | null }): string {
    const count = info.seriesCount ?? 0;
    if (count <= 1) return '';
    const freq = info.seriesFrequency === 'weekly' ? 'semanales'
        : info.seriesFrequency === 'biweekly' ? 'quincenales'
        : info.seriesFrequency === 'monthly' ? 'mensuales'
        : 'recurrentes';
    return ` · ${count} sesiones ${freq}`;
}

export type WaProfessionalInfo = {
    displayName: string | null;
    timezone: string;
    cancellationHours: number;
};

/**
 * Notifica al paciente que su cita fue confirmada.
 * Template: simpleagenda_confirmacion
 * Params: [clientName, professionalName, date, time, cancelUrl]
 */
export async function notifyConfirmation(
    appt: WaAppointmentInfo & { id?: string; slug?: string; meetingUrl?: string | null },
    prof: WaProfessionalInfo,
): Promise<void> {
    if (!appt.clientPhone) return;
    const appUrl = process.env.AGENDA_APP_URL ?? 'https://simpleagenda.app';
    const cancelUrl = appt.id ? `${appUrl}/cancelar?appt=${appt.id}&slug=${appt.slug ?? ''}` : '';
    const nameWithSeries = (appt.clientName ?? 'Paciente') + seriesSuffix(appt);
    await sendTemplate(
        appt.clientPhone,
        'simpleagenda_confirmacion',
        'es',
        [
            nameWithSeries,
            prof.displayName ?? 'el profesional',
            fmtDateTz(appt.startsAt, prof.timezone),
            fmtTime(appt.startsAt, prof.timezone),
            cancelUrl,
            appt.meetingUrl ?? '',
        ],
        'agenda',
    );
}

/**
 * Recordatorio 24 horas antes.
 * Template: simpleagenda_recordatorio_24h
 * Params: [clientName, professionalName, time, cancellationHours]
 */
export async function notifyReminder24h(
    appt: WaAppointmentInfo,
    prof: WaProfessionalInfo,
): Promise<void> {
    if (!appt.clientPhone) return;
    await sendTemplate(
        appt.clientPhone,
        'simpleagenda_recordatorio_24h',
        'es',
        [
            appt.clientName ?? 'Paciente',
            prof.displayName ?? 'el profesional',
            fmtTime(appt.startsAt, prof.timezone),
            String(prof.cancellationHours),
        ],
        'agenda',
    );
}

/**
 * Recordatorio 30 minutos antes.
 * Template: simpleagenda_recordatorio_30min
 * Params: [clientName, professionalName, time]
 */
export async function notifyReminder30min(
    appt: WaAppointmentInfo,
    prof: WaProfessionalInfo,
): Promise<void> {
    if (!appt.clientPhone) return;
    await sendTemplate(
        appt.clientPhone,
        'simpleagenda_recordatorio_30min',
        'es',
        [
            appt.clientName ?? 'Paciente',
            prof.displayName ?? 'el profesional',
            fmtTime(appt.startsAt, prof.timezone),
        ],
        'agenda',
    );
}

/**
 * Notifica al paciente que su cita fue cancelada.
 * Template: simpleagenda_cancelacion
 * Params: [clientName, professionalName, date, time]
 */
export async function notifyCancellation(
    appt: WaAppointmentInfo,
    prof: WaProfessionalInfo,
): Promise<void> {
    if (!appt.clientPhone) return;
    await sendTemplate(
        appt.clientPhone,
        'simpleagenda_cancelacion',
        'es',
        [
            appt.clientName ?? 'Paciente',
            prof.displayName ?? 'el profesional',
            fmtDateTz(appt.startsAt, prof.timezone),
            fmtTime(appt.startsAt, prof.timezone),
        ],
        'agenda',
    );
}

/**
 * Alerta al profesional cuando se agenda una nueva cita.
 * Template: simpleagenda_alerta_profesional
 * Params: [professionalName, clientName, date, time]
 */
export async function notifyProfessionalNewBooking(
    professionalPhone: string,
    prof: WaProfessionalInfo,
    appt: WaAppointmentInfo,
): Promise<void> {
    const nameWithSeries = (appt.clientName ?? 'Paciente') + seriesSuffix(appt);
    await sendTemplate(
        professionalPhone,
        'simpleagenda_alerta_profesional',
        'es',
        [
            prof.displayName ?? 'Profesional',
            nameWithSeries,
            fmtDateTz(appt.startsAt, prof.timezone),
            fmtTime(appt.startsAt, prof.timezone),
        ],
        'agenda',
    );
}

/**
 * Mensaje de prueba para verificar que WhatsApp funciona.
 * Usa el template de recordatorio 24h con datos ficticios.
 * Params: [clientName, professionalName, time, cancellationHours]
 */
export async function sendTestMessage(phone: string, professionalName: string): Promise<void> {
    const now = new Date();
    now.setHours(now.getHours() + 24);
    await sendTemplate(
        phone,
        'simpleagenda_recordatorio_24h',
        'es',
        ['Paciente de prueba', professionalName, fmtTime(now, 'America/Santiago'), '24'],
        'agenda',
    );
}

/**
 * Generic helper for other verticals (autos, propiedades).
 * Allows sending any approved template from the correct vertical number.
 *
 * Example usage (SimpleAutos — new lead notification):
 *   await sendVerticalTemplate('autos', ownerPhone, 'simpleautos_nuevo_lead', 'es', [buyerName, listingTitle])
 */
export async function sendVerticalTemplate(
    vertical: WaVertical,
    to: string,
    templateName: string,
    languageCode: string,
    bodyParams: string[],
): Promise<void> {
    await sendTemplate(to, templateName, languageCode, bodyParams, vertical);
}
