import { describe, expect, it } from 'vitest';
import { resolveFreeBoostQuota } from './quota.js';

describe('resolveFreeBoostQuota', () => {
    it('otorga ilimitado a superadmin', () => {
        const q = resolveFreeBoostQuota(
            { id: 'u1', role: 'superadmin' },
            'autos',
            'free',
        );
        expect(q.max).toBe(-1);
        expect(q.remaining).toBe(-1);
        expect(q.unlimited).toBe(true);
        expect(q.planName).toBe('Administrador');
    });

    it('usa maxFreeBoostsPerMonth del plan pro en autos', () => {
        const q = resolveFreeBoostQuota(
            { id: 'u2', role: 'user' },
            'autos',
            'pro',
        );
        expect(q.max).toBe(3);
        expect(q.remaining).toBe(3);
        expect(q.planName).toBe('Profesional');
        expect(q.unlimited).toBe(false);
    });

    it('plan free no tiene boosts gratuitos', () => {
        const q = resolveFreeBoostQuota(
            { id: 'u3', role: 'user' },
            'propiedades',
            'free',
        );
        expect(q.max).toBe(0);
        expect(q.remaining).toBe(0);
        expect(q.planName).toBe('Gratuito');
    });
});
