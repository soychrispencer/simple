import { getAgendaEmailBrand } from './email-brand.js';
import {
    buildActionEmailPackage,
    buildDetailTableHtml,
    buildInfoBoxHtml,
    buildStatusPillHtml,
    escapeHtml,
    type ActionEmailPackage,
} from './email-template.js';

export type BookingEmailData = {
    appointmentId: string;
    clientName: string;
    professionalName: string;
    slug: string;
    serviceName: string | null;
    startsAt: Date;
    endsAt: Date;
    durationMinutes: number;
    modality: string;
    price: string | null;
    currency: string;
    meetingUrl?: string | null;
    location?: string | null;
    timezone: string;
    status: string;
    seriesDates?: Date[] | null;
    seriesFrequency?: 'weekly' | 'biweekly' | 'monthly' | null;
    paymentMethods?: {
        requiresAdvancePayment: boolean;
        mpConnected: boolean;
        paymentLinkUrl: string | null;
        bankTransferData: Record<string, string> | null;
        checkoutUrl?: string | null;
    } | null;
};

export function fmtBookingDateTime(date: Date, timezone: string): string {
    return date.toLocaleString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
    });
}

export function buildBookingEmailPackage(
    data: BookingEmailData & { cancelUrl: string; appUrl: string },
): ActionEmailPackage {
    const brand = getAgendaEmailBrand();
    const isPending = data.status === 'pending';
    const dateStr = fmtBookingDateTime(data.startsAt, data.timezone);
    const durationStr = data.durationMinutes >= 60
        ? `${Math.floor(data.durationMinutes / 60)}h${data.durationMinutes % 60 ? ` ${data.durationMinutes % 60}min` : ''}`
        : `${data.durationMinutes} min`;
    const modalityStr = data.modality === 'presencial' ? 'Presencial' : 'Online (videollamada)';
    const priceStr = data.price && parseFloat(data.price) > 0
        ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: data.currency || 'CLP', maximumFractionDigits: 0 }).format(parseFloat(data.price))
        : null;

    const detailRows = [
        { label: 'Fecha y hora', value: dateStr },
        ...(data.serviceName
            ? [{ label: 'Servicio', value: `${data.serviceName} · ${durationStr}` }]
            : [{ label: 'Duración', value: durationStr }]),
        {
            label: 'Modalidad',
            value: `${modalityStr}${data.location ? ` · ${data.location}` : ''}`,
        },
        ...(priceStr ? [{ label: 'Precio', value: priceStr }] : []),
    ];

    let extraHtml = `<div style="margin-bottom:16px;">${buildStatusPillHtml(isPending ? 'Pendiente de confirmación' : 'Confirmada', isPending ? 'warning' : 'success')}</div>`;
    extraHtml += buildDetailTableHtml(detailRows);

    if (data.modality !== 'presencial' && data.meetingUrl) {
        extraHtml += buildInfoBoxHtml({
            title: 'Enlace de videollamada',
            tone: 'blue',
            bodyHtml: `<a href="${escapeHtml(data.meetingUrl)}" style="color:#1d4ed8;word-break:break-all;">${escapeHtml(data.meetingUrl)}</a>`,
        });
    }

    const seriesDates = data.seriesDates ?? null;
    if (seriesDates && seriesDates.length > 1) {
        const freqLabel = data.seriesFrequency === 'weekly' ? 'semanal'
            : data.seriesFrequency === 'biweekly' ? 'quincenal'
            : data.seriesFrequency === 'monthly' ? 'mensual'
            : 'recurrente';
        const list = seriesDates
            .map((d, i) => `<li style="margin:0 0 6px;">${i + 1}. ${escapeHtml(fmtBookingDateTime(d, data.timezone))}</li>`)
            .join('');
        extraHtml += buildInfoBoxHtml({
            title: `Reserva ${freqLabel} · ${seriesDates.length} sesiones`,
            tone: 'blue',
            bodyHtml: `<ul style="margin:0;padding-left:18px;">${list}</ul>`,
        });
    }

    if (data.paymentMethods?.requiresAdvancePayment && priceStr) {
        if (data.paymentMethods.checkoutUrl) {
            extraHtml += buildInfoBoxHtml({
                title: 'Pago anticipado requerido',
                tone: 'amber',
                bodyHtml: `Para confirmar tu cita debes pagar <strong>${escapeHtml(priceStr)}</strong>.<br/><br/><a href="${escapeHtml(data.paymentMethods.checkoutUrl)}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:${brand.accent};color:#fff;text-decoration:none;font-weight:700;">Pagar ahora</a>`,
            });
        } else if (data.paymentMethods.bankTransferData) {
            const bt = data.paymentMethods.bankTransferData;
            extraHtml += buildInfoBoxHtml({
                title: 'Pago por transferencia',
                tone: 'green',
                bodyHtml: `Monto: <strong>${escapeHtml(priceStr)}</strong><br/>Banco: ${escapeHtml(bt.bank ?? '')}<br/>Tipo: ${escapeHtml(bt.accountType ?? '')}<br/>N° cuenta: ${escapeHtml(bt.accountNumber ?? '')}<br/>Titular: ${escapeHtml(bt.holderName ?? '')}<br/>RUT: ${escapeHtml(bt.holderRut ?? '')}${bt.alias ? `<br/>Alias: ${escapeHtml(bt.alias)}` : ''}`,
            });
        } else if (data.paymentMethods.paymentLinkUrl) {
            extraHtml += buildInfoBoxHtml({
                title: 'Pago anticipado requerido',
                tone: 'amber',
                bodyHtml: `Monto: <strong>${escapeHtml(priceStr)}</strong><br/><br/><a href="${escapeHtml(data.paymentMethods.paymentLinkUrl)}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:${brand.accent};color:#fff;text-decoration:none;font-weight:700;">Ir al link de pago</a>`,
            });
        }
    }

    extraHtml += `<p style="margin:20px 0 0;font-size:13px;color:#64748b;">¿Necesitas cancelar? <a href="${escapeHtml(data.cancelUrl)}" style="color:${brand.accent};font-weight:600;">Cancelar cita</a></p>`;

    return buildActionEmailPackage({
        brand,
        preheader: isPending ? 'Solicitud de cita recibida' : 'Tu cita está confirmada',
        eyebrow: 'Agenda',
        headline: `Tu cita con ${data.professionalName}`,
        bodyHtml: `<p style="margin:0 0 16px;">${escapeHtml(isPending ? 'Recibimos tu solicitud y el profesional la revisará pronto.' : 'Tu cita está confirmada. Te esperamos.')}</p>`,
        buttonLabel: 'Ver en SimpleAgenda',
        actionUrl: data.appUrl,
        footnote: `Dudas sobre la cita: contacta a ${data.professionalName}.`,
        extraHtml,
    });
}

