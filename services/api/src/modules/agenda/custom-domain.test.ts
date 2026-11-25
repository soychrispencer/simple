import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeCustomDomain, syncCustomDomainWithCoolify } from './custom-domain.js';

describe('custom-domain helpers', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    it('normaliza dominios válidos quitando protocolo, path y puerto', () => {
        expect(normalizeCustomDomain('HTTPS://Reservas.MiClinica.cl/agenda')).toEqual({
            ok: true,
            domain: 'reservas.miclinica.cl',
        });
        expect(normalizeCustomDomain('consulta.tudominio.com:443')).toEqual({
            ok: true,
            domain: 'consulta.tudominio.com',
        });
    });

    it('rechaza IPs, localhost y subdominios propios de SimpleAgenda', () => {
        expect(normalizeCustomDomain('192.168.1.1').ok).toBe(false);
        expect(normalizeCustomDomain('localhost').ok).toBe(false);
        expect(normalizeCustomDomain('demo.simpleagenda.app').ok).toBe(false);
        expect(normalizeCustomDomain('simpleagenda.app').ok).toBe(false);
    });

    it('omite llamada externa si faltan credenciales de Coolify', async () => {
        delete process.env.COOLIFY_URL;
        delete process.env.COOLIFY_API_TOKEN;
        const result = await syncCustomDomainWithCoolify({
            action: 'add',
            domain: 'reservas.miclinica.cl',
        });
        expect(result).toEqual({ ok: true, synced: false });
    });

    it('agrega y remueve dominios preservando el host principal en Coolify API', async () => {
        process.env.COOLIFY_URL = 'https://coolify.example.com';
        process.env.COOLIFY_API_TOKEN = 'test-token';
        process.env.COOLIFY_AGENDA_APP_UUID = 'app-uuid-1';

        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ fqdn: 'https://simpleagenda.app' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });
        vi.stubGlobal('fetch', fetchMock);

        const added = await syncCustomDomainWithCoolify({
            action: 'add',
            domain: 'reservas.miclinica.cl',
        });
        expect(added).toEqual({ ok: true, synced: true });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const patchCall = fetchMock.mock.calls[1];
        expect(patchCall[0]).toBe('https://coolify.example.com/api/v1/applications/app-uuid-1');
        expect(JSON.parse(patchCall[1].body as string)).toEqual({
            domains: 'https://simpleagenda.app,https://reservas.miclinica.cl',
        });
    });
});
