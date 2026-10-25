import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLATFORM_OPS_BUSINESS_ID } from '@simple/utils';
import { getAuthMailerTransporter } from '../../lib/auth-email.js';
import { createPartnershipInquiryDelivery } from './partnership-inquiry-delivery.js';
import type { PartnershipInquiry } from './partnership-inquiries.js';

vi.mock('../../lib/auth-email.js', () => ({ getAuthMailerTransporter: vi.fn() }));
const inquiry: PartnershipInquiry = { requestId: '0f3f76f8-a8d7-40ad-88dc-cae663819871', name: 'Ana Pérez', company: 'Empresa de prueba', email: 'ana@empresa.cl', operation: 'ambas', consent: true, website: '' };
function setup(created: boolean, existing?: Record<string, unknown>) {
    const values = vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(created ? [{ id: inquiry.requestId }] : []) }) });
    const db = {
        insert: vi.fn().mockReturnValue({ values }),
        select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(existing ? [existing] : []) }) }) }),
    };
    return { values, delivery: createPartnershipInquiryDelivery({ db, timelineEvents: { id: 'id' }, eq: vi.fn() }) };
}
beforeEach(() => vi.clearAllMocks());

describe('entrega de solicitudes de alianza', () => {
    it('guarda un evento entrante pendiente visible por Conversaciones de SimpleAdmin', async () => {
        const { delivery, values } = setup(true);
        expect(await delivery.save(inquiry)).toBe('created');
        expect(values).toHaveBeenCalledWith(expect.objectContaining({
            id: inquiry.requestId, type: 'channel.inbound', businessId: PLATFORM_OPS_BUSINESS_ID,
            subjectId: `web_form:${inquiry.requestId}`, vertical: 'platform',
            payload: expect.objectContaining({ status: 'pending', channel: 'web_form', email: inquiry.email, company: inquiry.company, consent: true }),
        }));
    });
    it('reconoce el mismo contacto para una clave ya registrada', async () => {
        const { delivery } = setup(false, { type: 'channel.inbound', businessId: PLATFORM_OPS_BUSINESS_ID, payload: inquiry });
        expect(await delivery.save(inquiry)).toBe('duplicate');
    });
    it('no sobrescribe otros datos o eventos con la misma clave', async () => {
        const { delivery } = setup(false, { type: 'channel.inbound', businessId: PLATFORM_OPS_BUSINESS_ID, payload: { ...inquiry, email: 'distinto@empresa.cl' } });
        expect(await delivery.save(inquiry)).toBe('conflict');
    });
    it('avisa solo a la casilla de Simple y permite responder al interesado', async () => {
        const sendMail = vi.fn().mockResolvedValue({ accepted: ['hola@simpleplataforma.app'] });
        vi.mocked(getAuthMailerTransporter).mockReturnValue({ sendMail } as never);
        const { delivery } = setup(true);
        await delivery.notify(inquiry);
        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'hola@simpleplataforma.app', replyTo: inquiry.email, subject: `Solicitud de alianza inmobiliaria · ${inquiry.company}` }));
    });
    it('detecta cuando el proveedor no acepta el aviso', async () => {
        vi.mocked(getAuthMailerTransporter).mockReturnValue({ sendMail: vi.fn().mockResolvedValue({ accepted: [] }) } as never);
        const { delivery } = setup(true);
        await expect(delivery.notify(inquiry)).rejects.toThrow('Notification not accepted');
    });
});
