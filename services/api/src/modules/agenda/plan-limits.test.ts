import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const returning = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const set = vi.hoisted(() => vi.fn());
vi.mock('../../db/index.js', () => ({ db: {
    update: () => ({ set }),
} }));
import { ensureAgendaProfileTrial, expiredAgendaPlanEndsAt, hasAgendaFullAccess } from './plan-limits.js';

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
    vi.stubEnv('AGENDA_LAUNCH_MODE', 'false');
    vi.stubEnv('NEXT_PUBLIC_AGENDA_LAUNCH_MODE', 'false');
    set.mockClear();
    set.mockReturnValue({ where: () => ({ returning }) });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

it('asigna una primera prueba vigente a un perfil antiguo sin fecha', async () => {
    await ensureAgendaProfileTrial({ id: 'legacy', plan: 'free', planExpiresAt: null, createdAt: new Date('2020-01-01') } as any);
    expect(set.mock.calls[0][0].planExpiresAt.getTime()).toBeGreaterThan(Date.now());
});
it('no regenera una prueba vencida o cancelada', async () => {
    const profile = { id: 'expired', plan: 'free', planExpiresAt: expiredAgendaPlanEndsAt() };
    expect(await ensureAgendaProfileTrial(profile as any)).toBe(profile);
    expect(set).not.toHaveBeenCalled();
    expect(hasAgendaFullAccess(profile)).toBe(false);
});
it('mantiene acceso de Pro vigente y bloquea Pro vencido', () => {
    expect(hasAgendaFullAccess({ plan: 'pro', planExpiresAt: null })).toBe(true);
    expect(hasAgendaFullAccess({ plan: 'pro', planExpiresAt: expiredAgendaPlanEndsAt() })).toBe(false);
});
