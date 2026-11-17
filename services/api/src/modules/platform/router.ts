import { Hono } from 'hono';
import type { Context } from 'hono';
import { canManageAccountRole } from '../accounts/permissions.js';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    accountListingAssignments,
    accountRelationshipAssignments,
    accountVerticalSettings,
    accountUsers,
    accounts,
    listings,
    messageThreads,
    savedListings,
} from '../../db/schema.js';
import {
    countUnreadPlatformNotifications,
    listPlatformNotificationsForUser,
    markAllPlatformNotificationsRead,
    markPlatformNotificationRead,
} from './notifications-service.js';
import {
    createRelationshipNote,
    deleteRelationshipNote,
    getRelationshipNotePersonId,
    listRelationshipNotes,
    relationshipNoteVerticalSchema,
    resolveRelationshipBusinessId,
} from './relationship-notes.js';

export type PlatformRouterDeps = {
    authUser: (c: Context) => Promise<{ id: string } | null>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipsForUser: (userId: string) => Array<{ accountId: string; role: string }>;
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
};

function mapNotificationRow(row: {
    id: string;
    vertical: string | null;
    type: string;
    title: string;
    body: string | null;
    actionUrl: string | null;
    entityType: string | null;
    entityId: string | null;
    metadata: Record<string, unknown> | null;
    isRead: boolean;
    createdAt: Date;
}) {
    return {
        id: row.id,
        vertical: row.vertical,
        type: row.type,
        title: row.title,
        body: row.body,
        actionUrl: row.actionUrl,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        isRead: row.isRead,
        createdAt: row.createdAt.getTime(),
    };
}

const createNoteSchema = z.object({
    vertical: relationshipNoteVerticalSchema,
    personId: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(4000),
});

