import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    getMercadoPagoOperatorAppCredentials,
    isMercadoPagoOperatorOAuthConfigured,
} from './operator-oauth.js';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Mercado Pago OAuth app credentials', () => {
    it('treats template placeholders as missing instead of configured credentials', () => {
        vi.stubEnv('MP_OPERATOR_APP_ID', 'YOUR_MP_OPERATOR_APP_ID');
        vi.stubEnv('MP_OPERATOR_APP_SECRET', 'YOUR_MP_OPERATOR_APP_SECRET');
        vi.stubEnv('MP_AGENDA_APP_ID', 'YOUR_MP_AGENDA_APP_ID');
        vi.stubEnv('MP_AGENDA_APP_SECRET', 'YOUR_MP_AGENDA_APP_SECRET');

        expect(getMercadoPagoOperatorAppCredentials()).toEqual({ appId: '', appSecret: '' });
        expect(isMercadoPagoOperatorOAuthConfigured()).toBe(false);
    });

    it('falls back to valid legacy Agenda credentials when operator keys are placeholders', () => {
        vi.stubEnv('MP_OPERATOR_APP_ID', 'YOUR_MP_OPERATOR_APP_ID');
        vi.stubEnv('MP_OPERATOR_APP_SECRET', 'YOUR_MP_OPERATOR_APP_SECRET');
        vi.stubEnv('MP_AGENDA_APP_ID', 'test-app-id');
        vi.stubEnv('MP_AGENDA_APP_SECRET', 'test-app-secret');

        expect(getMercadoPagoOperatorAppCredentials()).toEqual({
            appId: 'test-app-id',
            appSecret: 'test-app-secret',
        });
        expect(isMercadoPagoOperatorOAuthConfigured()).toBe(true);
    });

    it('uses valid operator credentials when they are supplied', () => {
        vi.stubEnv('MP_OPERATOR_APP_ID', 'operator-app-id');
        vi.stubEnv('MP_OPERATOR_APP_SECRET', 'operator-app-secret');
        vi.stubEnv('MP_AGENDA_APP_ID', 'legacy-app-id');
        vi.stubEnv('MP_AGENDA_APP_SECRET', 'legacy-app-secret');

        expect(getMercadoPagoOperatorAppCredentials()).toEqual({
            appId: 'operator-app-id',
            appSecret: 'operator-app-secret',
        });
        expect(isMercadoPagoOperatorOAuthConfigured()).toBe(true);
    });
});
