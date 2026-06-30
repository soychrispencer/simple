import { describe, expect, it } from 'vitest';
import {
    computeMarketplaceResponseDueAt,
    dayOfWeekChile,
    generateMarketplaceTimeSlots,
    MARKETPLACE_RESPONSE_SLA_HOURS,
    resolveBufferMinutes,
} from './availability.js';

describe('dayOfWeekChile', () => {
    it('resuelve día de la semana en zona Chile', () => {
        const dow = dayOfWeekChile('2099-06-15');
        expect(dow).toBeGreaterThanOrEqual(0);
        expect(dow).toBeLessThanOrEqual(6);
    });
});

describe('generateMarketplaceTimeSlots con reglas', () => {
    it('respeta horario laboral y buffer entre slots', () => {
        const slots = generateMarketplaceTimeSlots(60, '2099-06-15', [], {
            dayStart: '10:00',
            dayEnd: '13:00',
            bufferMinutes: 15,
        });
        expect(slots).toContain('10:00');
        expect(slots).not.toContain('09:00');
        expect(slots.length).toBeLessThanOrEqual(2);
    });
});

describe('computeMarketplaceResponseDueAt', () => {
    it('usa el SLA fijo de plataforma, no el del grupo', () => {
        const from = new Date('2026-05-26T10:00:00.000Z');
        const due = computeMarketplaceResponseDueAt(from);
        expect(due.getTime() - from.getTime()).toBe(MARKETPLACE_RESPONSE_SLA_HOURS * 60 * 60 * 1000);
    });
});

describe('resolveBufferMinutes', () => {
    it('acota buffer a 0-120', () => {
        expect(resolveBufferMinutes(-5)).toBe(0);
        expect(resolveBufferMinutes(200)).toBe(120);
        expect(resolveBufferMinutes(30)).toBe(30);
    });
});
