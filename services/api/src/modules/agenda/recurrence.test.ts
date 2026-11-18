import { describe, expect, it } from 'vitest';
import { recurringBookingStart } from './recurrence.js';

describe('horario local de reservas recurrentes', () => {
    it('conserva las 10:00 en Santiago cuando cambia el desfase UTC', () => {
        const beforeClockChange = new Date('2026-09-01T14:00:00.000Z');
        const recurring = recurringBookingStart(beforeClockChange, 1, 'weekly', 'America/Santiago');
        expect(recurring?.toISOString()).toBe('2026-09-08T13:00:00.000Z');
    });

    it('conserva el último día disponible para meses más cortos', () => {
        const january = new Date('2026-01-31T13:00:00.000Z');
        expect(recurringBookingStart(january, 1, 'monthly', 'America/Santiago')?.toISOString())
            .toBe('2026-02-28T13:00:00.000Z');
        expect(recurringBookingStart(january, 2, 'monthly', 'America/Santiago')?.toISOString())
            .toBe('2026-03-31T13:00:00.000Z');
    });

    it('rechaza una hora de calendario que desaparece con el horario de verano', () => {
        const beforeClockChange = new Date('2026-03-01T07:30:00.000Z');
        expect(recurringBookingStart(beforeClockChange, 1, 'weekly', 'America/New_York')).toBeNull();
    });
});
