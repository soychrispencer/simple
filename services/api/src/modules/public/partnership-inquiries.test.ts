import { describe, expect, it, vi } from 'vitest';
import { createPartnershipInquiryRouter } from './partnership-inquiries.js';

let ip = 0;
const input = { requestId: '0f3f76f8-a8d7-40ad-88dc-cae663819871', name: 'Ana Pérez', company: 'Empresa de prueba', email: 'Ana@Empresa.cl', operation: 'ambas', consent: true, website: '' };
function setup() {
    const save = vi.fn().mockResolvedValue('created');
    const notify = vi.fn().mockResolvedValue(undefined);
    const app = createPartnershipInquiryRouter({ save, notify });
    const request = (body: unknown = input, extraHeaders: Record<string, string> = {}) => app.request('http://test/', {
        method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://simplepropiedades.app', 'x-real-ip': `test-${++ip}`, ...extraHeaders }, body: JSON.stringify(body),
    });
    return { save, notify, request };
}

describe('formulario público de alianzas', () => {
    it('valida y registra el contacto antes de notificar', async () => {
        const { request, save, notify } = setup();
        const response = await request();
        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({ ok: true });
        expect(save).toHaveBeenCalledWith({ ...input, email: 'ana@empresa.cl' });
        expect(notify).toHaveBeenCalledOnce();
        expect(save.mock.invocationCallOrder[0]).toBeLessThan(notify.mock.invocationCallOrder[0]!);
    });
    it.each([
        { email: 'incorrecto' }, { consent: false }, { operation: 'administracion' }, { name: '' },
        { company: 'Empresa\r\nBcc:otro@empresa.cl' }, { recipient: 'otro@empresa.cl' }, { requestId: 'incorrecto' },
    ])('rechaza datos inválidos o campos ajenos al formulario: %j', async (changes) => {
        const { request, save, notify } = setup();
        expect((await request({ ...input, ...changes })).status).toBe(400);
        expect(save).not.toHaveBeenCalled();
        expect(notify).not.toHaveBeenCalled();
    });
    it('omite el campo trampa sin registrar ni enviar correo', async () => {
        const { request, save, notify } = setup();
        expect((await request({ ...input, website: 'https://spam.example' })).status).toBe(202);
        expect(save).not.toHaveBeenCalled();
        expect(notify).not.toHaveBeenCalled();
    });
    it('rechaza un origen ajeno', async () => {
        const { request, save } = setup();
        expect((await request(input, { origin: 'https://other.example' })).status).toBe(403);
        expect(save).not.toHaveBeenCalled();
    });
    it('limita el tamaño del cuerpo antes de persistir', async () => {
        const { request, save } = setup();
        expect((await request({ ...input, company: 'a'.repeat(5000) })).status).toBe(413);
        expect(save).not.toHaveBeenCalled();
    });
    it('permite reintentar la misma solicitud sin repetir el aviso', async () => {
        const { request, save, notify } = setup();
        save.mockResolvedValue('duplicate');
        expect((await request()).status).toBe(200);
        expect(notify).not.toHaveBeenCalled();
    });
    it('rechaza reutilizar una clave con datos diferentes', async () => {
        const { request, save, notify } = setup();
        save.mockResolvedValue('conflict');
        expect((await request()).status).toBe(409);
        expect(notify).not.toHaveBeenCalled();
    });
    it('no anuncia recepción cuando no pudo guardar', async () => {
        const { request, save, notify } = setup();
        save.mockRejectedValue(new Error('database unavailable'));
        const response = await request();
        expect(response.status).toBe(503);
        expect((await response.json()).ok).toBe(false);
        expect(notify).not.toHaveBeenCalled();
    });
    it('conserva el éxito del registro aunque falle el aviso', async () => {
        const { request, notify } = setup();
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        notify.mockRejectedValue(new Error('SMTP unavailable'));
        expect((await request()).status).toBe(201);
        await Promise.resolve();
        expect(warning).toHaveBeenCalled();
        warning.mockRestore();
    });
    it('limita solicitudes repetidas por dirección de origen', async () => {
        const { request, save } = setup();
        const headers = { 'x-real-ip': 'rate-limit-test' };
        for (let count = 0; count < 5; count++) expect((await request(input, headers)).status).toBe(201);
        const response = await request(input, headers);
        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBeTruthy();
        expect(save).toHaveBeenCalledTimes(5);
    });
});