export function createPlatformRouter(deps: PlatformRouterDeps) {
    const app = new Hono();

    async function getCurrentAccountId(userId: string) {
        if (deps.getAccountMembershipFromDb) {
            return (await deps.getAccountMembershipFromDb(userId))?.accountId ?? null;
        }
        return deps.getPrimaryAccountIdForUser(userId);
    }

    async function lockCurrentAccountMembership(tx: any, userId: string, accountId: string) {
        const [membership] = await tx.select({
            role: accountUsers.role,
            isDefault: accountUsers.isDefault,
        })
            .from(accountUsers)
            .where(and(
                eq(accountUsers.userId, userId),
                eq(accountUsers.accountId, accountId),
            ))
            .limit(1)
            .for('update');
        return membership?.isDefault ? membership : null;
    }

    async function canAccessRelationshipPerson(
        userId: string,
        vertical: 'autos' | 'propiedades' | 'serenatas',
        accountId: string | null,
        personId: string,
        executor: any = db,
        lockAccessRows = false,
    ): Promise<boolean> {
        if (vertical === 'serenatas') return true;
        if (!accountId) return false;
        const [membership] = await executor.select({ role: accountUsers.role })
            .from(accountUsers)
            .where(and(
                eq(accountUsers.userId, userId),
                eq(accountUsers.accountId, accountId),
            ))
            .limit(1);
        if (!membership) return false;
        if (canManageAccountRole(membership.role)) return true;
        if (membership.role !== 'agent') return false;

        const account = await executor.query.accounts.findFirst({
            columns: { isPersonal: true },
            where: eq(accounts.id, accountId),
        });
        const workspace = await executor.query.accountVerticalSettings.findFirst({
            columns: { accountKind: true },
            where: and(
                eq(accountVerticalSettings.accountId, accountId),
                eq(accountVerticalSettings.vertical, vertical),
            ),
        });
        if (!account || account.isPersonal || workspace?.accountKind !== 'company') return false;

        let assignedContactQuery = executor.select({ id: accountRelationshipAssignments.id })
            .from(accountRelationshipAssignments)
            .where(and(
                eq(accountRelationshipAssignments.accountId, accountId),
                eq(accountRelationshipAssignments.vertical, vertical),
                eq(accountRelationshipAssignments.personId, personId),
                eq(accountRelationshipAssignments.assignedUserId, userId),
            ))
            .limit(1);
        if (lockAccessRows) assignedContactQuery = assignedContactQuery.for('update');
        const [assignedContact] = await assignedContactQuery;
        if (assignedContact) return true;

        let ownedListingsQuery = executor.select({ id: listings.id })
            .from(listings)
            .where(and(
                eq(listings.accountId, accountId),
                eq(listings.vertical, vertical),
                eq(listings.ownerId, userId),
            ));
        let assignedListingsQuery = executor.select({ listingId: accountListingAssignments.listingId })
            .from(accountListingAssignments)
            .where(and(
                eq(accountListingAssignments.accountId, accountId),
                eq(accountListingAssignments.vertical, vertical),
                eq(accountListingAssignments.assignedUserId, userId),
            ));
        if (lockAccessRows) {
            ownedListingsQuery = ownedListingsQuery.for('update');
            assignedListingsQuery = assignedListingsQuery.for('update');
        }
        const ownedListings = await ownedListingsQuery;
        const assignedListings = await assignedListingsQuery;
        const listingIds = [...new Set([
            ...ownedListings.map((listing: { id: string }) => listing.id),
            ...assignedListings.map((assignment: { listingId: string }) => assignment.listingId),
        ])];
        if (listingIds.length === 0) return false;

        const leadThread = await executor.select({ id: messageThreads.id })
            .from(messageThreads)
            .where(and(
                eq(messageThreads.accountId, accountId),
                eq(messageThreads.vertical, vertical),
                eq(messageThreads.buyerUserId, personId),
                inArray(messageThreads.listingId, listingIds),
            ))
            .limit(1);
        const savedListing = await executor.select({ id: savedListings.id })
            .from(savedListings)
            .where(and(
                eq(savedListings.userId, personId),
                inArray(savedListings.listingId, listingIds),
            ))
            .limit(1);
        return Boolean(leadThread[0] || savedListing[0]);
    }

    app.get('/notifications', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const unreadOnly = c.req.query('unread') === '1' || c.req.query('unread') === 'true';
        const vertical = c.req.query('vertical')?.trim() || undefined;
        const limitRaw = Number(c.req.query('limit') ?? 50);
        const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

        const [items, unreadCount] = await Promise.all([
            listPlatformNotificationsForUser(user.id, { unreadOnly, limit, vertical }),
            countUnreadPlatformNotifications(user.id),
        ]);

        return c.json({
            ok: true,
            unreadCount,
            items: items.map(mapNotificationRow),
        });
    });

    app.post('/notifications/:id/read', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const ok = await markPlatformNotificationRead(user.id, c.req.param('id'));
        if (!ok) return c.json({ ok: false, error: 'Notificación no encontrada' }, 404);
        return c.json({ ok: true });
    });

    app.post('/notifications/mark-all-read', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const updated = await markAllPlatformNotificationsRead(user.id);
        return c.json({ ok: true, updated });
    });

    app.get('/relationship-notes', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const verticalParsed = relationshipNoteVerticalSchema.safeParse(c.req.query('vertical'));
        const personId = c.req.query('personId')?.trim() ?? '';
        if (!verticalParsed.success || !personId) {
            return c.json({ ok: false, error: 'vertical y personId son requeridos' }, 400);
        }

        if (verticalParsed.data === 'serenatas') {
            const businessId = await resolveRelationshipBusinessId(user.id, 'serenatas');
            if (!businessId) {
                return c.json({ ok: false, error: 'No tienes un negocio activo en esta vertical.' }, 403);
            }
            const items = await listRelationshipNotes({
                vertical: 'serenatas',
                businessId,
                personId: personId.slice(0, 160),
            });
            return c.json({ ok: true, items });
        }

        const accountId = await getCurrentAccountId(user.id);
        if (!accountId) {
            return c.json({ ok: false, error: 'No tienes un espacio activo en esta vertical.' }, 403);
        }
        const result = await db.transaction(async (tx) => {
            const membership = await lockCurrentAccountMembership(tx, user.id, accountId);
            if (!membership) {
                return { ok: false as const, status: 403 as const, error: 'El espacio activo cambió o ya no tienes acceso.' };
            }
            const businessId = await resolveRelationshipBusinessId(user.id, verticalParsed.data, accountId);
            if (!businessId || !await canAccessRelationshipPerson(
                user.id,
                verticalParsed.data,
                accountId,
                personId,
                tx,
                true,
            )) {
                return { ok: false as const, status: 404 as const, error: 'No tienes acceso a este contacto.' };
            }
            const items = await listRelationshipNotes({
                vertical: verticalParsed.data,
                businessId,
                personId: personId.slice(0, 160),
                executor: tx,
            });
            return { ok: true as const, items };
        });
        if (!result.ok) return c.json({ ok: false, error: result.error }, result.status);
        return c.json({ ok: true, items: result.items });
    });

    app.post('/relationship-notes', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const parsed = createNoteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Nota inválida' }, 400);
        }

        if (parsed.data.vertical === 'serenatas') {
            const businessId = await resolveRelationshipBusinessId(user.id, 'serenatas');
            if (!businessId) {
                return c.json({ ok: false, error: 'No tienes un negocio activo en esta vertical.' }, 403);
            }
            const item = await createRelationshipNote({
                vertical: 'serenatas',
                businessId,
                personId: parsed.data.personId,
                body: parsed.data.body,
                authorUserId: user.id,
            });
            return c.json({ ok: true, item }, 201);
        }

        const accountId = await getCurrentAccountId(user.id);
        if (!accountId) {
            return c.json({ ok: false, error: 'No tienes un espacio activo en esta vertical.' }, 403);
        }
        const result = await db.transaction(async (tx) => {
            const membership = await lockCurrentAccountMembership(tx, user.id, accountId);
            if (!membership) {
                return { ok: false as const, status: 403 as const, error: 'El espacio activo cambió o ya no tienes acceso.' };
            }
            const businessId = await resolveRelationshipBusinessId(user.id, parsed.data.vertical, accountId);
            if (!businessId || !await canAccessRelationshipPerson(
                user.id,
                parsed.data.vertical,
                accountId,
                parsed.data.personId,
                tx,
                true,
            )) {
                return { ok: false as const, status: 404 as const, error: 'No tienes acceso a este contacto.' };
            }
            const item = await createRelationshipNote({
                vertical: parsed.data.vertical,
                businessId,
                personId: parsed.data.personId,
                body: parsed.data.body,
                authorUserId: user.id,
                actor: membership.role === 'admin' ? 'admin' : membership.role === 'owner' ? 'owner' : 'team_member',
            }, { executor: tx });
            return { ok: true as const, item };
        });
        if (!result.ok) return c.json({ ok: false, error: result.error }, result.status);
        return c.json({ ok: true, item: result.item }, 201);
    });

    app.delete('/relationship-notes/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const verticalParsed = relationshipNoteVerticalSchema.safeParse(c.req.query('vertical'));
        if (!verticalParsed.success) {
            return c.json({ ok: false, error: 'vertical requerida' }, 400);
        }

        const noteId = c.req.param('id');
        if (verticalParsed.data === 'serenatas') {
            const businessId = await resolveRelationshipBusinessId(user.id, 'serenatas');
            if (!businessId) {
                return c.json({ ok: false, error: 'No tienes un negocio activo en esta vertical.' }, 403);
            }
            const personId = await getRelationshipNotePersonId({ noteId, vertical: 'serenatas', businessId });
            if (!personId) return c.json({ ok: false, error: 'Nota no encontrada.' }, 404);
            const ok = await deleteRelationshipNote({ noteId, businessId, authorUserId: user.id });
            if (!ok) return c.json({ ok: false, error: 'Nota no encontrada' }, 404);
            return c.json({ ok: true });
        }

        const accountId = await getCurrentAccountId(user.id);
        if (!accountId) {
            return c.json({ ok: false, error: 'No tienes un espacio activo en esta vertical.' }, 403);
        }
        const result = await db.transaction(async (tx) => {
            const membership = await lockCurrentAccountMembership(tx, user.id, accountId);
            if (!membership) return { ok: false as const, status: 403 as const, error: 'El espacio activo cambió o ya no tienes acceso.' };
            const businessId = await resolveRelationshipBusinessId(user.id, verticalParsed.data, accountId);
            if (!businessId) return { ok: false as const, status: 403 as const, error: 'No tienes un negocio activo en esta vertical.' };
            const personId = await getRelationshipNotePersonId({ noteId, vertical: verticalParsed.data, businessId, executor: tx });
            if (!personId || !await canAccessRelationshipPerson(user.id, verticalParsed.data, accountId, personId, tx, true)) {
                return { ok: false as const, status: 404 as const, error: 'Nota no encontrada.' };
            }
            const ok = await deleteRelationshipNote({ noteId, businessId, authorUserId: user.id }, { executor: tx });
            if (!ok) return { ok: false as const, status: 404 as const, error: 'Nota no encontrada.' };
            return { ok: true as const };
        });
        if (!result.ok) return c.json({ ok: false, error: result.error }, result.status);
        return c.json({ ok: true });
    });

    return app;
}
