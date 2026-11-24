import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const returning = vi.hoisted(() => vi.fn());
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
    returning.mockResolvedValue([{ id: 'legacy', plan: 'free', planExpiresAt: new Date('2026-10-29T12:00:00Z') }]);
    set.mockReturnValue({ where: () => ({ returning }) });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

it('mantiene Gratis hasta que el negocio active voluntariamente su prueba', async () => {
    const profile = { id: 'new', plan: 'free', planExpiresAt: null, createdAt: new Date('2026-09-01') };
    expect(await ensureAgendaProfileTrial(profile as any)).toBe(profile);
    expect(set).not.toHaveBeenCalled();
    expect(hasAgendaFullAccess(profile)).toBe(false);
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
