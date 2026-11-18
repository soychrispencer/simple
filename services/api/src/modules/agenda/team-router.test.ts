import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { createAgendaTeamRouter } from './team-router.js';

vi.mock('../accounts/write-access.js', () => ({
    runAccountWorkspaceWrite: async (
        db: unknown, _input: unknown, authorize: (role: string) => boolean, write: (tx: unknown) => Promise<unknown>,
    ) => authorize('agent') ? { ok: true, value: await write(db) } : { ok: false },
}));

const agendaId = '490ad84e-b614-430b-b976-f8b07af38a3b';
const appointmentId = 'eabad83a-0b89-47b1-a364-e929f4ceb66e';

function fixture({ assigned = true, role = 'agent', updated = true } = {}) {
    const profile = { id: agendaId, slug: 'prueba', timezone: 'America/Santiago' };
    const appointment = { id: appointmentId, clientEmail: null };
    const workspace = { id: 'workspace', role, membershipId: 'member' };
    const where = vi.fn((_predicate: SQL) => ({ returning: async () => updated ? [appointment] : [] }));
    const update = vi.fn(() => ({ set: () => ({ where }) }));
    const select = vi.fn()
        .mockImplementationOnce(() => joinQuery([workspace]))
        .mockImplementationOnce(() => joinQuery([workspace]))
        .mockImplementationOnce(() => joinQuery(assigned ? [{ professionalId: agendaId }] : []))
        .mockImplementationOnce(() => joinQuery([{ agenda_professional_profiles: profile }]));
    const syncToGoogleCalendar = vi.fn().mockResolvedValue(null);
    const app = createAgendaTeamRouter({
        db: { select, update } as unknown as Parameters<typeof createAgendaTeamRouter>[0]['db'],
        authUser: async () => ({ id: 'operator' }),
        requireVerifiedSession: async (_context, next) => next(),
        logAudit: vi.fn().mockResolvedValue(undefined),
        syncToGoogleCalendar,
        sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
        scheduleDeps: {} as Parameters<typeof createAgendaTeamRouter>[0]['scheduleDeps'],
    });
    return { app, update, where, syncToGoogleCalendar };
}

function joinQuery(rows: unknown[]) {
    const query = {
        from: () => query,
        innerJoin: () => query,
        where: () => Object.assign(Promise.resolve(rows), { limit: async () => rows }),
    };
    return query;
}

const path = `/agendas/${agendaId}/appointments/${appointmentId}/confirm`;

it('blocks confirmation without a grant for the selected agenda', async () => {
    const { app, update } = fixture({ assigned: false });
    expect((await app.request(path, { method: 'POST' })).status).toBe(409);
    expect(update).not.toHaveBeenCalled();
});

it('requires an eligible payment status and sends calendar update only once the write succeeds', async () => {
    const { app, where, syncToGoogleCalendar } = fixture();
    expect((await app.request(path, { method: 'POST' })).status).toBe(200);
    const sql = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(sql.params).toEqual(expect.arrayContaining([appointmentId, agendaId, 'pending', 'paid', 'not_required']));
    expect(syncToGoogleCalendar).toHaveBeenCalledOnce();
    const conflict = fixture({ updated: false });
    expect((await conflict.app.request(path, { method: 'POST' })).status).toBe(409);
    expect(conflict.syncToGoogleCalendar).not.toHaveBeenCalled();
});
