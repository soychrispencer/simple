import { Hono } from 'hono';
import type { Context } from 'hono';
import { and, asc, desc, inArray, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { getOperatorSubtypes, isOperatorSubtypeOther, normalizeOperatorSubtype } from '@simple/utils';
import { insertPlatformNotifications } from '../platform/notifications-service.js';
import { canManageAccountRole, isAccountOwnerRole } from './permissions.js';

const WORKSPACE_VERTICALS = ['autos', 'propiedades', 'agenda', 'serenatas'] as const;
type WorkspaceVertical = (typeof WORKSPACE_VERTICALS)[number];
type WorkspaceAccountKind = 'individual' | 'independent' | 'company';
type AccountTeamVertical = 'autos' | 'propiedades';
type AccountTeamListSection = 'all' | 'members' | 'invitations';
const ACCOUNT_TEAM_LIST_PAGE_SIZE = 50;

function parseAccountTeamVertical(value: string | undefined): AccountTeamVertical | null {
    if (value === undefined || value === '') return 'propiedades';
    return value === 'autos' || value === 'propiedades' ? value : null;
}

function parseAccountTeamListOffset(value: string | undefined): number | null {
    if (value === undefined || value === '') return 0;
    const offset = Number(value);
    return Number.isSafeInteger(offset) && offset >= 0 ? offset : null;
}

function parseWorkspaceVertical(value: string | undefined): WorkspaceVertical | null {
    return WORKSPACE_VERTICALS.find((vertical) => vertical === value) ?? null;
}

export interface AccountsRouterDeps {
    authUser: (c: Context) => Promise<any>;
    ensurePrimaryAccountForUser: (user: any) => Promise<any>;
    getAccountMembershipsForUser: (userId: string) => any[];
    getUserByEmail: (email: string) => Promise<any | undefined>;
    accountsById: Map<string, any>;
    db: any;
    tables: {
      accounts: any;
      accountUsers: any;
      accountInvitations: any;
      accountListingAssignments: any;
      accountRelationshipAssignments: any;
      accountRelationshipTasks: any;
      agendaAccountVisits: any;
      messageThreads: any;
      platformNotifications: any;
      users: any;
      addressBook: any;
      accountVerticalSettings: any;
      publicProfiles: any;
    };
    eq: any;
    and: any;
    gt: any;
    inArray: any;
    isNull: any;
    mapAccountRow: (row: any) => any;
    mapAccountUserRow: (row: any) => any;
    mapPublicProfileRow: (row: any) => any;
    upsertAccountCache: (account: any) => any;
    upsertAccountUserCache: (membership: any) => any;
    setDefaultAccountForUser: (userId: string, accountId: string) => void;
    removeAccountUserCache: (userId: string, membershipId: string) => void;
    upsertPublicProfileCache: (profile: any) => any;
    resolveBrowserOrigin: (c: Context) => string | null;
    isAuthEmailConfigured: () => boolean;
    issueEmailVerification: (userId: string, email: string, origin: string) => Promise<void>;
    sendAccountInvitationEmail: (input: {
      email: string;
      inviteUrl: string;
      inviterName: string;
      accountName: string;
      role: 'admin' | 'agent';
      expiresAt: Date;
      origin: string;
    }) => Promise<boolean>;
    getClientIdentifier: (c: Context) => string;
    consumeRateLimit: (key: string, limit: number, windowMs: number) => { ok: boolean; retryAfterSeconds: number };
    AUTH_RATE_LIMIT_WINDOW_MS: number;
    getMarketplaceEntitlements: (
      user: any,
      vertical: 'autos' | 'propiedades',
      accountId?: string | null,
    ) => Promise<any | null>;
    emailChangeRequestSchema: { safeParse: (payload: unknown) => { success: boolean; data?: { newEmail: string } } };
    syncPropertyVisitToGoogleCalendar: (input: {
      visit: {
        id: string;
        accountId: string;
        visitType: string;
        startsAt: Date;
        durationMinutes: number;
        contactName: string;
        location: string | null;
        googleEventId: string | null;
        googleCalendarOwnerUserId: string | null;
      };
      listingTitle: string | null;
      targetUserId: string | null;
      action: 'upsert' | 'delete';
    }) => Promise<{ ok: boolean; eventId: string | null; ownerUserId: string | null; connected: boolean }>;
}

export function createAccountsRouter(deps: AccountsRouterDeps) {
  const app = new Hono();

  async function lockUserAccountContext(tx: any, userId: string): Promise<void> {
    await tx.select({ id: deps.tables.users.id })
      .from(deps.tables.users)
      .where(deps.eq(deps.tables.users.id, userId))
      .for('update');
  }

  async function lockManagedAccount(tx: any, userId: string, accountId: string) {
    const [membership] = await tx.select({ role: deps.tables.accountUsers.role })
      .from(deps.tables.accountUsers)
      .where(deps.and(
        deps.eq(deps.tables.accountUsers.accountId, accountId),
        deps.eq(deps.tables.accountUsers.userId, userId),
      ))
      .limit(1)
      .for('update');
    if (!canManageAccountRole(membership?.role)) return null;

    const [account] = await tx.select().from(deps.tables.accounts)
      .where(deps.eq(deps.tables.accounts.id, accountId))
      .limit(1)
      .for('update');
    if (!account) return null;
    return { membership, account };
  }

  async function isDefaultWorkspace(tx: any, userId: string, accountId: string): Promise<boolean> {
    const [membership] = await tx.select({ accountId: deps.tables.accountUsers.accountId })
      .from(deps.tables.accountUsers)
      .where(deps.and(
        deps.eq(deps.tables.accountUsers.userId, userId),
        deps.eq(deps.tables.accountUsers.isDefault, true),
      ))
      .limit(1);
    return membership?.accountId === accountId;
  }

  async function getCurrentAccountMembership(user: any) {
    const account = await deps.ensurePrimaryAccountForUser(user);
    const [membership] = await deps.db.select().from(deps.tables.accountUsers).where(deps.and(
      deps.eq(deps.tables.accountUsers.accountId, account.id),
      deps.eq(deps.tables.accountUsers.userId, user.id),
    )).limit(1);
    return { account, membership };
  }

  function canManageAccount(membership: any): boolean {
    return canManageAccountRole(membership?.role);
  }

  app.get('/current/workspace', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseWorkspaceVertical(c.req.query('vertical'));
    if (!vertical) return c.json({ ok: false, error: 'Producto no disponible.' }, 400);

    const account = await deps.ensurePrimaryAccountForUser(user);
    const membership = deps.getAccountMembershipsForUser(user.id)
      .find((item: any) => item.accountId === account.id);
    const canManage = canManageAccountRole(membership?.role);
    const [workspace] = await deps.db
      .select()
      .from(deps.tables.accountVerticalSettings)
      .where(deps.and(
        deps.eq(deps.tables.accountVerticalSettings.accountId, account.id),
        deps.eq(deps.tables.accountVerticalSettings.vertical, vertical),
      ))
      .limit(1);

    if (workspace) return c.json({ ok: true, workspace, accountName: account.name, canManage, memberRole: membership?.role ?? null });

    // Transitional read for profiles created before activity was stored on the account.
    let [profile] = await deps.db
      .select()
      .from(deps.tables.publicProfiles)
      .where(deps.and(
        deps.eq(deps.tables.publicProfiles.userId, user.id),
        deps.eq(deps.tables.publicProfiles.vertical, vertical),
        deps.eq(deps.tables.publicProfiles.accountId, account.id),
      ))
      .limit(1);
    if (!profile && account.isPersonal && account.ownerUserId === user.id) {
      [profile] = await deps.db
        .select()
        .from(deps.tables.publicProfiles)
        .where(deps.and(
          deps.eq(deps.tables.publicProfiles.userId, user.id),
          deps.eq(deps.tables.publicProfiles.vertical, vertical),
          deps.isNull(deps.tables.publicProfiles.accountId),
        ))
        .limit(1);
    }
    if (!profile) {
      return c.json({ ok: true, workspace: null, accountName: account.name, canManage, memberRole: membership?.role ?? null });
    }

    return c.json({
      ok: true,
      accountName: account.name,
      canManage,
      memberRole: membership?.role ?? null,
      workspace: {
        accountId: account.id,
        vertical,
        accountKind: profile.accountKind,
        operatorSubtype: profile.operatorSubtype ?? null,
        operatorSubtypeCustom: profile.operatorSubtypeCustom ?? null,
        onboardingCompletedAt: profile.operatorSubtype || profile.isPublished
          ? profile.updatedAt
          : null,
        updatedAt: profile.updatedAt,
      },
    });
  });

  app.put('/current/workspace', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseWorkspaceVertical(c.req.query('vertical'));
    if (!vertical) return c.json({ ok: false, error: 'Producto no disponible.' }, 400);

    const account = await deps.ensurePrimaryAccountForUser(user);
    let activityAccount = account;
    let accountChanged = false;
    const membership = deps.getAccountMembershipsForUser(user.id)
      .find((item: any) => item.accountId === account.id);
    if (!canManageAccountRole(membership?.role)) {
      return c.json({ ok: false, error: 'Solo quien administra este espacio puede cambiar su actividad.' }, 403);
    }

    const payload = await c.req.json().catch(() => null);
    const accountKind = payload?.accountKind as WorkspaceAccountKind;
    if (!['individual', 'independent', 'company'].includes(accountKind)) {
      return c.json({ ok: false, error: 'Elige cómo trabajas para preparar tu espacio.' }, 400);
    }
    const accountName = typeof payload?.accountName === 'string' ? payload.accountName.trim() : '';
    if (accountKind === 'company' && (!accountName || accountName.length > 160)) {
      return c.json({ ok: false, error: 'Escribe el nombre de tu empresa o equipo (hasta 160 caracteres).' }, 400);
    }

    const subtypeOptions = getOperatorSubtypes(vertical, accountKind);
    const rawSubtype = typeof payload?.operatorSubtype === 'string' ? payload.operatorSubtype : null;
    const operatorSubtype = normalizeOperatorSubtype(vertical, accountKind, rawSubtype);
    if (!operatorSubtype || !subtypeOptions.some((item) => item.id === operatorSubtype)) {
      return c.json({ ok: false, error: 'Elige la actividad que mejor describe tu trabajo.' }, 400);
    }

    const operatorSubtypeCustom = isOperatorSubtypeOther(operatorSubtype)
      ? (typeof payload?.operatorSubtypeCustom === 'string' ? payload.operatorSubtypeCustom.trim() : '')
      : '';
    if (isOperatorSubtypeOther(operatorSubtype) && !operatorSubtypeCustom) {
      return c.json({ ok: false, error: 'Cuéntanos brevemente a qué te dedicas.' }, 400);
    }
    if (operatorSubtypeCustom.length > 160) {
      return c.json({ ok: false, error: 'La descripción debe tener 160 caracteres o menos.' }, 400);
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
      let currentEntitlements: any;
      try {
        currentEntitlements = await deps.getMarketplaceEntitlements(user, vertical, account.id);
      } catch {
        return c.json({
          ok: false,
          error: 'No pudimos verificar el plan de este espacio. No se cambió la actividad; inténtalo nuevamente.',
        }, 503);
      }
      if (!currentEntitlements || currentEntitlements.accountId !== account.id) {
        return c.json({
          ok: false,
          error: 'No pudimos verificar el plan de este espacio. No se cambió la actividad; inténtalo nuevamente.',
        }, 503);
      }
      const activePlanId = currentEntitlements.plan?.id ?? 'free';
      if (accountKind === 'individual' && activePlanId !== 'free') {
        return c.json({
          ok: false,
          errorCode: 'active_plan_activity_conflict',
          error: 'Este espacio tiene un plan profesional activo. Revisa o cancela el plan desde Mi cuenta > Suscripción antes de cambiar la actividad a Particular. No se aplicó ningún cambio.',
        }, 409);
      }
      if (accountKind === 'independent' && activePlanId === 'enterprise') {
        return c.json({
          ok: false,
          errorCode: 'active_plan_activity_conflict',
          error: 'El plan Empresa activo no corresponde a la actividad Profesional. Cambia o cancela el plan desde Mi cuenta > Suscripción antes de guardar. No se aplicó ningún cambio.',
        }, 409);
      }
    }

    if (accountKind === 'company' && account.isPersonal) {
      const ownedBusinessAccounts = deps.getAccountMembershipsForUser(user.id)
        .filter((item: any) => item.role === 'owner')
        .map((item: any) => deps.accountsById.get(item.accountId))
        .filter((candidate: any) => candidate && !candidate.isPersonal);
      if (ownedBusinessAccounts.length > 1) {
        return c.json({ ok: false, error: 'Ya tienes varios espacios de empresa. Cambia al espacio que quieres configurar y vuelve a intentarlo.' }, 409);
      }
      if (ownedBusinessAccounts.length === 1) {
        activityAccount = ownedBusinessAccounts[0];
        const now = new Date();
        const switched = await deps.db.transaction(async (tx: any) => {
          await lockUserAccountContext(tx, user.id);
          if (!await isDefaultWorkspace(tx, user.id, account.id)) return false;
          const [targetMembership] = await tx.select({ id: deps.tables.accountUsers.id })
            .from(deps.tables.accountUsers)
            .where(deps.and(
              deps.eq(deps.tables.accountUsers.userId, user.id),
              deps.eq(deps.tables.accountUsers.accountId, activityAccount.id),
            ))
            .limit(1);
          if (!targetMembership) return false;
          await tx.update(deps.tables.accountUsers)
            .set({ isDefault: false, updatedAt: now })
            .where(deps.eq(deps.tables.accountUsers.userId, user.id));
          await tx.update(deps.tables.accountUsers)
            .set({ isDefault: true, updatedAt: now })
            .where(deps.and(
              deps.eq(deps.tables.accountUsers.userId, user.id),
              deps.eq(deps.tables.accountUsers.accountId, activityAccount.id),
            ));
          return true;
        });
        if (!switched) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página y vuelve a intentarlo.' }, 409);
        deps.setDefaultAccountForUser(user.id, activityAccount.id);
      } else {
        const now = new Date();
        const created = await deps.db.transaction(async (tx: any) => {
          await lockUserAccountContext(tx, user.id);
          if (!await isDefaultWorkspace(tx, user.id, account.id)) return null;
          const [newAccount] = await tx.insert(deps.tables.accounts).values({
            name: accountName,
            type: account.type ?? 'general',
            ownerUserId: user.id,
            isPersonal: false,
            createdAt: now,
            updatedAt: now,
          }).returning();
          await tx.update(deps.tables.accountUsers)
            .set({ isDefault: false, updatedAt: now })
            .where(deps.eq(deps.tables.accountUsers.userId, user.id));
          const [newMembership] = await tx.insert(deps.tables.accountUsers).values({
            accountId: newAccount.id,
            userId: user.id,
            role: 'owner',
            isDefault: true,
            createdAt: now,
            updatedAt: now,
          }).returning();
          return { account: newAccount, membership: newMembership };
        });
        if (!created) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página y vuelve a intentarlo.' }, 409);
        activityAccount = deps.upsertAccountCache(deps.mapAccountRow(created.account));
        deps.upsertAccountUserCache(deps.mapAccountUserRow(created.membership));
        deps.setDefaultAccountForUser(user.id, activityAccount.id);
      }
      accountChanged = activityAccount.id !== account.id;
    }

    const now = new Date();
    const saved = await deps.db.transaction(async (tx: any) => {
      await lockUserAccountContext(tx, user.id);
      const managed = await lockManagedAccount(tx, user.id, activityAccount.id);
      if (!managed || !await isDefaultWorkspace(tx, user.id, activityAccount.id)) return null;

      if (!managed.account.isPersonal) {
        const [currentWorkspace] = await tx.select({ accountKind: deps.tables.accountVerticalSettings.accountKind })
          .from(deps.tables.accountVerticalSettings)
          .where(deps.and(
            deps.eq(deps.tables.accountVerticalSettings.accountId, activityAccount.id),
            deps.eq(deps.tables.accountVerticalSettings.vertical, vertical),
          ))
          .limit(1);
        const currentAccountKind = currentWorkspace?.accountKind ?? 'company';
        if (!accountChanged && accountKind !== currentAccountKind) {
          return { kind: 'workspace-kind-locked' as const };
        }
      }

      const [savedWorkspace] = await tx
        .insert(deps.tables.accountVerticalSettings)
        .values({
          accountId: activityAccount.id,
          vertical,
          accountKind,
          operatorSubtype,
          operatorSubtypeCustom: operatorSubtypeCustom || null,
          onboardingCompletedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [deps.tables.accountVerticalSettings.accountId, deps.tables.accountVerticalSettings.vertical],
          set: {
            accountKind,
            operatorSubtype,
            operatorSubtypeCustom: operatorSubtypeCustom || null,
            onboardingCompletedAt: now,
            updatedAt: now,
          },
        })
        .returning();

      let updatedAccount = managed.account;
      if (accountKind === 'company') {
        const [accountRow] = await tx.update(deps.tables.accounts)
          .set({ name: accountName, isPersonal: false, updatedAt: now })
          .where(deps.eq(deps.tables.accounts.id, activityAccount.id))
          .returning();
        if (accountRow) updatedAccount = accountRow;
      }

      // Keep the public profile in step during the transition to account-owned activity.
      let [profile] = await tx.select()
        .from(deps.tables.publicProfiles)
        .where(deps.and(
          deps.eq(deps.tables.publicProfiles.accountId, activityAccount.id),
          deps.eq(deps.tables.publicProfiles.vertical, vertical),
        ))
        .limit(1);
      if (!profile && managed.account.isPersonal && managed.account.ownerUserId === user.id) {
        [profile] = await tx.select()
          .from(deps.tables.publicProfiles)
          .where(deps.and(
            deps.eq(deps.tables.publicProfiles.userId, user.id),
            deps.eq(deps.tables.publicProfiles.vertical, vertical),
            deps.isNull(deps.tables.publicProfiles.accountId),
          ))
          .limit(1);
      }
      let updatedProfile = null;
      if (profile) {
        const [profileRow] = await tx.update(deps.tables.publicProfiles)
          .set({ accountId: activityAccount.id, accountKind, operatorSubtype, operatorSubtypeCustom: operatorSubtypeCustom || null, updatedAt: now })
          .where(deps.eq(deps.tables.publicProfiles.id, profile.id))
          .returning();
        updatedProfile = profileRow ?? null;
      }
      return { kind: 'saved' as const, workspace: savedWorkspace, account: updatedAccount, profile: updatedProfile };
    });
    if (!saved) {
      return c.json({ ok: false, error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.' }, 403);
    }
    if (saved.kind === 'workspace-kind-locked') {
      return c.json({
        ok: false,
        errorCode: 'workspace_kind_locked',
        error: 'Este espacio conserva su tipo para mantener claro el trabajo del equipo. Cambia al espacio personal desde el selector para configurar otra actividad; los datos y el equipo de esta empresa no se moverán.',
      }, 409);
    }
    activityAccount = deps.upsertAccountCache(deps.mapAccountRow(saved.account));
    if (saved.profile) deps.upsertPublicProfileCache(deps.mapPublicProfileRow(saved.profile));

    const savedMembership = deps.getAccountMembershipsForUser(user.id)
      .find((item: any) => item.accountId === activityAccount.id);
    return c.json({
      ok: true,
      workspace: saved.workspace,
      accountName: activityAccount.name,
      canManage: canManageAccountRole(savedMembership?.role),
      memberRole: savedMembership?.role ?? null,
      accountChanged,
    });
  });

  app.get('/current', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const primaryAccount = await deps.ensurePrimaryAccountForUser(user);
    const memberships = deps.getAccountMembershipsForUser(user.id);
    const accountIds = [...new Set(memberships.map((membership: any) => membership.accountId))];
    const accountRows = accountIds.length
      ? await deps.db.select().from(deps.tables.accounts).where(inArray(deps.tables.accounts.id, accountIds))
      : [];
    for (const row of accountRows) deps.upsertAccountCache(deps.mapAccountRow(row));

    const account = deps.accountsById.get(primaryAccount.id) ?? primaryAccount;
    const responseMemberships = memberships
      .map((membership: any) => ({
        ...membership,
        account: deps.accountsById.get(membership.accountId) ?? null,
      }));

    return c.json({
      ok: true,
      account,
      memberships: responseMemberships,
    });
  });

  app.post('/current/switch', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const accountId = typeof payload?.accountId === 'string' ? payload.accountId.trim() : '';
    const now = new Date();
    const membership = await deps.db.transaction(async (tx: any) => {
      await lockUserAccountContext(tx, user.id);
      const [targetMembership] = await tx.select()
        .from(deps.tables.accountUsers)
        .where(deps.and(
          deps.eq(deps.tables.accountUsers.userId, user.id),
          deps.eq(deps.tables.accountUsers.accountId, accountId),
        ))
        .limit(1);
      if (!targetMembership) return null;
      await tx.update(deps.tables.accountUsers)
        .set({ isDefault: false, updatedAt: now })
        .where(deps.eq(deps.tables.accountUsers.userId, user.id));
      await tx.update(deps.tables.accountUsers)
        .set({ isDefault: true, updatedAt: now })
        .where(deps.and(
          deps.eq(deps.tables.accountUsers.userId, user.id),
          deps.eq(deps.tables.accountUsers.accountId, accountId),
        ));
      return targetMembership;
    });
    if (!membership) return c.json({ ok: false, error: 'No tienes acceso a ese espacio.' }, 403);
    deps.setDefaultAccountForUser(user.id, accountId);
    deps.upsertAccountUserCache(deps.mapAccountUserRow({ ...membership, isDefault: true }));
    const account = deps.accountsById.get(accountId) ?? null;
    return c.json({ ok: true, account, membership: { ...membership, isDefault: true } });
  });

  app.post('/current/business-spaces', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const { account, membership } = await getCurrentAccountMembership(user);
    if (!membership || membership.role !== 'owner' || !account.isPersonal) {
      return c.json({ ok: false, error: 'Cambia a tu cuenta personal para crear otro espacio.' }, 403);
    }

    const payload = await c.req.json().catch(() => null);
    const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
    if (!name || name.length > 160) {
      return c.json({ ok: false, error: 'Escribe un nombre de hasta 160 caracteres para el espacio.' }, 400);
    }

    const now = new Date();
    const created = await deps.db.transaction(async (tx: any) => {
      await lockUserAccountContext(tx, user.id);
      const managed = await lockManagedAccount(tx, user.id, account.id);
      if (!managed || managed.membership.role !== 'owner' || !managed.account.isPersonal) {
        return { error: 'Tus permisos cambiaron. Cambia a tu cuenta personal para crear otro espacio.', status: 403 as const };
      }
      if (!await isDefaultWorkspace(tx, user.id, account.id)) {
        return { error: 'El espacio activo cambió. Actualiza la página y vuelve a intentarlo.', status: 409 as const };
      }
      const [newAccount] = await tx.insert(deps.tables.accounts).values({
        name,
        type: account.type ?? 'general',
        ownerUserId: user.id,
        isPersonal: false,
        createdAt: now,
        updatedAt: now,
      }).returning();
      await tx.update(deps.tables.accountUsers)
        .set({ isDefault: false, updatedAt: now })
        .where(deps.eq(deps.tables.accountUsers.userId, user.id));
      const [newMembership] = await tx.insert(deps.tables.accountUsers).values({
        accountId: newAccount.id,
        userId: user.id,
        role: 'owner',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return { account: newAccount, membership: newMembership };
    });

    if ('error' in created) return c.json({ ok: false, error: created.error }, created.status);

    const savedAccount = deps.upsertAccountCache(deps.mapAccountRow(created.account));
    deps.upsertAccountUserCache(deps.mapAccountUserRow(created.membership));
    deps.setDefaultAccountForUser(user.id, savedAccount.id);
    return c.json({ ok: true, account: savedAccount });
  });

  app.get('/current/members', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const vertical = parseAccountTeamVertical(c.req.query('vertical'));
    if (!vertical) return c.json({ ok: false, error: 'Producto no disponible.' }, 400);
    const requestedSection = c.req.query('section') ?? 'all';
    if (requestedSection !== 'all' && requestedSection !== 'members' && requestedSection !== 'invitations') {
      return c.json({ ok: false, error: 'Sección de equipo no válida.' }, 400);
    }
    const section = requestedSection as AccountTeamListSection;
    const memberOffset = parseAccountTeamListOffset(
      section === 'members' ? c.req.query('offset') : c.req.query('membersOffset'),
    );
    const invitationOffset = parseAccountTeamListOffset(
      section === 'invitations' ? c.req.query('offset') : c.req.query('invitationsOffset'),
    );
    if (memberOffset === null || invitationOffset === null) {
      return c.json({ ok: false, error: 'La página solicitada no es válida.' }, 400);
    }

    const { account, membership } = await getCurrentAccountMembership(user);
    if (!membership) return c.json({ ok: false, error: 'No tienes acceso a este espacio.' }, 403);
    const [workspace] = await deps.db.select().from(deps.tables.accountVerticalSettings).where(deps.and(
      deps.eq(deps.tables.accountVerticalSettings.accountId, account.id),
      deps.eq(deps.tables.accountVerticalSettings.vertical, vertical),
    )).limit(1);

    const canManage = canManageAccount(membership);
    const loadMembers = section !== 'invitations';
    const loadInvitations = section !== 'members' && canManage;
    const memberQuery = deps.eq(deps.tables.accountUsers.accountId, account.id);
    const activeInvitationQuery = deps.and(
      deps.eq(deps.tables.accountInvitations.accountId, account.id),
      deps.isNull(deps.tables.accountInvitations.acceptedAt),
      deps.isNull(deps.tables.accountInvitations.revokedAt),
      deps.gt(deps.tables.accountInvitations.expiresAt, new Date()),
    );
    const [memberCountRows, memberRows] = loadMembers
      ? await Promise.all([
          deps.db.select({ count: sql<number>`count(*)::int` })
            .from(deps.tables.accountUsers)
            .where(memberQuery),
          deps.db.select({
            id: deps.tables.accountUsers.id,
            accountId: deps.tables.accountUsers.accountId,
            userId: deps.tables.accountUsers.userId,
            role: deps.tables.accountUsers.role,
            isDefault: deps.tables.accountUsers.isDefault,
            createdAt: deps.tables.accountUsers.createdAt,
            name: deps.tables.users.name,
            email: deps.tables.users.email,
          })
            .from(deps.tables.accountUsers)
            .innerJoin(deps.tables.users, deps.eq(deps.tables.users.id, deps.tables.accountUsers.userId))
            .where(memberQuery)
            .orderBy(asc(deps.tables.accountUsers.createdAt), asc(deps.tables.accountUsers.userId))
            .limit(ACCOUNT_TEAM_LIST_PAGE_SIZE + 1)
            .offset(memberOffset),
        ])
      : [[], []];
    const [invitationCountRows, invitationRows] = loadInvitations
      ? await Promise.all([
          deps.db.select({ count: sql<number>`count(*)::int` })
            .from(deps.tables.accountInvitations)
            .where(activeInvitationQuery),
          deps.db.select({
            id: deps.tables.accountInvitations.id,
            email: deps.tables.accountInvitations.email,
            role: deps.tables.accountInvitations.role,
            createdAt: deps.tables.accountInvitations.createdAt,
            expiresAt: deps.tables.accountInvitations.expiresAt,
          })
            .from(deps.tables.accountInvitations)
            .where(activeInvitationQuery)
            .orderBy(desc(deps.tables.accountInvitations.createdAt), desc(deps.tables.accountInvitations.id))
            .limit(ACCOUNT_TEAM_LIST_PAGE_SIZE + 1)
            .offset(invitationOffset),
        ])
      : [[], []];
    const membersHaveMore = memberRows.length > ACCOUNT_TEAM_LIST_PAGE_SIZE;
    const invitationsHaveMore = invitationRows.length > ACCOUNT_TEAM_LIST_PAGE_SIZE;
    const members = memberRows.slice(0, ACCOUNT_TEAM_LIST_PAGE_SIZE);
    const invitations = invitationRows.slice(0, ACCOUNT_TEAM_LIST_PAGE_SIZE);
    const memberCount = Number((memberCountRows[0] as any)?.count ?? 0);
    const invitationCount = Number((invitationCountRows[0] as any)?.count ?? 0);
    return c.json({
      ok: true,
      account,
      canManage,
      currentMemberRole: membership.role,
      teamEnabled: !account.isPersonal && workspace?.accountKind === 'company',
      members: members.map((row: any) => ({ ...row, isCurrentUser: row.userId === user.id })),
      invitations,
      memberCount: loadMembers ? memberCount : undefined,
      invitationCount: loadInvitations ? invitationCount : undefined,
      hasMoreMembers: loadMembers ? membersHaveMore : undefined,
      hasMoreInvitations: loadInvitations ? invitationsHaveMore : undefined,
    });
  });

  app.post('/current/invitations', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const vertical = parseAccountTeamVertical(c.req.query('vertical'));
    if (!vertical) return c.json({ ok: false, error: 'Producto no disponible.' }, 400);

    const { account, membership } = await getCurrentAccountMembership(user);
    if (!canManageAccount(membership)) {
      return c.json({ ok: false, error: 'Solo quien administra este espacio puede invitar integrantes.' }, 403);
    }
    const [workspace] = await deps.db.select().from(deps.tables.accountVerticalSettings).where(deps.and(
      deps.eq(deps.tables.accountVerticalSettings.accountId, account.id),
      deps.eq(deps.tables.accountVerticalSettings.vertical, vertical),
    )).limit(1);
    if (workspace?.accountKind !== 'company' || account.isPersonal) {
      return c.json({ ok: false, error: 'Configura este espacio como empresa antes de invitar a tu equipo.' }, 409);
    }

    const payload = await c.req.json().catch(() => null);
    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const role = payload?.role === 'admin'
      ? 'admin'
      : payload?.role === undefined || payload?.role === 'agent'
        ? 'agent'
        : null;
    if (!role) return c.json({ ok: false, error: 'Elige un permiso válido para el equipo.' }, 400);
    if (role === 'admin' && !isAccountOwnerRole(membership.role)) {
      return c.json({ ok: false, error: 'Solo quien es dueño del espacio puede invitar administradores.' }, 403);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return c.json({ ok: false, error: 'Ingresa un correo válido.' }, 400);
    }
    if (email === String(user.email).trim().toLowerCase()) {
      return c.json({ ok: false, error: 'Ya eres parte de este espacio.' }, 409);
    }

    const origin = deps.resolveBrowserOrigin(c);
    if (!origin) return c.json({ ok: false, error: 'No pudimos preparar el enlace de invitación desde este sitio.' }, 403);

    const [existingUser] = await deps.db
      .select({ id: deps.tables.users.id })
      .from(deps.tables.users)
      .where(deps.eq(deps.tables.users.email, email))
      .limit(1);
    const now = new Date();
    const token = randomBytes(32).toString('hex');
    const result = await deps.db.transaction(async (tx: any) => {
      const managed = await lockManagedAccount(tx, user.id, account.id);
      if (!managed) return { error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.', status: 403 as const };
      if (role === 'admin' && !isAccountOwnerRole(managed.membership.role)) {
        return { error: 'Solo quien es dueño del espacio puede invitar administradores.', status: 403 as const };
      }
      const lockedAccount = managed.account;
      const [lockedWorkspace] = await tx.select({ accountKind: deps.tables.accountVerticalSettings.accountKind })
        .from(deps.tables.accountVerticalSettings)
        .where(deps.and(
          deps.eq(deps.tables.accountVerticalSettings.accountId, account.id),
          deps.eq(deps.tables.accountVerticalSettings.vertical, vertical),
        ))
        .limit(1);
      if (lockedAccount.isPersonal || lockedWorkspace?.accountKind !== 'company') {
        return { error: 'Este espacio ya no está configurado como empresa en este producto. Actualiza su actividad antes de invitar al equipo.', status: 409 as const };
      }

      if (existingUser) {
        const [existingMembership] = await tx.select({ id: deps.tables.accountUsers.id })
          .from(deps.tables.accountUsers)
          .where(deps.and(
            deps.eq(deps.tables.accountUsers.accountId, account.id),
            deps.eq(deps.tables.accountUsers.userId, existingUser.id),
          ))
          .limit(1);
        if (existingMembership) return { error: 'Esa persona ya forma parte del equipo.', status: 409 as const };
      }

      await tx.update(deps.tables.accountInvitations)
        .set({ revokedAt: now })
        .where(deps.and(
          deps.eq(deps.tables.accountInvitations.accountId, account.id),
          deps.eq(deps.tables.accountInvitations.email, email),
          deps.isNull(deps.tables.accountInvitations.acceptedAt),
          deps.isNull(deps.tables.accountInvitations.revokedAt),
        ));

      const [invitation] = await tx.insert(deps.tables.accountInvitations).values({
        accountId: account.id,
        vertical,
        email,
        role,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        invitedByUserId: user.id,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdAt: now,
      }).returning();
      return { invitation };
    });
    if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);

    const inviteUrl = `${origin}/panel/equipo?accept=${encodeURIComponent(token)}`;
    let emailSent = false;
    try {
      emailSent = await deps.sendAccountInvitationEmail({
        email,
        inviteUrl,
        inviterName: String(user.name ?? ''),
        accountName: account.name,
        role,
        expiresAt: result.invitation.expiresAt,
        origin,
      });
    } catch (error) {
      console.error('[accounts] invitation email delivery failed', { accountId: account.id, email });
    }
    return c.json({ ok: true, inviteUrl, email, role, expiresAt: result.invitation.expiresAt, emailSent });
  });

  app.get('/invitations/preview', async (c) => {
    c.header('Cache-Control', 'no-store');
    const token = c.req.query('token')?.trim() ?? '';
    if (!token || token.length > 200) return c.json({ ok: false, error: 'Invitación inválida.' }, 400);
    const [row] = await deps.db
      .select({ invitation: deps.tables.accountInvitations, account: deps.tables.accounts })
      .from(deps.tables.accountInvitations)
      .innerJoin(deps.tables.accounts, deps.eq(deps.tables.accounts.id, deps.tables.accountInvitations.accountId))
      .where(deps.eq(
        deps.tables.accountInvitations.tokenHash,
        createHash('sha256').update(token).digest('hex'),
      ))
      .limit(1);
    const invitation = row?.invitation;
    if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) {
      return c.json({ ok: false, error: 'Esta invitación ya no está vigente.' }, 410);
    }
    const vertical = parseAccountTeamVertical(invitation.vertical);
    if (!vertical) return c.json({ ok: false, error: 'Esta invitación ya no es válida.' }, 410);
    const [workspace] = await deps.db.select({ accountKind: deps.tables.accountVerticalSettings.accountKind })
      .from(deps.tables.accountVerticalSettings)
      .where(deps.and(
        deps.eq(deps.tables.accountVerticalSettings.accountId, invitation.accountId),
        deps.eq(deps.tables.accountVerticalSettings.vertical, vertical),
      ))
      .limit(1);
    if (row.account.isPersonal || workspace?.accountKind !== 'company') {
      return c.json({ ok: false, error: 'Este espacio cambió su configuración y ya no acepta invitaciones para este producto.' }, 410);
    }
    return c.json({
      ok: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        accountName: row.account.name,
      },
    });
  });

  app.post('/invitations/accept', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'Inicia sesión para aceptar la invitación.' }, 401);

    const payload = await c.req.json().catch(() => null);
    const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
    if (!token || token.length > 200) return c.json({ ok: false, error: 'Invitación inválida.' }, 400);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const [preflightInvitation] = await deps.db.select()
      .from(deps.tables.accountInvitations)
      .where(deps.eq(deps.tables.accountInvitations.tokenHash, tokenHash))
      .limit(1);
    if (
      !preflightInvitation
      || preflightInvitation.acceptedAt
      || preflightInvitation.revokedAt
      || preflightInvitation.expiresAt <= new Date()
    ) {
      return c.json({ ok: false, error: 'Esta invitación ya no está vigente.' }, 410);
    }
    const vertical = parseAccountTeamVertical(preflightInvitation.vertical);
    if (!vertical) return c.json({ ok: false, error: 'Esta invitación ya no es válida.' }, 410);
    if (String(user.email).trim().toLowerCase() !== preflightInvitation.email) {
      return c.json({ ok: false, error: `Inicia sesión con ${preflightInvitation.email} para aceptar esta invitación.` }, 403);
    }
    const result = await deps.db.transaction(async (tx: any) => {
      const [lockedAccount] = await tx.select({
        id: deps.tables.accounts.id,
        isPersonal: deps.tables.accounts.isPersonal,
      })
        .from(deps.tables.accounts)
        .where(deps.eq(deps.tables.accounts.id, preflightInvitation.accountId))
        .limit(1)
        .for('update');
      if (!lockedAccount) return { error: 'No encontramos este espacio de trabajo.', status: 404 as const };

      const [invitation] = await tx.select()
        .from(deps.tables.accountInvitations)
        .where(deps.eq(deps.tables.accountInvitations.tokenHash, tokenHash))
        .limit(1)
        .for('update');
      if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) {
        return { error: 'Esta invitación ya no está vigente.', status: 410 as const };
      }
      if (invitation.role !== 'admin' && invitation.role !== 'agent') {
        await tx.update(deps.tables.accountInvitations)
          .set({ revokedAt: new Date() })
          .where(deps.eq(deps.tables.accountInvitations.id, invitation.id));
        return { error: 'Esta invitación ya no es válida. Pide que te envíen una nueva.', status: 410 as const };
      }
      const lockedVertical = parseAccountTeamVertical(invitation.vertical);
      if (!lockedVertical || lockedVertical !== vertical) {
        return { error: 'Esta invitación ya no es válida. Pide que te envíen una nueva.', status: 410 as const };
      }
      const [workspace] = await tx.select({ accountKind: deps.tables.accountVerticalSettings.accountKind })
        .from(deps.tables.accountVerticalSettings)
        .where(deps.and(
          deps.eq(deps.tables.accountVerticalSettings.accountId, invitation.accountId),
          deps.eq(deps.tables.accountVerticalSettings.vertical, vertical),
        ))
        .limit(1);
      if (lockedAccount.isPersonal || workspace?.accountKind !== 'company') {
        await tx.update(deps.tables.accountInvitations)
          .set({ revokedAt: new Date() })
          .where(deps.eq(deps.tables.accountInvitations.id, invitation.id));
        return {
          error: 'Este espacio cambió su configuración y ya no puede aceptar invitaciones para este producto. Pide una nueva invitación si vuelve a habilitar su equipo.',
          status: 409 as const,
        };
      }
      if (String(user.email).trim().toLowerCase() !== invitation.email) {
        return { error: `Inicia sesión con ${invitation.email} para aceptar esta invitación.`, status: 403 as const };
      }
      const [existingMembership] = await tx.select({ id: deps.tables.accountUsers.id })
        .from(deps.tables.accountUsers)
        .where(deps.and(
          deps.eq(deps.tables.accountUsers.accountId, invitation.accountId),
          deps.eq(deps.tables.accountUsers.userId, user.id),
        ))
        .limit(1);
      if (existingMembership) {
        await tx.update(deps.tables.accountInvitations)
          .set({ acceptedAt: new Date() })
          .where(deps.eq(deps.tables.accountInvitations.id, invitation.id));
        return { error: 'Ya formas parte de este espacio.', status: 409 as const };
      }
      const now = new Date();
      const [added] = await tx.insert(deps.tables.accountUsers).values({
        accountId: invitation.accountId,
        userId: user.id,
        role: invitation.role,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      }).returning();
      await tx.update(deps.tables.accountInvitations)
        .set({ acceptedAt: now })
        .where(deps.eq(deps.tables.accountInvitations.id, invitation.id));
      return { membership: added, accountId: invitation.accountId };
    });
    if (result.error) return c.json({ ok: false, error: result.error }, result.status);

    const membership = deps.upsertAccountUserCache(deps.mapAccountUserRow(result.membership));
    const account = deps.accountsById.get(result.accountId) ?? null;
    return c.json({ ok: true, account, membership });
  });

  app.patch('/current/members/:userId', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const { account, membership: actorMembership } = await getCurrentAccountMembership(user);
    if (!canManageAccount(actorMembership)) return c.json({ ok: false, error: 'No tienes permisos para administrar este equipo.' }, 403);

    const targetUserId = c.req.param('userId');
    const payload = await c.req.json().catch(() => null);
    const role = payload?.role === 'admin' ? 'admin' : payload?.role === 'agent' ? 'agent' : null;
    if (!role) return c.json({ ok: false, error: 'Elige un permiso válido para el equipo.' }, 400);
    if (targetUserId === user.id) return c.json({ ok: false, error: 'No puedes cambiar tus propios permisos.' }, 409);
    if (actorMembership.role !== 'owner' && role === 'admin') return c.json({ ok: false, error: 'Solo quien es dueño del espacio puede asignar administradores.' }, 403);

    const result = await deps.db.transaction(async (tx: any) => {
      const currentActor = await lockManagedAccount(tx, user.id, account.id);
      if (!currentActor) {
        return { error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.', status: 403 as const };
      }
      if (currentActor.membership.role !== 'owner' && role === 'admin') {
        return { error: 'Solo quien es dueño del espacio puede asignar administradores.', status: 403 as const };
      }

      const [target] = await tx.select().from(deps.tables.accountUsers).where(deps.and(
        deps.eq(deps.tables.accountUsers.accountId, account.id),
        deps.eq(deps.tables.accountUsers.userId, targetUserId),
      )).limit(1).for('update');
      if (!target || target.role === 'owner') {
        return { error: 'No encontramos a esa persona dentro del equipo.', status: 404 as const };
      }
      if (currentActor.membership.role !== 'owner' && target.role === 'admin') {
        return { error: 'Solo quien es dueño del espacio puede cambiar a otro administrador.', status: 403 as const };
      }

      const [updated] = await tx.update(deps.tables.accountUsers)
        .set({ role, updatedAt: new Date() })
        .where(deps.and(
          deps.eq(deps.tables.accountUsers.id, target.id),
          deps.eq(deps.tables.accountUsers.accountId, account.id),
          deps.eq(deps.tables.accountUsers.userId, targetUserId),
        ))
        .returning();
      if (!updated) return { error: 'No encontramos a esa persona dentro del equipo.', status: 404 as const };
      return { member: updated };
    });
    if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
    deps.upsertAccountUserCache(deps.mapAccountUserRow(result.member));
    return c.json({ ok: true, member: result.member });
  });

  app.post('/current/ownership-transfer', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const { account, membership: actorMembership } = await getCurrentAccountMembership(user);
    if (!actorMembership || actorMembership.role !== 'owner') {
      return c.json({ ok: false, error: 'Solo quien es dueño del espacio puede transferir su propiedad.' }, 403);
    }
    const vertical = parseAccountTeamVertical(c.req.query('vertical'));
    if (!vertical) return c.json({ ok: false, error: 'Producto no disponible.' }, 400);

    const payload = await c.req.json().catch(() => null);
    const targetUserId = typeof payload?.userId === 'string' ? payload.userId : '';
    if (!targetUserId || targetUserId === user.id) {
      return c.json({ ok: false, error: 'Elige a otro administrador del espacio.' }, 400);
    }

    const now = new Date();
    const changed = await deps.db.transaction(async (tx: any) => {
      const managed = await lockManagedAccount(tx, user.id, account.id);
      if (!managed || managed.membership.role !== 'owner') {
        return { status: 'not_owner' as const };
      }
      const [target] = await tx.select().from(deps.tables.accountUsers).where(deps.and(
        deps.eq(deps.tables.accountUsers.accountId, account.id),
        deps.eq(deps.tables.accountUsers.userId, targetUserId),
      )).limit(1).for('update');
      if (!target || target.role !== 'admin') {
        return { status: 'target_not_admin' as const };
      }
      const [formerOwner] = await tx.update(deps.tables.accountUsers)
        .set({ role: 'admin', updatedAt: now })
        .where(deps.and(
          deps.eq(deps.tables.accountUsers.id, managed.membership.id),
          deps.eq(deps.tables.accountUsers.accountId, managed.account.id),
          deps.eq(deps.tables.accountUsers.userId, user.id),
          deps.eq(deps.tables.accountUsers.role, 'owner'),
        ))
        .returning();
      const [newOwner] = await tx.update(deps.tables.accountUsers)
        .set({ role: 'owner', updatedAt: now })
        .where(deps.and(
          deps.eq(deps.tables.accountUsers.id, target.id),
          deps.eq(deps.tables.accountUsers.accountId, managed.account.id),
          deps.eq(deps.tables.accountUsers.userId, targetUserId),
          deps.eq(deps.tables.accountUsers.role, 'admin'),
        ))
        .returning();
      if (!formerOwner || !newOwner) throw new Error('No pudimos confirmar la transferencia de propiedad.');

      const [updatedAccount] = await tx.update(deps.tables.accounts)
        .set({ ownerUserId: targetUserId, updatedAt: now })
        .where(deps.eq(deps.tables.accounts.id, managed.account.id))
        .returning();
      if (!updatedAccount) throw new Error('No pudimos encontrar el espacio para completar la transferencia.');
      return { status: 'transferred' as const, formerOwner, newOwner, account: updatedAccount };
    }).catch((error: unknown) => ({ error } as const));

    if ('error' in changed) {
      console.error('[accounts] ownership transfer failed', changed.error);
      return c.json({ ok: false, error: 'No pudimos transferir la propiedad. Actualiza el equipo e inténtalo nuevamente.' }, 500);
    }
    if (changed.status === 'not_owner') {
      return c.json({ ok: false, error: 'El espacio activo cambió o ya no eres su dueño.' }, 403);
    }
    if (changed.status === 'target_not_admin') {
      return c.json({ ok: false, error: 'Primero asigna el permiso de administrador a esa persona.' }, 409);
    }

    deps.upsertAccountUserCache(deps.mapAccountUserRow(changed.formerOwner));
    deps.upsertAccountUserCache(deps.mapAccountUserRow(changed.newOwner));
    deps.upsertAccountCache(deps.mapAccountRow(changed.account));
    try {
      await insertPlatformNotifications({
        userId: targetUserId,
        vertical,
        type: 'account.ownership_transferred',
        title: 'Ahora eres dueño de este espacio',
        body: `${changed.account.name} está ahora a tu cargo. Puedes revisar el equipo y su plan desde el panel.`,
        actionUrl: '/panel/equipo',
        entityType: 'account',
        entityId: account.id,
        metadata: { accountId: account.id, formerOwnerUserId: user.id },
      });
    } catch (error) {
      console.warn('[accounts] ownership transferred but notification could not be created', { accountId: account.id, error });
    }
    return c.json({ ok: true, formerOwnerUserId: user.id, ownerUserId: targetUserId });
  });

  app.delete('/current/invitations/:invitationId', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const { account, membership } = await getCurrentAccountMembership(user);
    if (!canManageAccount(membership)) {
      return c.json({ ok: false, error: 'Solo quien administra este espacio puede revocar invitaciones.' }, 403);
    }

    const invitationId = c.req.param('invitationId');
    const result = await deps.db.transaction(async (tx: any) => {
      const managed = await lockManagedAccount(tx, user.id, account.id);
      if (!managed) return { error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.', status: 403 as const };

      const [invitation] = await tx.select({
        id: deps.tables.accountInvitations.id,
        role: deps.tables.accountInvitations.role,
      })
        .from(deps.tables.accountInvitations)
        .where(deps.and(
          deps.eq(deps.tables.accountInvitations.id, invitationId),
          deps.eq(deps.tables.accountInvitations.accountId, account.id),
          deps.isNull(deps.tables.accountInvitations.acceptedAt),
          deps.isNull(deps.tables.accountInvitations.revokedAt),
        ))
        .limit(1)
        .for('update');
      if (!invitation) return { error: 'No encontramos una invitación pendiente en este espacio.', status: 404 as const };
      if (invitation.role === 'admin' && !isAccountOwnerRole(managed.membership.role)) {
        return { error: 'Solo el dueño del espacio puede revocar una invitación de administrador.', status: 403 as const };
      }

      const [revoked] = await tx.update(deps.tables.accountInvitations)
        .set({ revokedAt: new Date() })
        .where(deps.and(
          deps.eq(deps.tables.accountInvitations.id, invitation.id),
          deps.eq(deps.tables.accountInvitations.accountId, account.id),
          deps.isNull(deps.tables.accountInvitations.acceptedAt),
          deps.isNull(deps.tables.accountInvitations.revokedAt),
        ))
        .returning({ id: deps.tables.accountInvitations.id });
      if (!revoked) return { error: 'La invitación ya fue aceptada o dejó de estar vigente.', status: 409 as const };
      return { revokedId: revoked.id };
    });
    if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
    return c.json({ ok: true, revokedInvitationId: result.revokedId });
  });

  app.delete('/current/members/:userId', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const { account, membership: actorMembership } = await getCurrentAccountMembership(user);
    const targetUserId = c.req.param('userId');
    const isSelfLeaving = targetUserId === user.id;
    if (!actorMembership) return c.json({ ok: false, error: 'No tienes acceso a este espacio.' }, 403);
    if (!isSelfLeaving && !canManageAccount(actorMembership)) {
      return c.json({ ok: false, error: 'No tienes permisos para administrar este equipo.' }, 403);
    }
    if (isSelfLeaving && isAccountOwnerRole(actorMembership.role)) {
      return c.json({ ok: false, error: 'Transfiere la propiedad del espacio antes de salir del equipo.' }, 409);
    }
    const [target] = await deps.db.select().from(deps.tables.accountUsers).where(deps.and(
      deps.eq(deps.tables.accountUsers.accountId, account.id),
      deps.eq(deps.tables.accountUsers.userId, targetUserId),
    )).limit(1);
    if (!target || target.role === 'owner') return c.json({ ok: false, error: 'No encontramos a esa persona dentro del equipo.' }, 404);
    if (!isSelfLeaving && !isAccountOwnerRole(actorMembership.role) && target.role !== 'agent') {
      return c.json({ ok: false, error: 'Solo quien es dueño del espacio puede quitar a un administrador.' }, 403);
    }

    const existingMemberRows = await deps.db.select().from(deps.tables.accountUsers)
      .where(deps.eq(deps.tables.accountUsers.userId, targetUserId));
    if (existingMemberRows.length <= 1) {
      return c.json({ ok: false, error: 'Esa persona solo tiene este espacio. No podemos dejarla sin su cuenta personal.' }, 409);
    }

    const removalResult = await deps.db.transaction(async (tx: any) => {
      await lockUserAccountContext(tx, targetUserId);
      const [currentTarget] = await tx.select().from(deps.tables.accountUsers).where(deps.and(
        deps.eq(deps.tables.accountUsers.id, target.id),
        deps.eq(deps.tables.accountUsers.accountId, account.id),
        deps.eq(deps.tables.accountUsers.userId, targetUserId),
      )).limit(1).for('update');
      if (!currentTarget) return { status: 'not_member' as const };
      if (currentTarget.role === 'owner') return { status: 'owner_member' as const };
      if (isSelfLeaving && !currentTarget.isDefault) {
        return { status: 'space_changed' as const };
      }
      if (!isSelfLeaving) {
        const [currentActor] = await tx.select({ role: deps.tables.accountUsers.role, isDefault: deps.tables.accountUsers.isDefault })
          .from(deps.tables.accountUsers)
          .where(deps.and(
            deps.eq(deps.tables.accountUsers.accountId, account.id),
            deps.eq(deps.tables.accountUsers.userId, user.id),
          ))
          .limit(1)
          .for('update');
        if (!currentActor?.isDefault
          || !canManageAccountRole(currentActor?.role)
          || (currentActor?.role !== 'owner' && currentTarget.role !== 'agent')) {
          return { status: 'not_authorized' as const };
        }
      }

      const currentMemberships = await tx.select({ id: deps.tables.accountUsers.id })
        .from(deps.tables.accountUsers)
        .where(deps.eq(deps.tables.accountUsers.userId, targetUserId));
      if (currentMemberships.length <= 1) return { status: 'last_account' as const };

      const activeVisits = await tx.select().from(deps.tables.agendaAccountVisits).where(deps.and(
        deps.eq(deps.tables.agendaAccountVisits.accountId, account.id),
        deps.eq(deps.tables.agendaAccountVisits.assignedUserId, targetUserId),
        deps.inArray(deps.tables.agendaAccountVisits.status, ['scheduled', 'confirmed']),
      )).for('update');

      await tx.delete(deps.tables.accountListingAssignments).where(deps.and(
        deps.eq(deps.tables.accountListingAssignments.accountId, account.id),
        deps.eq(deps.tables.accountListingAssignments.assignedUserId, targetUserId),
      ));
      await tx.update(deps.tables.accountRelationshipAssignments)
        .set({ assignedUserId: null, updatedAt: new Date() })
        .where(deps.and(
          deps.eq(deps.tables.accountRelationshipAssignments.accountId, account.id),
          deps.eq(deps.tables.accountRelationshipAssignments.assignedUserId, targetUserId),
        ));
      await tx.update(deps.tables.accountRelationshipTasks)
        .set({ assignedUserId: null, reminderSentAt: null, updatedAt: new Date() })
        .where(deps.and(
          deps.eq(deps.tables.accountRelationshipTasks.accountId, account.id),
          deps.eq(deps.tables.accountRelationshipTasks.assignedUserId, targetUserId),
          deps.eq(deps.tables.accountRelationshipTasks.status, 'open'),
        ));
      await tx.update(deps.tables.agendaAccountVisits)
        .set({ assignedUserId: null, reminderSentAt: null, updatedAt: new Date() })
        .where(deps.and(
          deps.eq(deps.tables.agendaAccountVisits.accountId, account.id),
          deps.eq(deps.tables.agendaAccountVisits.assignedUserId, targetUserId),
          deps.inArray(deps.tables.agendaAccountVisits.status, ['scheduled', 'confirmed']),
        ));

      await tx.delete(deps.tables.platformNotifications).where(and(
        deps.eq(deps.tables.platformNotifications.userId, targetUserId),
        sql`${deps.tables.platformNotifications.metadata}->>'accountId' = ${account.id}`,
      ));
      const sellerThreadRows = await tx.select({ id: deps.tables.messageThreads.id })
        .from(deps.tables.messageThreads)
        .where(deps.and(
          deps.eq(deps.tables.messageThreads.accountId, account.id),
          deps.eq(deps.tables.messageThreads.ownerUserId, targetUserId),
        ));
      const sellerThreadIds = sellerThreadRows.map((row: { id: string }) => row.id);
      if (sellerThreadIds.length > 0) {
        await tx.delete(deps.tables.platformNotifications).where(and(
          deps.eq(deps.tables.platformNotifications.userId, targetUserId),
          deps.eq(deps.tables.platformNotifications.entityType, 'message_thread'),
          inArray(deps.tables.platformNotifications.entityId, sellerThreadIds),
        ));
      }
      await tx.delete(deps.tables.accountUsers).where(deps.eq(deps.tables.accountUsers.id, target.id));

      const remainingMemberships = await tx.select({
        id: deps.tables.accountUsers.id,
        accountId: deps.tables.accountUsers.accountId,
        isDefault: deps.tables.accountUsers.isDefault,
      })
        .from(deps.tables.accountUsers)
        .innerJoin(deps.tables.accounts, deps.eq(deps.tables.accounts.id, deps.tables.accountUsers.accountId))
        .where(deps.eq(deps.tables.accountUsers.userId, targetUserId))
        .orderBy(
          desc(deps.tables.accountUsers.isDefault),
          desc(deps.tables.accounts.isPersonal),
          asc(deps.tables.accountUsers.createdAt),
        );
      if (remainingMemberships.length && !remainingMemberships.some((item: any) => item.isDefault)) {
        const selected = remainingMemberships[0];
        await tx.update(deps.tables.accountUsers)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(deps.eq(deps.tables.accountUsers.id, selected.id));
      }
      return { status: 'removed' as const, activeVisits };
    });
    if (removalResult.status === 'not_member') return c.json({ ok: false, error: 'Esa persona ya no pertenece a este espacio.' }, 404);
    if (removalResult.status === 'owner_member') return c.json({ ok: false, error: 'Transfiere la propiedad del espacio antes de quitar al dueño.' }, 409);
    if (removalResult.status === 'not_authorized') return c.json({ ok: false, error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.' }, 403);
    if (removalResult.status === 'space_changed') return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
    if (removalResult.status === 'last_account') {
      return c.json({ ok: false, error: 'Esa persona solo tiene este espacio. No podemos dejarla sin su cuenta personal.' }, 409);
    }
    for (const visit of removalResult.activeVisits) {
      if (!visit.googleEventId || !visit.googleCalendarOwnerUserId) continue;
      try {
        const result = await deps.syncPropertyVisitToGoogleCalendar({
          visit,
          listingTitle: null,
          targetUserId: null,
          action: 'delete',
        });
        if (result.ok) {
          await deps.db.update(deps.tables.agendaAccountVisits)
            .set({ googleEventId: null, googleCalendarOwnerUserId: null, updatedAt: new Date() })
            .where(deps.and(
              deps.eq(deps.tables.agendaAccountVisits.id, visit.id),
              deps.eq(deps.tables.agendaAccountVisits.accountId, account.id),
            ));
        } else {
          console.warn('[accounts] could not remove a former member property visit from Google Calendar', { visitId: visit.id });
        }
      } catch {
        console.warn('[accounts] property visit calendar cleanup failed during member removal', { visitId: visit.id });
      }
    }
    deps.removeAccountUserCache(targetUserId, target.id);
    const rows = await deps.db.select().from(deps.tables.accountUsers).where(deps.eq(deps.tables.accountUsers.userId, targetUserId));
    for (const row of rows) deps.upsertAccountUserCache(deps.mapAccountUserRow(row));
    return c.json({ ok: true, removedUserId: targetUserId });
  });

  app.patch('/current', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
    if (!name) return c.json({ ok: false, error: 'Nombre inválido' }, 400);

    const { account, membership } = await getCurrentAccountMembership(user);
    if (!canManageAccount(membership)) return c.json({ ok: false, error: 'Solo quien administra este espacio puede cambiar su nombre.' }, 403);
    const result = await deps.db.transaction(async (tx: any) => {
      const managed = await lockManagedAccount(tx, user.id, account.id);
      if (!managed) return { error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.', status: 403 as const };
      const [updated] = await tx.update(deps.tables.accounts).set({ name, updatedAt: new Date() })
        .where(deps.eq(deps.tables.accounts.id, account.id))
        .returning();
      if (!updated) return { error: 'No encontramos este espacio de trabajo.', status: 404 as const };
      return { account: updated };
    });
    if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
    const updated = deps.upsertAccountCache(deps.mapAccountRow(result.account));
    return c.json({ ok: true, account: updated });
  });

  app.patch('/current/business-legal', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const businessLegalName = typeof payload?.businessLegalName === 'string'
      ? payload.businessLegalName.trim()
      : '';
    const businessTaxId = typeof payload?.businessTaxId === 'string'
      ? payload.businessTaxId.trim().replace(/\./g, '').toUpperCase()
      : '';

    if (!businessLegalName) {
      return c.json({ ok: false, error: 'Ingresa la razón social.' }, 400);
    }
    if (!businessTaxId) {
      return c.json({ ok: false, error: 'Ingresa el RUT de la empresa.' }, 400);
    }

    const { account, membership } = await getCurrentAccountMembership(user);
    if (!canManageAccount(membership)) return c.json({ ok: false, error: 'Solo quien administra este espacio puede cambiar los datos de facturación.' }, 403);
    const result = await deps.db.transaction(async (tx: any) => {
      const managed = await lockManagedAccount(tx, user.id, account.id);
      if (!managed) return { error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.', status: 403 as const };
      const [updated] = await tx.update(deps.tables.accounts).set({
        businessLegalName,
        businessTaxId,
        updatedAt: new Date(),
      }).where(deps.eq(deps.tables.accounts.id, account.id)).returning();
      if (!updated) return { error: 'No encontramos este espacio de trabajo.', status: 404 as const };
      return { account: updated };
    });
    if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
    const updated = deps.upsertAccountCache(deps.mapAccountRow(result.account));
    return c.json({ ok: true, account: updated });
  });

  app.patch('/current/billing-address', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const billingAddressId = typeof payload?.billingAddressId === 'string'
      ? payload.billingAddressId.trim()
      : payload?.billingAddressId === null
        ? null
        : undefined;

    if (billingAddressId === undefined) {
      return c.json({ ok: false, error: 'Dirección tributaria inválida.' }, 400);
    }

    const { account, membership } = await getCurrentAccountMembership(user);
    if (!canManageAccount(membership)) return c.json({ ok: false, error: 'Solo quien administra este espacio puede cambiar los datos de facturación.' }, 403);
    const result = await deps.db.transaction(async (tx: any) => {
      const managed = await lockManagedAccount(tx, user.id, account.id);
      if (!managed) return { error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.', status: 403 as const };

      if (billingAddressId) {
        const [businessAddress] = await tx.select({ id: deps.tables.addressBook.id })
          .from(deps.tables.addressBook)
          .where(deps.and(
            deps.eq(deps.tables.addressBook.id, billingAddressId),
            deps.eq(deps.tables.addressBook.accountId, account.id),
            deps.eq(deps.tables.addressBook.scope, 'business'),
          ))
          .limit(1);
        const [personalAddress] = !businessAddress && managed.account.isPersonal && managed.account.ownerUserId === user.id
          ? await tx.select({ id: deps.tables.addressBook.id })
            .from(deps.tables.addressBook)
            .where(deps.and(
              deps.eq(deps.tables.addressBook.userId, user.id),
              deps.eq(deps.tables.addressBook.id, billingAddressId),
              deps.isNull(deps.tables.addressBook.accountId),
            ))
            .limit(1)
          : [];
        if (!businessAddress && !personalAddress) {
          return { error: 'La dirección tributaria seleccionada no es válida.', status: 400 as const };
        }
      }

      const [updated] = await tx.update(deps.tables.accounts).set({
        billingAddressId,
        updatedAt: new Date(),
      }).where(deps.eq(deps.tables.accounts.id, account.id)).returning();
      if (!updated) return { error: 'No encontramos este espacio de trabajo.', status: 404 as const };
      return { account: updated };
    });
    if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
    const updated = deps.upsertAccountCache(deps.mapAccountRow(result.account));
    return c.json({ ok: true, account: updated });
  });

  app.patch('/current/business-billing', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const businessLegalName = typeof payload?.businessLegalName === 'string'
      ? payload.businessLegalName.trim()
      : '';
    const businessTaxId = typeof payload?.businessTaxId === 'string'
      ? payload.businessTaxId.trim().replace(/\./g, '').toUpperCase()
      : '';
    const billingAddressId = typeof payload?.billingAddressId === 'string'
      ? payload.billingAddressId.trim()
      : '';
    if (!businessLegalName || !businessTaxId || !billingAddressId) {
      return c.json({ ok: false, error: 'Completa la razón social, el RUT y la dirección tributaria.' }, 400);
    }

    const { account, membership } = await getCurrentAccountMembership(user);
    if (!canManageAccount(membership)) {
      return c.json({ ok: false, error: 'Solo quien administra este espacio puede cambiar sus datos de facturación.' }, 403);
    }

    const saved = await deps.db.transaction(async (tx: any) => {
      const managed = await lockManagedAccount(tx, user.id, account.id);
      if (!managed) {
        return { error: 'Tus permisos en este espacio cambiaron. Actualiza el equipo e inténtalo nuevamente.', status: 403 as const };
      }
      const [businessAddress] = await tx
        .select({ id: deps.tables.addressBook.id })
        .from(deps.tables.addressBook)
        .where(deps.and(
          deps.eq(deps.tables.addressBook.id, billingAddressId),
          deps.eq(deps.tables.addressBook.accountId, account.id),
          deps.eq(deps.tables.addressBook.scope, 'business'),
        ))
        .limit(1);
      let validAddress: any = businessAddress ?? null;

      if (!validAddress && account.isPersonal && account.ownerUserId === user.id) {
        const [personalAddress] = await tx
          .select({ id: deps.tables.addressBook.id })
          .from(deps.tables.addressBook)
          .where(deps.and(
            deps.eq(deps.tables.addressBook.userId, user.id),
            deps.eq(deps.tables.addressBook.id, billingAddressId),
            deps.isNull(deps.tables.addressBook.accountId),
          ))
          .limit(1);
        validAddress = personalAddress ?? null;
      }

      if (!validAddress) return { error: 'Selecciona una dirección comercial de este espacio.', status: 400 as const };
      const [updated] = await tx.update(deps.tables.accounts).set({
        businessLegalName,
        businessTaxId,
        billingAddressId,
        updatedAt: new Date(),
      }).where(deps.eq(deps.tables.accounts.id, account.id)).returning();
      if (!updated) return { error: 'No encontramos este espacio de trabajo.', status: 404 as const };
      return { account: updated };
    });

    if ('error' in saved) return c.json({ ok: false, error: saved.error }, saved.status);
    const updated = deps.upsertAccountCache(deps.mapAccountRow(saved.account));
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

  app.post('/cancel-email-change', async (c) => {
    const user = await deps.authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const now = new Date();
    await deps.db.update(deps.tables.users).set({
      pendingEmail: null,
      updatedAt: now,
    }).where(deps.eq(deps.tables.users.id, user.id));

    return c.json({ ok: true });
  });

  return app;
}