export function buildAppointmentReminderEmailPackage(data: {
    clientName: string;
    professionalName: string;
    dateLabel: string;
    modality: string;
    meetingUrl?: string | null;
    location?: string | null;
    cancelUrl: string;
    appUrl: string;
}): ActionEmailPackage {
    const brand = getAgendaEmailBrand();
    const locationLine = data.modality === 'online'
        ? (data.meetingUrl ? `Enlace: ${data.meetingUrl}` : 'Modalidad: Online')
        : (data.location ? `Lugar: ${data.location}` : 'Modalidad: Presencial');

    let extraHtml = buildDetailTableHtml([
        { label: 'Profesional', value: data.professionalName },
        { label: 'Cuándo', value: data.dateLabel },
        { label: 'Detalle', value: locationLine },
    ]);
    extraHtml += `<p style="margin:16px 0 0;font-size:13px;color:#64748b;"><a href="${escapeHtml(data.cancelUrl)}" style="color:${brand.accent};font-weight:600;">Cancelar cita</a></p>`;

    return buildActionEmailPackage({
        brand,
        preheader: `Recordatorio: cita mañana con ${data.professionalName}`,
        eyebrow: 'Recordatorio',
        headline: 'Tu cita es mañana',
        bodyHtml: `<p style="margin:0;">Hola ${escapeHtml(data.clientName)}, te recordamos que tienes una cita programada.</p>`,
        buttonLabel: 'Ver detalle',
        actionUrl: data.appUrl,
        footnote: 'Si ya no puedes asistir, cancela con anticipación.',
        extraHtml,
    });
}

export function buildAppointmentReminderEmailHtml(data: Parameters<typeof buildAppointmentReminderEmailPackage>[0]): string {
    return buildAppointmentReminderEmailPackage(data).html;
}
