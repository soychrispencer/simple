import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import { env } from '../src/env.js';
import { db, pgClient } from '../src/db/index.js';
import * as schema from '../src/db/schema.js';
import { generateSlots, isFreePlan, checkAppointmentLimit } from '../src/modules/agenda/plan-limits.js';
import { createAgendaTeamRouter } from '../src/modules/agenda/team-router.js';

async function main() {
    const host = env.DATABASE_URL ? new URL(env.DATABASE_URL).hostname : env.PGHOST;
    assert.ok(host && ['localhost', '127.0.0.1', '[::1]'].includes(host), 'La prueba requiere PostgreSQL local.');
    const rollback = Symbol('rollback test fixtures');
    try {
        await db.transaction(async (tx) => {
            const [owner, agent, outsider] = await tx.insert(schema.users).values(
                ['Dueño de ensayo', 'Recepción de ensayo', 'Otro espacio de ensayo'].map((name) => ({
                    name, email: randomUUID() + '@example.test', status: 'verified',
                })),
            ).returning();
            const [space, other] = await tx.insert(schema.accounts).values([
                { name: 'Negocio de ensayo', ownerUserId: owner.id, isPersonal: false },
                { name: 'Otro espacio de ensayo', ownerUserId: outsider.id, isPersonal: false },
            ]).returning();
            const [, delegate] = await tx.insert(schema.accountUsers).values([
                { accountId: space.id, userId: owner.id, role: 'owner', isDefault: true },
                { accountId: space.id, userId: agent.id, role: 'agent', isDefault: true },
                { accountId: other.id, userId: outsider.id, role: 'owner', isDefault: true },
            ]).returning();
            await tx.insert(schema.accountVerticalSettings).values({ accountId: space.id, vertical: 'agenda', accountKind: 'company' });
            const [profile] = await tx.insert(schema.agendaProfessionalProfiles).values({
                accountId: space.id, userId: owner.id, slug: 'qa-' + randomUUID(),
                displayName: 'Agenda de ensayo', plan: 'pro', alwaysOpen: true, timezone: 'America/Santiago',
            }).returning();
            const [service] = await tx.insert(schema.agendaServices).values({
                professionalId: profile.id, name: 'Atención de ensayo', durationMinutes: 30,
            }).returning();

            let user = agent;
            const app = createAgendaTeamRouter({
                db: tx as unknown as typeof db,
                authUser: async () => user,
                requireVerifiedSession: async (_context, next) => next(),
                syncToGoogleCalendar: async () => null,
                sendBookingConfirmationEmail: async () => {},
                logAudit: async () => {},
                scheduleDeps: {
                    db: tx, sql, tables: schema,
                    dbHelpers: { eq, and, lt } as Parameters<typeof createAgendaTeamRouter>[0]['scheduleDeps']['dbHelpers'],
                    generateSlots, isFreePlan, checkAppointmentLimit,
                },
            });
            const route = '/agendas/' + profile.id;
            const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
            const options = (value: object) => ({
                method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value),
            });
            const grant = (enabled: boolean) => app.request('/assignment', {
                ...options({ membershipId: delegate.id, professionalId: profile.id, enabled }), method: 'PUT',
            });
            const serviceQuery = route + '/schedule?date=' + date + '&serviceId=' + service.id;
            assert.equal((await app.request(serviceQuery)).status, 404);
            user = owner;
            assert.equal((await grant(true)).status, 200);
            user = outsider;
            assert.equal((await app.request(serviceQuery)).status, 404);
            user = agent;
            const available = await app.request(serviceQuery);
            assert.equal(available.status, 200);
            const { slots } = await available.json() as { slots: Array<{ startsAt: string }> };
            assert.ok(slots.length > 2);
            const booking = { serviceId: service.id, startsAt: slots[1].startsAt, clientName: 'Cliente de ensayo' };
            const created = await app.request(route + '/schedule', options(booking));
            assert.equal(created.status, 200, await created.text());
            assert.equal((await app.request(route + '/schedule', options(booking))).status, 409);

            type Appointment = { id: string; startsAt: string; paymentStatus: string };
            const list = async () => (await (await app.request(route + '/appointments')).json() as { appointments: Appointment[] }).appointments;
            const listed = await list();
            assert.equal(listed.length, 1);
            const [appointment] = listed;
            const moveQuery = route + '/schedule?date=' + date + '&appointmentId=' + appointment.id;
            const choices = await app.request(moveQuery);
            assert.equal(choices.status, 200);
            const replacements = (await choices.json() as { slots: Array<{ startsAt: string }> }).slots;
            const replacement = replacements.find((slot) => slot.startsAt !== appointment.startsAt);
            assert.ok(replacement);
            const change = {
                appointmentId: appointment.id, startsAt: replacement.startsAt, expectedStartsAt: appointment.startsAt,
            };
            const moved = await app.request(route + '/schedule', options(change));
            assert.equal(moved.status, 200, await moved.text());
            const [updated] = await list();
            assert.equal(updated.id, appointment.id);
            assert.equal(updated.startsAt, replacement.startsAt);
            assert.equal(updated.paymentStatus, appointment.paymentStatus);
            assert.equal((await app.request(route + '/schedule', options(change))).status, 409);
            user = owner;
            assert.equal((await grant(false)).status, 200);
            user = agent;
            assert.equal((await app.request(serviceQuery)).status, 404);
            throw rollback;
        });
    } catch (error) {
        if (error !== rollback) throw error;
        console.log('Recepción validada en PostgreSQL local. Los datos de ensayo se revirtieron.');
    } finally {
        await pgClient.end();
    }
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
