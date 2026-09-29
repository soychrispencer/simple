import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ limit: vi.fn(), update: vi.fn(), downgrade: vi.fn() }));
vi.mock('../../db/index.js', () => ({ db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }),
    update: mocks.update,
    insert: () => ({ values: () => ({ returning: async () => [{ id: 'new-subscription' }] }) }),
} }));
vi.mock('../agenda/plan-limits.js', () => ({
    downgradeAgendaProfileAccess: mocks.downgrade,
    expiredAgendaPlanEndsAt: () => new Date(0),
}));
import { agendaProfessionalProfiles } from '../../db/schema.js';
import { persistUserSubscription } from './persist-db.js';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue({ set: () => ({ where: async () => undefined }) });
});

it.each([true, false])('un plan de Autos no cambia Agenda (suscripción existente: %s)', async (existing) => {
    mocks.limit.mockResolvedValueOnce([{ id: 'plan' }]).mockResolvedValueOnce(existing ? [{ id: 'sub' }] : []);
    await persistUserSubscription({ userId: 'user', accountId: null, vertical: 'autos', planSlug: 'pro', providerSubscriptionId: 'mp', providerStatus: 'cancelled', status: 'cancelled' });
    expect(mocks.downgrade).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls.some(([table]) => table === agendaProfessionalProfiles)).toBe(false);
});
it('cancelar Agenda revoca únicamente su acceso', async () => {
    mocks.limit.mockResolvedValueOnce([{ id: 'plan' }]).mockResolvedValueOnce([{ id: 'sub' }]);
    await persistUserSubscription({ userId: 'user', accountId: null, vertical: 'agenda', planSlug: 'pro', providerSubscriptionId: 'mp', providerStatus: 'cancelled', status: 'cancelled' });
    expect(mocks.downgrade).toHaveBeenCalledWith('user', new Date(0));
    expect(mocks.limit).toHaveBeenCalledTimes(2);
});
