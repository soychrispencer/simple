import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPanelNavItems } from './panel-nav-config.js';

function routes(...args: Parameters<typeof getPanelNavItems>): string[] {
    return getPanelNavItems(...args).map((item) => item.href);
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('SimpleAutos panel navigation by account context', () => {
    it('keeps company-only controls away from a personal account', () => {
        vi.stubEnv('MARKETPLACE_LAUNCH_MODE', 'false');
        const visibleRoutes = routes(null, true, 'individual');

        expect(visibleRoutes).not.toContain('/panel/finanzas');
        expect(visibleRoutes).not.toContain('/panel/estadisticas');
    });

    it('shows professional statistics to an independent operator', () => {
        vi.stubEnv('MARKETPLACE_LAUNCH_MODE', 'false');
        expect(routes('owner', true, 'independent')).toContain('/panel/estadisticas');
    });

    it('does not show company controls to an agent', () => {
        vi.stubEnv('MARKETPLACE_LAUNCH_MODE', 'false');
        const visibleRoutes = routes('agent', false, 'company');

        expect(visibleRoutes).not.toContain('/panel/finanzas');
        expect(visibleRoutes).not.toContain('/panel/estadisticas');
        expect(visibleRoutes).not.toContain('/panel/mi-negocio');
        expect(visibleRoutes).toContain('/panel/contactos');
        expect(visibleRoutes).toContain('/panel/mensajes');
    });
});
