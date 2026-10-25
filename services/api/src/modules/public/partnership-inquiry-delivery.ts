import { PLATFORM_OPS_BUSINESS_ID } from '@simple/utils';
import { getAuthMailerTransporter } from '../../lib/auth-email.js';
import { formatEmailFromAddress } from '../../lib/smtp-from.js';
import type { PartnershipInquiry, PartnershipInquiryDeps } from './partnership-inquiries.js';

const recipient = 'hola@simpleplataforma.app';
const operationLabels = { venta: 'Venta', arriendo: 'Arriendo', ambas: 'Venta y arriendo' } as const;

export function createPartnershipInquiryDelivery(deps: { db: any; timelineEvents: any; eq: any }): Pick<PartnershipInquiryDeps, 'save' | 'notify'> {
    return {
        async save(inquiry) {
            const table = deps.timelineEvents;
            const threadId = `web_form:${inquiry.requestId}`;
            const inserted = await deps.db.insert(table).values({
                id: inquiry.requestId,
                type: 'channel.inbound', vertical: 'platform', businessId: PLATFORM_OPS_BUSINESS_ID,
                personKind: 'opaque', personId: threadId, subjectKind: 'channel_thread', subjectId: threadId,
                actor: 'system',
                payload: {
                    status: 'pending', channel: 'web_form', sourceVertical: 'propiedades',
                    source: 'https://simplepropiedades.app/alianzas-inmobiliarias',
                    name: inquiry.name, company: inquiry.company, email: inquiry.email, operation: inquiry.operation,
                    message: `Solicitud de alianza inmobiliaria. Interés: ${operationLabels[inquiry.operation]}.`,
                    consent: true, consentVersion: 'partnership-contact-2026-10',
                },
            }).onConflictDoNothing({ target: table.id }).returning({ id: table.id });
            if (inserted.length) return 'created';
            const [existing] = await deps.db.select({ type: table.type, businessId: table.businessId, payload: table.payload }).from(table).where(deps.eq(table.id, inquiry.requestId)).limit(1);
            if (existing?.type !== 'channel.inbound' || existing.businessId !== PLATFORM_OPS_BUSINESS_ID) return 'conflict';
            const payload = existing.payload;
            return payload?.name === inquiry.name && payload?.company === inquiry.company && payload?.email === inquiry.email && payload?.operation === inquiry.operation ? 'duplicate' : 'conflict';
        },
        async notify(inquiry: PartnershipInquiry) {
            const mailer = getAuthMailerTransporter();
            if (!mailer) throw new Error('Commercial notification unavailable');
            const result = await mailer.sendMail({
                from: formatEmailFromAddress('SimplePropiedades · Alianzas'),
                to: recipient,
                replyTo: inquiry.email,
                messageId: `<partnership-inquiry-${inquiry.requestId}@simpleplataforma.app>`,
                subject: `Solicitud de alianza inmobiliaria · ${inquiry.company}`,
                text: [
                    'Nueva solicitud desde la landing de alianzas de SimplePropiedades.', '',
                    `Nombre: ${inquiry.name}`, `Empresa: ${inquiry.company}`, `Correo: ${inquiry.email}`,
                    `Interés: ${operationLabels[inquiry.operation]}`, '',
                    'La persona autorizó el contacto sobre esta solicitud.',
                    'El contacto quedó registrado como pendiente en Conversaciones de SimpleAdmin.',
                    `Referencia: ${inquiry.requestId}`,
                ].join('\n'),
            });
            if (!result.accepted?.some((address: unknown) => String(address).toLowerCase() === recipient)) throw new Error('Notification not accepted');
        },
    };
}
