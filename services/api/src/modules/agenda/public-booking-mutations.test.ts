import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPublicAgendaRouter, type AgendaRouterDeps } from './router.js';

const appointmentId = '60d19031-2dad-4bf2-9b86-269715805eeb';
const originalStart = '2026-12-10T14:00:00.000Z';
const replacementStart = '2026-12-11T14:00:00.000Z';
const replacementEnd = '2026-12-11T14:30:00.000Z';
const basePath = `/agenda-de-prueba/bookings/${appointmentId}`;

function makeFixture() {
    const profile = {
        id: 'profile-id',
        slug: 'agenda-de-prueba',
        displayName: 'Agenda de prueba',
        userId: 'owner-id',
        alwaysOpen: true,
        cancellationHours: 12,
        timezone: 'America/Santiago',
        acceptsMp: true,
        mpAccessToken: 'test-only',
    };
    const appointment = {
        id: appointmentId,
        startsAt: new Date(originalStart),
        endsAt: new Date('2026-12-10T14:30:00Z'),
        durationMinutes: 30,
        status: 'confirmed',
        paymentStatus: 'pending',
        clientEmail: null,
        price: '10000',
        currency: 'CLP',
        mpCheckoutUrl: null as string | null,
    };
    let generatedSlots = [{ startsAt: replacementStart, endsAt: replacementEnd }];
    const profiles = { id: 'professional-id', slug: 'professional-slug' };
    const appts = { id: 'appointment-id', professionalId: 'appointment-professional-id', startsAt: 'appointment-start' };
    const update = vi.fn((patch: Record<string, unknown>) => Object.assign(appointment, patch));
    const tx = {
        select: () => ({
            from: (table: unknown) => ({
                where: () => ({
                    limit: () => ({
                        for: async () => table === profiles ? [profile] : [appointment],
                    }),
                }),
            }),
        }),
        update: () => ({
            set: (patch: Record<string, unknown>) => ({
                where: () => ({
                    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(update(patch))),
                    returning: async () => [update(patch)],
                }),
            }),
        }),
    };
    const createCheckoutPreference = vi.fn().mockResolvedValue({ initPoint: 'https://www.mercadopago.cl/checkout/test' });
    const app = createPublicAgendaRouter({
        db: {
            query: { agendaProfessionalProfiles: { findFirst: async () => profile } },
            transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
        },
        tables: { agendaProfessionalProfiles: profiles, agendaAppointments: appts, agendaBlockedSlots: {} },
        dbHelpers: { eq: vi.fn(), and: vi.fn(), inArray: vi.fn(), lt: vi.fn() },
        sql: vi.fn(),
        rateLimit: () => async (_context: unknown, next: () => Promise<void>) => next(),
        generateSlots: () => generatedSlots,
        logAudit: vi.fn(),
        sendPushToUser: vi.fn(),
        createCheckoutPreference,
    } as unknown as AgendaRouterDeps);
    return {
        app,
        appointment,
        update,
        createCheckoutPreference,
        clearSlots() { generatedSlots = []; },
    };
}

function rescheduleBody(startsAt: string, expectedStartsAt = originalStart) {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startsAt, expectedStartsAt }),
    };
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-01T13:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('gestión pública de una cita existente', () => {
    it('reintenta la preferencia de pago sobre la misma cita y reutiliza el enlace aceptado', async () => {
        const { app, appointment, createCheckoutPreference, update } = makeFixture();
        createCheckoutPreference.mockRejectedValueOnce(new Error('proveedor no disponible'));
        const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            expect((await app.request(basePath + '/checkout', { method: 'POST' })).status).toBe(502);
            expect(appointment.mpCheckoutUrl).toBeNull();
            const recovered = await app.request(basePath + '/checkout', { method: 'POST' });
            expect(await recovered.json()).toEqual({ ok: true, checkoutUrl: 'https://www.mercadopago.cl/checkout/test' });
            expect((await app.request(basePath + '/checkout', { method: 'POST' })).status).toBe(200);
            expect(createCheckoutPreference).toHaveBeenCalledTimes(2);
            expect(createCheckoutPreference).toHaveBeenLastCalledWith(expect.objectContaining({ externalReference: appointmentId, amount: 10000 }));
            expect(update).toHaveBeenCalledTimes(1);
        } finally {
            logger.mockRestore();
        }
    });

    it('conserva la cita original cuando el nuevo horario ya no está disponible', async () => {
        const { app, appointment, clearSlots, update } = makeFixture();
        clearSlots();
        const response = await app.request(basePath + '/reschedule', rescheduleBody(replacementStart));
        expect(response.status).toBe(409);
        expect(appointment.startsAt.toISOString()).toBe(originalStart);
        expect(update).not.toHaveBeenCalled();
    });

    it('mueve la cita conservando el identificador y el estado de pago', async () => {
        const { app, appointment, update } = makeFixture();
        const response = await app.request(basePath + '/reschedule', rescheduleBody(replacementStart));
        expect(response.status).toBe(200);
        expect(appointment).toMatchObject({ id: appointmentId, paymentStatus: 'pending', status: 'confirmed' });
        expect(appointment.startsAt.toISOString()).toBe(replacementStart);
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            startsAt: new Date(replacementStart),
            endsAt: new Date(replacementEnd),
            reminderSentAt: null,
            reminder30minSentAt: null,
        }));
        const stale = await app.request(basePath + '/reschedule', rescheduleBody('2026-12-12T14:00:00.000Z'));
        expect(stale.status).toBe(409);
        expect(update).toHaveBeenCalledTimes(1);
    });
});
