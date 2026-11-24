import { describe, expect, it } from 'vitest';
import { parseDateTimeInTimezone } from './timezones.js';

describe('parseDateTimeInTimezone', () => {
    it('correctly converts naive datetime-local string to UTC for America/Santiago (Chile)', () => {
        // In November (Chile summer/DST, UTC-3): 15:00 local should be 18:00 UTC
        const parsedNov = parseDateTimeInTimezone('2026-11-24T15:00', 'America/Santiago');
        expect(parsedNov.toISOString()).toBe('2026-11-24T18:00:00.000Z');

        // In June (Chile standard/winter, UTC-4): 15:00 local should be 19:00 UTC
        const parsedJun = parseDateTimeInTimezone('2026-06-24T15:00', 'America/Santiago');
        expect(parsedJun.toISOString()).toBe('2026-06-24T19:00:00.000Z');
    });

    it('preserves ISO strings that already contain timezone information', () => {
        const utcIso = '2026-11-24T18:00:00.000Z';
        expect(parseDateTimeInTimezone(utcIso, 'America/Santiago').toISOString()).toBe(utcIso);

        const offsetIso = '2026-11-24T15:00:00-03:00';
        expect(parseDateTimeInTimezone(offsetIso, 'America/Santiago').toISOString()).toBe('2026-11-24T18:00:00.000Z');
    });

    it('handles Date instances and invalid inputs gracefully', () => {
        const d = new Date('2026-11-24T18:00:00.000Z');
        expect(parseDateTimeInTimezone(d, 'America/Santiago').toISOString()).toBe('2026-11-24T18:00:00.000Z');

        expect(Number.isNaN(parseDateTimeInTimezone(null).getTime())).toBe(true);
        expect(Number.isNaN(parseDateTimeInTimezone('').getTime())).toBe(true);
    });
});
