import { describe, expect, it } from 'vitest';
import {
    dayOfWeekChile,
    generateMarketplaceTimeSlots,
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

describe('resolveBufferMinutes', () => {
    it('acota buffer a 0-120', () => {
        expect(resolveBufferMinutes(-5)).toBe(0);
        expect(resolveBufferMinutes(200)).toBe(120);
        expect(resolveBufferMinutes(30)).toBe(30);
    });
});
