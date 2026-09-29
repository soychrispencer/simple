/**
 * WhatsApp click-to-chat (wa.me) — costo cero.
 * Abre WhatsApp con mensaje listo; el profesional/cliente envía manualmente.
 * No usa Meta Cloud API ni plantillas de pago.
 */

export function digitsForWaMe(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) return null;
    return digits;
}

/** Prefer WhatsApp del cliente; si no, teléfono. */
export function resolveClientWhatsAppPhone(
    whatsapp?: string | null,
    phone?: string | null,
): string | null {
    const raw = (whatsapp?.trim() || phone?.trim() || '');
    if (!raw) return null;
    return digitsForWaMe(raw);
}

/**
 * @param phone Si falta, abre el selector de chat de WhatsApp (sin destinatario).
 */
export function buildWhatsAppClickUrl(
    phone: string | null | undefined,
    message: string,
): string {
    const text = encodeURIComponent(message);
    const digits = phone ? digitsForWaMe(phone) : null;
    if (digits) return `https://wa.me/${digits}?text=${text}`;
    return `https://wa.me/?text=${text}`;
}

export function formatAppointmentWhenLabel(
    startsAt: string | Date,
    timezone = 'America/Santiago',
): string {
    const d = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
    const dateLabel = d.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: timezone,
    });
    const timeLabel = d.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
    });
    return `${dateLabel} a las ${timeLabel}`;
}

export function buildAppointmentConfirmationWaMessage(input: {
    clientFirstName: string;
    professionalName: string;
    whenLabel: string;
    modality?: string | null;
    meetingUrl?: string | null;
    location?: string | null;
    cancelUrl?: string | null;
}): string {
    const lines = [
        `Hola ${input.clientFirstName},`,
        '',
        `Te confirmo tu cita con ${input.professionalName}:`,
        input.whenLabel,
    ];
    if (input.modality === 'online' && input.meetingUrl) {
        lines.push('', `Enlace: ${input.meetingUrl}`);
    } else if (input.location) {
        lines.push('', `Lugar: ${input.location}`);
    }
    if (input.cancelUrl) {
        lines.push('', `Si necesitas cancelar o reprogramar: ${input.cancelUrl}`);
    }
    lines.push('', '¡Te espero!');
    return lines.join('\n');
}

export function buildAppointmentReminderWaMessage(input: {
    clientFirstName: string;
    professionalName: string;
    whenLabel: string;
    modality?: string | null;
    meetingUrl?: string | null;
    location?: string | null;
    cancelUrl?: string | null;
}): string {
    const lines = [
        `Hola ${input.clientFirstName},`,
        '',
        `Te recuerdo tu cita con ${input.professionalName}:`,
        input.whenLabel,
    ];
    if (input.modality === 'online' && input.meetingUrl) {
        lines.push('', `Enlace: ${input.meetingUrl}`);
    } else if (input.location) {
        lines.push('', `Lugar: ${input.location}`);
    }
    if (input.cancelUrl) {
        lines.push('', `Cancelar o reprogramar: ${input.cancelUrl}`);
    }
    return lines.join('\n');
}

export function buildAppointmentCancellationWaMessage(input: {
    clientFirstName: string;
    professionalName: string;
    whenLabel: string;
    reason?: string | null;
    rebookUrl?: string | null;
}): string {
    const lines = [
        `Hola ${input.clientFirstName},`,
        '',
        `Tu cita con ${input.professionalName} (${input.whenLabel}) fue cancelada.`,
    ];
    if (input.reason?.trim()) {
        lines.push(`Motivo: ${input.reason.trim()}`);
    }
    if (input.rebookUrl) {
        lines.push('', `Puedes agendar otra hora aquí: ${input.rebookUrl}`);
    }
    return lines.join('\n');
}

export function buildNpsSurveyWaMessage(input: {
    surveyUrl: string;
    clientLabel?: string;
}): string {
    const who = input.clientLabel ?? 'tu última cita';
    return `Hola, ¿nos ayudas con una breve encuesta sobre ${who}? ${input.surveyUrl}`;
}

export function buildPaymentReminderWaMessage(input: {
    clientFirstName: string;
    amountLabel: string;
}): string {
    return `Hola ${input.clientFirstName}, te recuerdo el cobro pendiente de ${input.amountLabel}. Si ya lo realizaste, avísame para registrarlo. ¡Gracias!`;
}

export function buildBookingShareWaMessage(input: {
    professionalName: string;
    whenLabel: string;
    serviceName?: string | null;
    meetingUrl?: string | null;
    location?: string | null;
    cancelUrl?: string | null;
}): string {
    const lines = [
        `Cita con ${input.professionalName}`,
        input.whenLabel,
    ];
    if (input.serviceName) lines.splice(1, 0, input.serviceName);
    if (input.meetingUrl) lines.push(`Enlace: ${input.meetingUrl}`);
    else if (input.location) lines.push(`Lugar: ${input.location}`);
    if (input.cancelUrl) lines.push(`Cancelar/reprogramar: ${input.cancelUrl}`);
    return lines.join('\n');
}
