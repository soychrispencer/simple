import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PartnershipForm } from './partnership-form';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function fillForm() {
    fireEvent.change(screen.getByLabelText('Nombre', { exact: true }), { target: { value: 'Ana Pérez' } });
    fireEvent.change(screen.getByLabelText('Empresa', { exact: true }), { target: { value: 'Empresa de prueba' } });
    fireEvent.change(screen.getByLabelText('Correo de trabajo'), { target: { value: 'ana@empresa.cl' } });
    fireEvent.click(screen.getByRole('checkbox'));
}

describe('formulario de alianzas', () => {
    it('envía los datos autorizados y muestra confirmación tras la recepción del servidor', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        vi.stubGlobal('fetch', fetchMock);
        render(<PartnershipForm />);
        fillForm();
        fireEvent.click(screen.getByLabelText('Arriendo', { exact: true }));
        fireEvent.submit(screen.getByRole('form'));
        await screen.findByText('Solicitud recibida');
        const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
        expect(body).toMatchObject({ name: 'Ana Pérez', company: 'Empresa de prueba', email: 'ana@empresa.cl', operation: 'arriendo', consent: true, website: '' });
        expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/);
        expect(fetchMock.mock.calls[0]![0]).toBe('/api/public/partnership-inquiries');
        expect(screen.queryByRole('button', { name: 'Quiero evaluar una alianza' })).toBeNull();
    });
    it('conserva los datos y reutiliza la clave al reintentar un fallo de red', async () => {
        const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
        vi.stubGlobal('fetch', fetchMock);
        render(<PartnershipForm />);
        fillForm();
        fireEvent.submit(screen.getByRole('form'));
        await screen.findByRole('alert');
        expect((screen.getByLabelText('Nombre', { exact: true }) as HTMLInputElement).value).toBe('Ana Pérez');
        fireEvent.submit(screen.getByRole('form'));
        await screen.findByText('Solicitud recibida');
        expect(JSON.parse(fetchMock.mock.calls[0]![1].body).requestId).toBe(JSON.parse(fetchMock.mock.calls[1]![1].body).requestId);
    });
    it('muestra el error del servidor y permite corregir los campos', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: 'Revise el correo.' }) });
        vi.stubGlobal('fetch', fetchMock);
        render(<PartnershipForm />);
        fillForm();
        fireEvent.submit(screen.getByRole('form'));
        await screen.findByText('Revise el correo.');
        fireEvent.change(screen.getByLabelText('Correo de trabajo'), { target: { value: 'otro@empresa.cl' } });
        await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    });
    it('bloquea un segundo envío mientras espera respuesta', async () => {
        const fetchMock = vi.fn().mockImplementation(() => new Promise(() => undefined));
        vi.stubGlobal('fetch', fetchMock);
        render(<PartnershipForm />);
        fillForm();
        fireEvent.submit(screen.getByRole('form'));
        const button = screen.getByRole('button', { name: 'Enviando solicitud…' }) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        fireEvent.submit(screen.getByRole('form'));
        expect(fetchMock).toHaveBeenCalledOnce();
    });
});
