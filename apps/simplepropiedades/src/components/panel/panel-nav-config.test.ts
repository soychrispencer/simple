import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPanelNavItems } from './panel-nav-config.js';

function routes(...args: Parameters<typeof getPanelNavItems>): string[] {
    return getPanelNavItems(...args).map((item) => item.href);
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('SimplePropiedades panel navigation by account context', () => {
    it('keeps the personal plan focused on basic work', () => {
        vi.stubEnv('MARKETPLACE_LAUNCH_MODE', 'false');
        const visibleRoutes = routes(null, true, 'individual');

        expect(visibleRoutes).toContain('/panel/publicaciones');
        expect(visibleRoutes).toContain('/panel/contactos');
        expect(visibleRoutes).not.toContain('/panel/finanzas');
        expect(visibleRoutes).not.toContain('/panel/estadisticas');
    });

    it('shows professional statistics to an independent operator, without company finance controls', () => {
        vi.stubEnv('MARKETPLACE_LAUNCH_MODE', 'false');
        const visibleRoutes = routes('owner', true, 'independent');

        expect(visibleRoutes).toContain('/panel/estadisticas');
        expect(visibleRoutes).not.toContain('/panel/finanzas');
        expect(visibleRoutes).toContain('/panel/mi-negocio');
    });

    it.each(['owner', 'admin'])('shows company administration to a company %s', (role) => {
        vi.stubEnv('MARKETPLACE_LAUNCH_MODE', 'false');
        const visibleRoutes = routes(role, false, 'company');

        expect(visibleRoutes).toContain('/panel/finanzas');
        expect(visibleRoutes).toContain('/panel/estadisticas');
        expect(visibleRoutes).toContain('/panel/mi-negocio');
    });

    it('keeps an agent menu focused on assigned work', () => {
        vi.stubEnv('MARKETPLACE_LAUNCH_MODE', 'false');
        const visibleRoutes = routes('agent', false, 'company');

        expect(visibleRoutes).toEqual([
            '/panel',
            '/panel/publicaciones',
            '/panel/contactos',
            '/panel/mensajes',
            '/panel/mi-cuenta',
        ]);
    });
});
