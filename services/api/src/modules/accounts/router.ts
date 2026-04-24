import { Hono } from 'hono';
import type { Context } from 'hono';

export interface AccountsRouterDeps {
    authUser: (c: Context) => Promise<any>;
    ensurePrimaryAccountForUser: (user: any) => Promise<any>;
    getAccountMembershipsForUser: (userId: string) => any[];
    accountsById: Map<string, any>;
    db: any;
    tables: { accounts: any };
    eq: any;
    mapAccountRow: (row: any) => any;
    upsertAccountCache: (account: any) => any;
}

export function createAccountsRouter(deps: AccountsRouterDeps) {
  const app = new Hono();

  app.get('/current', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const account = await deps.ensurePrimaryAccountForUser(user);
    const memberships = deps.getAccountMembershipsForUser(user.id)
      .map((membership: any) => ({
        ...membership,
        account: deps.accountsById.get(membership.accountId) ?? null,
      }));

    return c.json({
      ok: true,
      account,
      memberships,
    });
  });

  app.patch('/current', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
    if (!name) return c.json({ ok: false, error: 'Nombre inválido' }, 400);

    const account = await deps.ensurePrimaryAccountForUser(user);
    const rows = await deps.db.update(deps.tables.accounts).set({
      name,
      updatedAt: new Date(),
    }).where(deps.eq(deps.tables.accounts.id, account.id)).returning();

    const updated = deps.upsertAccountCache(deps.mapAccountRow(rows[0]));
    return c.json({ ok: true, account: updated });
  });

  return app;
}
