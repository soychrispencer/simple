import { Hono } from 'hono';
import type { Context } from 'hono';

export interface AccountsRouterDeps {
    authUser: (c: Context) => Promise<any>;
    ensurePrimaryAccountForUser: (user: any) => Promise<any>;
    getAccountMembershipsForUser: (userId: string) => any[];
    getUserByEmail: (email: string) => Promise<any | undefined>;
    accountsById: Map<string, any>;
    db: any;
    tables: { accounts: any; users: any };
    eq: any;
    mapAccountRow: (row: any) => any;
    upsertAccountCache: (account: any) => any;
    resolveBrowserOrigin: (c: Context) => string | null;
    isAuthEmailConfigured: () => boolean;
    issueEmailVerification: (userId: string, email: string, origin: string) => Promise<void>;
    getClientIdentifier: (c: Context) => string;
    consumeRateLimit: (key: string, limit: number, windowMs: number) => { ok: boolean; retryAfterSeconds: number };
    AUTH_RATE_LIMIT_WINDOW_MS: number;
    emailChangeRequestSchema: { safeParse: (payload: unknown) => { success: boolean; data?: { newEmail: string } } };
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

  app.post('/request-email-change', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = deps.emailChangeRequestSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Correo inválido.' }, 400);

    if (process.env.NODE_ENV === 'production' && !deps.isAuthEmailConfigured()) {
      return c.json({ ok: false, error: 'El cambio de correo no está configurado en este entorno.' }, 503);
    }

    const origin = deps.resolveBrowserOrigin(c);
    if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);

    const clientId = deps.getClientIdentifier(c);
    const ipRateLimit = deps.consumeRateLimit(
      `accounts:email-change:ip:${clientId}`,
      5,
      deps.AUTH_RATE_LIMIT_WINDOW_MS,
    );
    if (!ipRateLimit.ok) {
      c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
      return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, 429);
    }

    const normalizedEmail = parsed.data!.newEmail.trim().toLowerCase();
    if (normalizedEmail === user.email.trim().toLowerCase()) {
      return c.json({ ok: false, error: 'Ese correo ya es el de tu cuenta.' }, 400);
    }

    const existing = await deps.getUserByEmail(normalizedEmail);
    if (existing && existing.id !== user.id) {
      return c.json({ ok: false, error: 'Ese correo ya está registrado en otra cuenta.' }, 409);
    }

    const now = new Date();
    await deps.db.update(deps.tables.users).set({
      pendingEmail: normalizedEmail,
      updatedAt: now,
    }).where(deps.eq(deps.tables.users.id, user.id));

    try {
      await deps.issueEmailVerification(user.id, normalizedEmail, origin);
    } catch (error) {
      console.error('Email change verification error:', error);
      await deps.db.update(deps.tables.users).set({
        pendingEmail: null,
        updatedAt: new Date(),
      }).where(deps.eq(deps.tables.users.id, user.id));
      return c.json({ ok: false, error: 'No pudimos enviar el correo de confirmación. Inténtalo nuevamente.' }, 502);
    }

    return c.json({ ok: true, pendingEmail: normalizedEmail });
  });

  return app;
}
