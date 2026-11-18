import { describe, expect, it } from 'vitest';
import { bookingEmailActionUrl, buildBookingEmailPackage, getBookingEmailState, type BookingEmailData } from './booking-email.js';

const booking: BookingEmailData & { appUrl: string; cancelUrl: string } = {
    appointmentId: '8a5ec04c-ad3d-4b20-9e80-6f06c5c7ae02',
    clientName: 'Cliente de prueba',
    professionalName: 'Agenda de prueba',
    slug: 'agenda-de-prueba',
    serviceName: 'Consulta inicial',
    startsAt: new Date('2026-12-01T14:00:00Z'),
    endsAt: new Date('2026-12-01T14:30:00Z'),
    durationMinutes: 30,
    modality: 'presential',
    price: '10000',
    currency: 'CLP',
    timezone: 'America/Santiago',
    status: 'confirmed',
    appUrl: 'https://simpleagenda.app',
    cancelUrl: 'https://simpleagenda.app/cancelar',
};

describe('comprobantes de citas', () => {
    it('conserva como pendiente el anticipo de una cita con aprobación automática', () => {
        const pending = { ...booking, paymentStatus: 'pending' };
        expect(getBookingEmailState(pending)).toBe('payment_pending');
        expect(buildBookingEmailPackage(pending).html).toContain('Pendiente de pago');
        const url = new URL(bookingEmailActionUrl(pending));
        expect(url.pathname).toBe('/agenda-de-prueba');
        expect(url.searchParams.get('appt')).toBe(booking.appointmentId);
    });

    it('un pago recibido conserva la aprobación manual pendiente', () => {
        const paid = { ...booking, status: 'pending', paymentStatus: 'paid' };
        expect(getBookingEmailState(paid)).toBe('approval_pending');
        expect(buildBookingEmailPackage(paid).html).toContain('Pendiente de aprobación');
        expect(bookingEmailActionUrl(paid)).toBe(booking.appUrl);
    });

    it('informa el nuevo horario al mover la cita', () => {
        const moved = { ...booking, paymentStatus: 'paid', rescheduled: true };
        const { html } = buildBookingEmailPackage(moved);
        expect(html).toContain('Reprogramaste tu cita con Agenda de prueba');
        expect(html).toContain('Presencial');
    });
});
