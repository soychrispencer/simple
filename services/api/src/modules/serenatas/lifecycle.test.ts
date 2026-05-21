import { describe, expect, it } from 'vitest';
import {
    clientCancelRequiresReason,
    needsClosure,
    validateCancelTransition,
    validateClientCancelReason,
    validateClientConfirmTransition,
    validateCompleteTransition,
} from './lifecycle.js';

describe('serenata lifecycle', () => {
    it('needsClosure solo para scheduled con fecha pasada', () => {
        const past = '2020-01-01';
        expect(needsClosure({ status: 'scheduled', eventDate: past })).toBe(true);
        expect(needsClosure({ status: 'accepted_pending_group', eventDate: past })).toBe(false);
        expect(needsClosure({ status: 'completed', eventDate: past })).toBe(false);
        expect(needsClosure({ status: 'scheduled', eventDate: '2099-12-31' })).toBe(false);
    });

    it('validateCompleteTransition rechaza estados terminales y accepted_pending_group', () => {
        expect(validateCompleteTransition({ status: 'completed' })).toMatch(/completada/i);
        expect(validateCompleteTransition({ status: 'cancelled' })).toMatch(/cancelada/i);
        expect(validateCompleteTransition({ status: 'accepted_pending_group' })).toMatch(/grupo/i);
        expect(validateCompleteTransition({ status: 'scheduled' })).toBeNull();
    });

    it('validateCancelTransition exige motivo y bloquea fecha pasada', () => {
        expect(validateCancelTransition({ status: 'scheduled', eventDate: '2099-06-01' }, 'ab')).toMatch(/3 caracteres/i);
        expect(validateCancelTransition({ status: 'scheduled', eventDate: '2099-06-01' }, 'motivo válido')).toBeNull();
        expect(validateCancelTransition({ status: 'scheduled', eventDate: '2020-01-01' }, 'motivo válido')).toMatch(/ya pasó/i);
        expect(validateCancelTransition({ status: 'completed', eventDate: '2099-06-01' }, 'motivo válido')).toMatch(/completada/i);
    });

    it('validateClientConfirmTransition solo desde completed sin confirmar', () => {
        expect(validateClientConfirmTransition({ status: 'scheduled', clientConfirmedAt: null })).toMatch(/completadas/i);
        expect(validateClientConfirmTransition({ status: 'completed', clientConfirmedAt: new Date() })).toMatch(/Ya confirmaste/i);
        expect(validateClientConfirmTransition({ status: 'completed', clientConfirmedAt: null })).toBeNull();
    });

    it('clientCancelRequiresReason solo si ya pagó', () => {
        expect(clientCancelRequiresReason({ status: 'payment_pending', paymentStatus: 'pending' })).toBe(false);
        expect(clientCancelRequiresReason({ status: 'pending', paymentStatus: 'paid' })).toBe(true);
        expect(clientCancelRequiresReason({ status: 'pending_open', paymentStatus: 'paid' })).toBe(true);
    });

    it('validateClientCancelReason exige motivo cuando hay pago', () => {
        expect(validateClientCancelReason({ status: 'pending', paymentStatus: 'paid' }, 'ab')).toMatch(/3 caracteres/i);
        expect(validateClientCancelReason({ status: 'pending', paymentStatus: 'paid' }, 'cambio de planes')).toBeNull();
        expect(validateClientCancelReason({ status: 'payment_pending', paymentStatus: 'pending' }, undefined)).toBeNull();
    });
});
