import { Hono } from 'hono';
import type { Context } from 'hono';
import { canManageAccountRole, isAccountMemberRole } from '../accounts/permissions.js';
import { z } from 'zod';
import { and, asc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    accountRelationshipAssignments,
    accountRelationshipTasks,
    accountListingAssignments,
    accountUsers,
    accountVerticalSettings,
    accounts,
    listings,
    messageThreads,
    platformNotifications,
    timelineEvents,
    users,
} from '../../db/schema.js';
import { emitTimelineEvent } from '../platform/timeline-events.js';
import type { MessageServiceDeps } from './service.js';
import { createOrAppendListingConversation } from './listing-conversation.js';
import { authorizeContextConversation } from './context-conversation-auth.js';
import { appendOrCreateContextMessage } from './platform-context-threads.js';
import { getMessageThreadByContext } from './service.js';
import { notifyMessageThreadActivity } from './thread-notifications.js';
import { resolveMessageThreadListingDisplay } from './message-thread-context.js';
import {
    getMarketplaceContactDetail,
    listMarketplaceContacts,
    type MarketplaceContactDetail,
    type MarketplaceContactScope,
} from './marketplace-contacts.js';
import { publicSectionLabel } from '../../lib/format-relative.js';
import type { BoostSection } from '../../lib/domain-types.js';

const contextConversationSchema = z.object({
    contextType: z.enum(['agenda_appointment', 'serenata']),
    contextId: z.string().uuid(),
    message: z.string().min(1).max(4000),
});

const listingConversationSchema = z.object({
    listingId: z.string().uuid(),
    message: z.string().min(1).max(4000),
    contactName: z.string().min(2).max(120).optional(),
});

const contactAssignmentSchema = z.object({
    vertical: z.enum(['autos', 'propiedades']),
    personId: z.string().uuid(),
    assignedUserId: z.string().uuid().nullable().optional(),
    stage: z.enum(['new', 'contacted', 'visit_scheduled', 'negotiation', 'won', 'lost']).optional(),
}).refine((value) => value.assignedUserId !== undefined || value.stage !== undefined);

const contactTaskCreateSchema = z.object({
    vertical: z.enum(['autos', 'propiedades']),
    personId: z.string().uuid(),
    title: z.string().trim().min(2).max(180),
    dueAt: z.string().datetime().nullable().optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
});

const contactTaskPatchSchema = z.object({
    title: z.string().trim().min(2).max(180).optional(),
    dueAt: z.string().datetime().nullable().optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
    status: z.enum(['open', 'done', 'cancelled']).optional(),
}).refine((value) => Object.keys(value).length > 0);

export interface MessagesRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    messageFolderSchema: any;
    messageThreadUpdateSchema: any;
    messageEntryCreateSchema: any;
    listMessageThreadsForUser: (userId: string, vertical: any, folder: any, accountId?: string | null) => Promise<any[]>;
    listMessageEntries: (threadId: string) => Promise<any[]>;
    messageThreadToResponse: (thread: any, userId: string, entries: any[], sellerOverride?: boolean) => any | Promise<any>;
    messageEntryToResponse: (entry: any, userId: string) => any;
    getMessageThreadById: (id: string) => Promise<any>;
    isThreadParticipant: (userId: string, thread: any) => boolean;
    markMessageThreadRead: (thread: any, userId: string) => Promise<any>;
    updateMessageThreadViewerState: (thread: any, userId: string, action: any) => Promise<any>;
    createMessageEntry: (opts: any) => Promise<any>;
    touchMessageThreadAfterIncomingMessage: (thread: any, senderRole: any, now: number) => Promise<any>;
    buildMessageThreadNotification: (thread: any, userId: string) => Promise<any>;
    messageDeps: MessageServiceDeps;
    getListingById: (id: string) => any | null | undefined;
    isPublicListingVisible: (listing: any) => boolean;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipsForUser: (userId: string) => Array<{ accountId: string; role: string }>;
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
    getMessageThreadByContext: (
        contextType: string,
        contextId: string,
        buyerUserId: string,
    ) => Promise<any>;
}

export function createMessagesRouter(deps: MessagesRouterDeps) {
    const {
        authUser,
        parseVertical,
        messageFolderSchema,
        messageThreadUpdateSchema,
        messageEntryCreateSchema,
        listMessageThreadsForUser,
        listMessageEntries,
        messageThreadToResponse,
        messageEntryToResponse,
        getMessageThreadById,
        isThreadParticipant,
        markMessageThreadRead,
        updateMessageThreadViewerState,
        createMessageEntry,
        touchMessageThreadAfterIncomingMessage,
        messageDeps,
        getListingById,
        isPublicListingVisible,
        getMessageThreadByContext,
        getPrimaryAccountIdForUser,
        getAccountMembershipsForUser,
        getAccountMembershipFromDb,
    } = deps;

    const app = new Hono();

    async function getCurrentAccountMembership(userId: string, accountId?: string) {
        if (getAccountMembershipFromDb) return getAccountMembershipFromDb(userId, accountId);
        const currentAccountId = accountId ?? await getPrimaryAccountIdForUser(userId);
        return currentAccountId
            ? getAccountMembershipsForUser(userId).find((membership) => membership.accountId === currentAccountId) ?? null
            : null;
    }

    async function getCurrentAccountId(userId: string): Promise<string | null> {
        return (await getCurrentAccountMembership(userId))?.accountId ?? null;
    }

    async function isAccountMember(userId: string, accountId: string | null | undefined): Promise<boolean> {
        if (!accountId) return false;
        const membership = await getCurrentAccountMembership(userId, accountId);
        return isAccountMemberRole(membership?.role);
    }

    function threadForSellerViewer(userId: string, thread: any, seller: boolean): any {
        return seller && thread.ownerUserId !== userId ? { ...thread, ownerUserId: userId } : thread;
    }

    async function resolveContactAssignmentContext(userId: string, vertical: 'autos' | 'propiedades') {
        const membership = await getCurrentAccountMembership(userId);
        const accountId = membership?.accountId ?? null;
        if (!accountId || !membership) return null;

        const [account, workspace] = await Promise.all([
            db.query.accounts.findFirst({
            columns: { isPersonal: true, ownerUserId: true },
                where: eq(accounts.id, accountId),
            }),
            db.query.accountVerticalSettings.findFirst({
                columns: { accountKind: true },
                where: and(
                    eq(accountVerticalSettings.accountId, accountId),
                    eq(accountVerticalSettings.vertical, vertical),
                ),
            }),
        ]);
        const workspaceEnabled = Boolean(workspace);
        const teamEnabled = Boolean(account && !account.isPersonal && workspace?.accountKind === 'company');
        if (!teamEnabled) {
            return {
                accountId,
                isPersonal: Boolean(account?.isPersonal && account.ownerUserId === userId),
                workspaceEnabled,
                teamEnabled: false,
                canManage: workspaceEnabled && canManageAccountRole(membership.role),
                membershipRole: membership.role,
                members: [] as Array<{ userId: string; name: string; email: string | null; role: string }>,
            };
        }

        const members = await db
            .select({
                userId: accountUsers.userId,
                role: accountUsers.role,
                name: users.name,
                email: users.email,
            })
            .from(accountUsers)
            .innerJoin(users, eq(accountUsers.userId, users.id))
            .where(eq(accountUsers.accountId, accountId));

        return {
            accountId,
            isPersonal: Boolean(account?.isPersonal && account.ownerUserId === userId),
            workspaceEnabled: true,
            teamEnabled: true,
            canManage: canManageAccountRole(membership.role),
            membershipRole: membership.role,
            members: members.map((member) => ({
                userId: member.userId,
                name: member.name?.trim() || member.email || 'Integrante',
                email: member.email ?? null,
                role: member.role,
            })),
        };
    }

    async function lockContactWorkspace(tx: any, userId: string, accountId: string, vertical: 'autos' | 'propiedades') {
        const [membership] = await tx.select({ role: accountUsers.role, isDefault: accountUsers.isDefault })
            .from(accountUsers)
            .where(and(
                eq(accountUsers.accountId, accountId),
                eq(accountUsers.userId, userId),
            ))
            .limit(1)
            .for('update');
        if (!membership || !membership.isDefault) return null;

        const [account] = await tx.select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1)
            .for('update');
        if (!account) return null;

        const [workspace] = await tx.select({ accountKind: accountVerticalSettings.accountKind })
            .from(accountVerticalSettings)
            .where(and(
                eq(accountVerticalSettings.accountId, accountId),
                eq(accountVerticalSettings.vertical, vertical),
            ))
            .limit(1)
            .for('update');

        const workspaceEnabled = Boolean(workspace);
        return {
            accountId,
            isPersonal: Boolean(account.isPersonal && account.ownerUserId === userId),
            workspaceEnabled,
            teamEnabled: Boolean(!account.isPersonal && workspace?.accountKind === 'company'),
            canManage: workspaceEnabled && canManageAccountRole(membership.role),
            membershipRole: membership.role,
        };
    }

    async function lockRelationshipAssignment(tx: any, accountId: string, vertical: 'autos' | 'propiedades', personId: string) {
        const [assignment] = await tx.select({
            id: accountRelationshipAssignments.id,
            assignedUserId: accountRelationshipAssignments.assignedUserId,
            assignedByUserId: accountRelationshipAssignments.assignedByUserId,
            stage: accountRelationshipAssignments.stage,
        })
            .from(accountRelationshipAssignments)
            .where(and(
                eq(accountRelationshipAssignments.accountId, accountId),
                eq(accountRelationshipAssignments.vertical, vertical),
                eq(accountRelationshipAssignments.personId, personId),
            ))
            .limit(1)
            .for('update');
        return assignment ?? null;
    }

    async function isAgentContactInCurrentScope(
        tx: any,
        userId: string,
        accountId: string,
        vertical: 'autos' | 'propiedades',
        personId: string,
        isPersonal: boolean,
        assignment: { assignedUserId: string | null } | null,
    ): Promise<boolean> {
        if (assignment?.assignedUserId === userId) return true;

        const ownerCondition = isPersonal
            ? or(
                eq(messageThreads.accountId, accountId),
                and(eq(messageThreads.ownerUserId, userId), isNull(messageThreads.accountId)),
            )!
            : eq(messageThreads.accountId, accountId);
        const contactThreads = await tx.select({ listingId: messageThreads.listingId })
            .from(messageThreads)
            .where(and(
                ownerCondition,
                eq(messageThreads.vertical, vertical),
                eq(messageThreads.buyerUserId, personId),
                isNotNull(messageThreads.listingId),
            ));
        const listingIds = [...new Set(contactThreads.map((thread: { listingId: string | null }) => thread.listingId).filter(Boolean))] as string[];
        if (!listingIds.length) return false;

        const listingOwnerCondition = isPersonal
            ? or(
                eq(listings.accountId, accountId),
                and(eq(listings.ownerId, userId), isNull(listings.accountId)),
            )!
            : eq(listings.accountId, accountId);
        const [ownedListing] = await tx.select({ id: listings.id })
            .from(listings)
            .where(and(
                listingOwnerCondition,
                eq(listings.vertical, vertical),
                eq(listings.ownerId, userId),
                inArray(listings.id, listingIds),
            ))
            .limit(1);
        if (ownedListing) return true;

        const [assignedListing] = await tx.select({ id: accountListingAssignments.id })
            .from(accountListingAssignments)
            .innerJoin(listings, eq(listings.id, accountListingAssignments.listingId))
            .where(and(
                eq(accountListingAssignments.accountId, accountId),
                eq(accountListingAssignments.vertical, vertical),
                eq(accountListingAssignments.assignedUserId, userId),
                eq(listings.accountId, accountId),
                eq(listings.vertical, vertical),
                inArray(listings.id, listingIds),
            ))
            .limit(1);
        return Boolean(assignedListing);
    }

    async function resolveAgentContactScope(
        userId: string,
        vertical: 'autos' | 'propiedades',
        contextOverride?: Awaited<ReturnType<typeof resolveContactAssignmentContext>>,
    ): Promise<MarketplaceContactScope | undefined> {
        if (vertical !== 'autos' && vertical !== 'propiedades') return undefined;
        const context = contextOverride ?? await resolveContactAssignmentContext(userId, vertical);
        if (context?.membershipRole !== 'agent') return undefined;

        const [ownedListings, assignedListings, assignedContacts] = await Promise.all([
            db.select({ id: listings.id })
                .from(listings)
                .where(and(
                    eq(listings.accountId, context.accountId),
                    eq(listings.vertical, vertical),
                    eq(listings.ownerId, userId),
                )),
            db.select({ listingId: accountListingAssignments.listingId })
                .from(accountListingAssignments)
                .where(and(
                    eq(accountListingAssignments.accountId, context.accountId),
                    eq(accountListingAssignments.vertical, vertical),
                    eq(accountListingAssignments.assignedUserId, userId),
                )),
            db.select({ personId: accountRelationshipAssignments.personId })
                .from(accountRelationshipAssignments)
                .where(and(
                    eq(accountRelationshipAssignments.accountId, context.accountId),
                    eq(accountRelationshipAssignments.vertical, vertical),
                    eq(accountRelationshipAssignments.assignedUserId, userId),
                )),
        ]);
        return {
            listingIds: new Set([
                ...ownedListings.map((row: { id: string }) => row.id),
                ...assignedListings.map((row: { listingId: string }) => row.listingId),
            ]),
            personIds: new Set(assignedContacts.map((row: { personId: string }) => row.personId)),
        };
    }

    function contactIsInAgentScope(
        contact: MarketplaceContactDetail,
        scope: MarketplaceContactScope | undefined,
    ): boolean {
        if (!scope) return false;
        if (scope.personIds.has(contact.contact.buyerUserId)) return true;
        if (contact.leads.some((lead) => lead.listingId && scope.listingIds.has(lead.listingId))) return true;
        return contact.events.some((event) => (
            event.subjectKind === 'listing' && scope.listingIds.has(event.subjectId)
        ));
    }

    async function canViewThreadAsSeller(userId: string, thread: any, accountId: string | null): Promise<boolean> {
        if (thread.accountId && (
            !accountId
            || thread.accountId !== accountId
            || !await isAccountMember(userId, thread.accountId)
        )) return false;
        if (!thread.accountId && (thread.vertical === 'autos' || thread.vertical === 'propiedades')) {
            if (!accountId || userId !== thread.ownerUserId) return false;
            const personalContext = await resolveContactAssignmentContext(userId, thread.vertical);
            if (!personalContext?.isPersonal) return false;
        }
        if (userId === thread.ownerUserId) return true;
        if (!accountId || thread.accountId !== accountId) return false;
        if (thread.vertical !== 'autos' && thread.vertical !== 'propiedades') return true;

        const context = await resolveContactAssignmentContext(userId, thread.vertical);
        if (!context) return false;
        if (context.membershipRole !== 'agent') return true;
        if (thread.listingId) {
            const [ownedListing] = await db.select({ id: listings.id })
                .from(listings)
                .where(and(
                    eq(listings.id, thread.listingId),
                    eq(listings.accountId, accountId),
                    eq(listings.vertical, thread.vertical),
                    eq(listings.ownerId, userId),
                ))
                .limit(1);
            if (ownedListing) return true;
            const [assignment] = await db.select({ id: accountListingAssignments.id })
                .from(accountListingAssignments)
                .where(and(
                    eq(accountListingAssignments.accountId, accountId),
                    eq(accountListingAssignments.vertical, thread.vertical),
                    eq(accountListingAssignments.listingId, thread.listingId),
                    eq(accountListingAssignments.assignedUserId, userId),
                ))
                .limit(1);
            if (assignment) return true;
        }
        const [contactAssignment] = await db.select({ id: accountRelationshipAssignments.id })
            .from(accountRelationshipAssignments)
            .where(and(
                eq(accountRelationshipAssignments.accountId, accountId),
                eq(accountRelationshipAssignments.vertical, thread.vertical),
                eq(accountRelationshipAssignments.personId, thread.buyerUserId),
                eq(accountRelationshipAssignments.assignedUserId, userId),
            ))
            .limit(1);
        return Boolean(contactAssignment);
    }

    async function canViewThreadInCurrentAccount(
        userId: string,
        thread: any,
        seller: boolean,
        accountId: string | null,
    ): Promise<boolean> {
        if (seller) return true;
        if (thread.buyerUserId !== userId || !isThreadParticipant(userId, thread)) return false;
        if (thread.vertical !== 'autos' && thread.vertical !== 'propiedades') return true;
        const context = await resolveContactAssignmentContext(userId, thread.vertical);
        return Boolean(context?.isPersonal && context.accountId === accountId);
    }

    app.post('/listing-conversations', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'Inicia sesión para enviar un mensaje al anunciante.' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = listingConversationSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Datos inválidos.' }, 400);
        }

        const listing = getListingById(parsed.data.listingId);
        if (!listing || !isPublicListingVisible(listing)) {
            return c.json({ ok: false, error: 'Publicación no disponible.' }, 404);
        }
        if (listing.ownerId === user.id || await isAccountMember(user.id, listing.accountId)) {
            return c.json({ ok: false, error: 'No puedes enviarte mensajes a tu propia publicación.' }, 400);
        }

        const buyerName = parsed.data.contactName?.trim() || user.name || user.email;
        const result = await createOrAppendListingConversation(messageDeps, {
            listing: {
                id: listing.id,
                accountId: listing.accountId ?? null,
                ownerId: listing.ownerId,
                vertical: listing.vertical,
                title: listing.title,
            },
            buyer: { id: user.id, name: buyerName },
            message: parsed.data.message,
        });

        const entries = await listMessageEntries(result.thread.id);
        return c.json({
            ok: true,
            thread: await messageThreadToResponse(result.thread, user.id, entries),
            entry: messageEntryToResponse(result.entry, user.id),
            createdThread: result.createdThread,
        }, result.createdThread ? 201 : 200);
    });

    app.get('/threads/by-context', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const contextType = c.req.query('contextType');
        const contextId = c.req.query('contextId');
        if (!contextType || !contextId) {
            return c.json({ ok: false, error: 'Contexto inválido.' }, 400);
        }

        const auth = await authorizeContextConversation({
            userId: user.id,
            contextType: contextType as 'agenda_appointment' | 'serenata',
            contextId,
        });
        if (!auth.ok) {
            return c.json({ ok: false, error: auth.error }, auth.status as 403 | 404 | 409);
        }
        if (auth.vertical !== vertical) {
            return c.json({ ok: false, error: 'Conversación no encontrada.' }, 404);
        }

        const thread = await getMessageThreadByContext(auth.contextType, auth.contextId, auth.buyerUserId);
        if (!thread) {
            return c.json({ ok: true, thread: null });
        }
        const entries = await listMessageEntries(thread.id);
        return c.json({
            ok: true,
            thread: await messageThreadToResponse(thread, user.id, entries),
        });
    });

    app.post('/context-conversations', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = contextConversationSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Datos inválidos.' }, 400);
        }

        const auth = await authorizeContextConversation({
            userId: user.id,
            contextType: parsed.data.contextType,
            contextId: parsed.data.contextId,
        });
        if (!auth.ok) {
            return c.json({ ok: false, error: auth.error }, auth.status as 403 | 404 | 409);
        }

        const result = await appendOrCreateContextMessage(messageDeps, {
            vertical: auth.vertical,
            contextType: auth.contextType,
            contextId: auth.contextId,
            ownerUserId: auth.ownerUserId,
            buyerUserId: auth.buyerUserId,
            senderUserId: auth.senderUserId,
            senderRole: auth.senderRole,
            body: parsed.data.message,
        });
        const entries = await listMessageEntries(result.thread.id);
        return c.json({
            ok: true,
            thread: await messageThreadToResponse(result.thread, user.id, entries),
            entry: messageEntryToResponse(result.entry, user.id),
            createdThread: result.createdThread,
        }, result.createdThread ? 201 : 200);
    });

    app.get('/unread-count', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const accountId = await getCurrentAccountId(user.id);
        const threads = await listMessageThreadsForUser(user.id, vertical, 'inbox', accountId);
        const visibleThreads = await Promise.all(threads.map(async (thread: any) => {
            const seller = await canViewThreadAsSeller(user.id, thread, accountId);
            return {
                thread,
                seller,
                visible: await canViewThreadInCurrentAccount(user.id, thread, seller, accountId),
            };
        }));
        const unreadCount = visibleThreads.reduce((total: number, item: any) => {
            if (!item.visible) return total;
            const viewerRole = item.seller ? 'seller' : 'buyer';
            const count = viewerRole === 'seller' ? item.thread.ownerUnreadCount : item.thread.buyerUnreadCount;
            return total + Math.max(0, count);
        }, 0);
        return c.json({ ok: true, unreadCount });
    });

    app.get('/contacts', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Contactos de leads solo aplica a Autos y Propiedades.' }, 400);
        }

        const q = c.req.query('q')?.trim() ?? '';
        const accountId = await getCurrentAccountId(user.id);
        const accountContext = await resolveContactAssignmentContext(user.id, vertical);
        const scope = await resolveAgentContactScope(user.id, vertical, accountContext);
        const items = await listMarketplaceContacts(
            messageDeps,
            user.id,
            vertical,
            q,
            accountId,
            scope,
            accountContext?.isPersonal ?? false,
        );
        return c.json({ ok: true, items });
    });

    app.get('/contacts/detail', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Contactos de leads solo aplica a Autos y Propiedades.' }, 400);
        }

        const buyerUserId = c.req.query('buyerUserId')?.trim() ?? '';
        if (!buyerUserId) return c.json({ ok: false, error: 'Contacto requerido' }, 400);

        const accountId = await getCurrentAccountId(user.id);
        const accountContext = await resolveContactAssignmentContext(user.id, vertical);
        const scope = await resolveAgentContactScope(user.id, vertical, accountContext);
        const detail = await getMarketplaceContactDetail(
            messageDeps,
            user.id,
            vertical,
            buyerUserId,
            accountId,
            scope,
            accountContext?.isPersonal ?? false,
        );
        if (!detail) return c.json({ ok: false, error: 'Contacto no encontrado' }, 404);
        return c.json({ ok: true, ...detail });
    });

    app.get('/contacts/assignment', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Actividad no válida.' }, 400);
        }
        const personId = c.req.query('personId')?.trim() ?? '';
        if (!z.string().uuid().safeParse(personId).success) {
            return c.json({ ok: false, error: 'Contacto no válido.' }, 400);
        }

        const context = await resolveContactAssignmentContext(user.id, vertical);
        if (!context) return c.json({ ok: false, error: 'No encontramos tu espacio activo.' }, 403);
        if (!context.workspaceEnabled) {
            return c.json({ ok: true, workspaceEnabled: false, teamEnabled: false, canManage: false, assignedUserId: null, stage: 'new', canUpdateStage: false, members: [] });
        }
        const scope = await resolveAgentContactScope(user.id, vertical, context);
        const contact = await getMarketplaceContactDetail(
            messageDeps,
            user.id,
            vertical,
            personId,
            context.accountId,
            scope,
            context.isPersonal,
        );
        if (!contact) return c.json({ ok: false, error: 'Contacto no encontrado.' }, 404);

        const [assignment] = await db
            .select({
                id: accountRelationshipAssignments.id,
                assignedUserId: accountRelationshipAssignments.assignedUserId,
                stage: accountRelationshipAssignments.stage,
            })
            .from(accountRelationshipAssignments)
            .where(and(
                eq(accountRelationshipAssignments.accountId, context.accountId),
                eq(accountRelationshipAssignments.vertical, vertical),
                eq(accountRelationshipAssignments.personId, personId),
            ))
            .limit(1);

        return c.json({
            ok: true,
            workspaceEnabled: true,
            teamEnabled: context.teamEnabled,
            canManage: context.canManage,
            assignedUserId: assignment?.assignedUserId ?? null,
            stage: assignment?.stage ?? 'new',
            canUpdateStage: context.canManage || (assignment
                ? assignment.assignedUserId === user.id
                : contactIsInAgentScope(contact, scope)),
            members: context.members,
        });
    });

    app.patch('/contacts/assignment', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = contactAssignmentSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Datos de asignación no válidos.' }, 400);

        const context = await resolveContactAssignmentContext(user.id, parsed.data.vertical);
        if (!context) return c.json({ ok: false, error: 'No encontramos tu espacio activo.' }, 403);
        if (!context.workspaceEnabled) {
            return c.json({ ok: false, error: 'Configura tu espacio de trabajo antes de gestionar contactos.' }, 403);
        }
        const scope = await resolveAgentContactScope(user.id, parsed.data.vertical, context);
        const contact = await getMarketplaceContactDetail(
            messageDeps,
            user.id,
            parsed.data.vertical,
            parsed.data.personId,
            context.accountId,
            scope,
            context.isPersonal,
        );
        if (!contact) return c.json({ ok: false, error: 'Contacto no encontrado.' }, 404);

        const assignmentChanged = parsed.data.assignedUserId !== undefined;
        const result = await db.transaction(async (tx) => {
            const locked = await lockContactWorkspace(tx, user.id, context.accountId, parsed.data.vertical);
            if (!locked) return { error: 'Tus permisos o tu espacio activo cambiaron. Actualiza la página e inténtalo nuevamente.', status: 403 as const };
            if (!locked.workspaceEnabled) return { error: 'Configura tu espacio de trabajo antes de gestionar contactos.', status: 403 as const };
            if (assignmentChanged && !locked.canManage) {
                return { error: 'Solo quien administra el espacio puede cambiar responsables.', status: 403 as const };
            }
            if (parsed.data.assignedUserId) {
                const [targetMembership] = await tx.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(and(
                        eq(accountUsers.accountId, context.accountId),
                        eq(accountUsers.userId, parsed.data.assignedUserId),
                    ))
                    .limit(1)
                    .for('update');
                if (!targetMembership) {
                    return { error: 'El integrante seleccionado ya no pertenece a este espacio.', status: 400 as const };
                }
            }

            let currentAssignment = await lockRelationshipAssignment(tx, context.accountId, parsed.data.vertical, parsed.data.personId);
            let canUpdateStage = locked.canManage || currentAssignment?.assignedUserId === user.id;
            if (!canUpdateStage && !currentAssignment && locked.membershipRole === 'agent') {
                canUpdateStage = await isAgentContactInCurrentScope(
                    tx,
                    user.id,
                    context.accountId,
                    parsed.data.vertical,
                    parsed.data.personId,
                    locked.isPersonal,
                    currentAssignment,
                );
            }
            if (parsed.data.stage !== undefined && !canUpdateStage) {
                return { error: 'La etapa solo puede cambiarla quien administra o tiene asignado este contacto.', status: 403 as const };
            }

            const now = new Date();
            if (!currentAssignment) {
                const [inserted] = await tx.insert(accountRelationshipAssignments)
                    .values({
                        accountId: context.accountId,
                        vertical: parsed.data.vertical,
                        personId: parsed.data.personId,
                        assignedUserId: parsed.data.assignedUserId ?? null,
                        assignedByUserId: user.id,
                        stage: parsed.data.stage ?? 'new',
                        updatedAt: now,
                    })
                    .onConflictDoNothing()
                    .returning({ assignedUserId: accountRelationshipAssignments.assignedUserId, stage: accountRelationshipAssignments.stage });
                if (inserted) {
                    return {
                        updated: inserted,
                        fromStage: 'new',
                        stageChanged: parsed.data.stage !== undefined && parsed.data.stage !== 'new',
                    };
                }

                currentAssignment = await lockRelationshipAssignment(tx, context.accountId, parsed.data.vertical, parsed.data.personId);
                if (!currentAssignment) return { error: 'No pudimos actualizar el contacto. Inténtalo nuevamente.', status: 409 as const };
                canUpdateStage = locked.canManage || currentAssignment.assignedUserId === user.id;
                if (parsed.data.stage !== undefined && !canUpdateStage) {
                    return { error: 'La etapa solo puede cambiarla quien administra o tiene asignado este contacto.', status: 403 as const };
                }
            }

            const updateValues: Record<string, unknown> = { updatedAt: now };
            if (assignmentChanged) {
                updateValues.assignedUserId = parsed.data.assignedUserId ?? null;
                updateValues.assignedByUserId = user.id;
            }
            if (parsed.data.stage !== undefined) updateValues.stage = parsed.data.stage;
            const [updated] = await tx.update(accountRelationshipAssignments)
                .set(updateValues)
                .where(eq(accountRelationshipAssignments.id, currentAssignment.id))
                .returning({ assignedUserId: accountRelationshipAssignments.assignedUserId, stage: accountRelationshipAssignments.stage });
            return {
                updated,
                fromStage: currentAssignment.stage,
                stageChanged: parsed.data.stage !== undefined && parsed.data.stage !== currentAssignment.stage,
            };
        });

        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);

        if (result.stageChanged) {
            emitTimelineEvent(db, timelineEvents, {
                type: 'relationship.stage_changed',
                business: { vertical: parsed.data.vertical, id: context.accountId },
                person: { id: parsed.data.personId, kind: 'user' },
                subject: { kind: 'relationship', id: `${parsed.data.vertical}:${parsed.data.personId}` },
                actor: 'team_member',
                payload: { from: result.fromStage, to: result.updated?.stage ?? parsed.data.stage },
            });
        }

        return c.json({ ok: true, assignedUserId: result.updated?.assignedUserId ?? null, stage: result.updated?.stage ?? 'new' });
    });

    app.get('/contacts/tasks', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const personId = c.req.query('personId')?.trim() ?? '';
        if ((vertical !== 'autos' && vertical !== 'propiedades') || !z.string().uuid().safeParse(personId).success) {
            return c.json({ ok: false, error: 'Contacto no válido.' }, 400);
        }
        const context = await resolveContactAssignmentContext(user.id, vertical);
        if (!context?.workspaceEnabled) return c.json({ ok: true, workspaceEnabled: false, teamEnabled: false, tasks: [], members: [] });
        const scope = await resolveAgentContactScope(user.id, vertical, context);
        const contact = await getMarketplaceContactDetail(
            messageDeps,
            user.id,
            vertical,
            personId,
            context.accountId,
            scope,
            context.isPersonal,
        );
        if (!contact) return c.json({ ok: false, error: 'Contacto no encontrado.' }, 404);

        const taskConditions = [
            eq(accountRelationshipTasks.accountId, context.accountId),
            eq(accountRelationshipTasks.vertical, vertical),
            eq(accountRelationshipTasks.personId, personId),
        ];
        if (!context.canManage) {
            taskConditions.push(or(
                eq(accountRelationshipTasks.assignedUserId, user.id),
                eq(accountRelationshipTasks.createdByUserId, user.id),
            )!);
        }
        const tasks = await db.select().from(accountRelationshipTasks)
            .where(and(...taskConditions))
            .orderBy(asc(accountRelationshipTasks.dueAt), asc(accountRelationshipTasks.createdAt))
            .limit(100);
        const memberNames = new Map(context.members.map((member) => [member.userId, member.name]));
        return c.json({
            ok: true,
            workspaceEnabled: true,
            teamEnabled: context.teamEnabled,
            canManage: context.canManage,
            viewerUserId: user.id,
            members: context.members,
            tasks: tasks.map((task: any) => ({
                ...task,
                canUpdate: context.canManage || task.assignedUserId === user.id || task.createdByUserId === user.id,
                assignedName: task.assignedUserId ? memberNames.get(task.assignedUserId) ?? null : null,
            })),
        });
    });

    app.post('/contacts/tasks', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const payload = await c.req.json().catch(() => null);
        const parsed = contactTaskCreateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Completa el seguimiento antes de guardarlo.' }, 400);

        const context = await resolveContactAssignmentContext(user.id, parsed.data.vertical);
        if (!context?.workspaceEnabled) return c.json({ ok: false, error: 'Configura tu espacio de trabajo antes de crear seguimientos.' }, 403);
        const scope = await resolveAgentContactScope(user.id, parsed.data.vertical, context);
        const contact = await getMarketplaceContactDetail(
            messageDeps,
            user.id,
            parsed.data.vertical,
            parsed.data.personId,
            context.accountId,
            scope,
            context.isPersonal,
        );
        if (!contact) return c.json({ ok: false, error: 'Contacto no encontrado.' }, 404);

        const result = await db.transaction(async (tx) => {
            const locked = await lockContactWorkspace(tx, user.id, context.accountId, parsed.data.vertical);
            if (!locked) return { error: 'Tus permisos o tu espacio activo cambiaron. Actualiza la página e inténtalo nuevamente.', status: 403 as const };
            if (!locked.workspaceEnabled) return { error: 'Configura tu espacio de trabajo antes de crear seguimientos.', status: 403 as const };

            const requestedAssignee = !locked.teamEnabled
                ? user.id
                : parsed.data.assignedUserId === undefined
                    ? user.id
                    : parsed.data.assignedUserId;
            if (locked.teamEnabled && !locked.canManage && requestedAssignee !== user.id) {
                return { error: 'Solo quien administra el espacio puede asignar seguimientos a otra persona.', status: 403 as const };
            }
            if (locked.teamEnabled && requestedAssignee) {
                const [targetMembership] = await tx.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(and(
                        eq(accountUsers.accountId, context.accountId),
                        eq(accountUsers.userId, requestedAssignee),
                    ))
                    .limit(1)
                    .for('update');
                if (!targetMembership) {
                    return { error: 'La persona asignada ya no pertenece a este equipo.', status: 400 as const };
                }
            }

            const contactAssignment = await lockRelationshipAssignment(tx, context.accountId, parsed.data.vertical, parsed.data.personId);
            if (locked.membershipRole === 'agent' && !await isAgentContactInCurrentScope(
                tx,
                user.id,
                context.accountId,
                parsed.data.vertical,
                parsed.data.personId,
                locked.isPersonal,
                contactAssignment,
            )) {
                return { error: 'Contacto no encontrado.', status: 404 as const };
            }

            const [task] = await tx.insert(accountRelationshipTasks).values({
                accountId: context.accountId,
                vertical: parsed.data.vertical,
                personId: parsed.data.personId,
                title: parsed.data.title,
                dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
                assignedUserId: requestedAssignee,
                createdByUserId: user.id,
                updatedAt: new Date(),
            }).returning();
            return { task, requestedAssignee };
        });
        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
        const { task, requestedAssignee } = result;

        emitTimelineEvent(db, timelineEvents, {
            type: 'task.created',
            business: { vertical: parsed.data.vertical, id: context.accountId },
            person: { id: parsed.data.personId, kind: 'user' },
            subject: { kind: 'relationship_task', id: task.id },
            actor: 'team_member',
            payload: { title: task.title, dueAt: task.dueAt?.toISOString() ?? null },
        });

        return c.json({
            ok: true,
            task: {
                ...task,
                canUpdate: true,
                assignedName: requestedAssignee
                    ? context.members.find((member) => member.userId === requestedAssignee)?.name ?? null
                    : null,
            },
        }, 201);
    });

    app.patch('/contacts/tasks/:id', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const taskId = c.req.param('id');
        if (!z.string().uuid().safeParse(taskId).success) return c.json({ ok: false, error: 'Seguimiento no válido.' }, 400);
        const payload = await c.req.json().catch(() => null);
        const parsed = contactTaskPatchSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'No pudimos actualizar el seguimiento.' }, 400);

        const membership = await getCurrentAccountMembership(user.id);
        const accountId = membership?.accountId ?? null;
        if (!accountId || !membership) return c.json({ ok: false, error: 'No encontramos tu espacio activo.' }, 403);
        const [taskPreview] = await db.select().from(accountRelationshipTasks)
            .where(and(
                eq(accountRelationshipTasks.id, taskId),
                eq(accountRelationshipTasks.accountId, accountId),
            ))
            .limit(1);
        if (!taskPreview) return c.json({ ok: false, error: 'Seguimiento no encontrado.' }, 404);
        if (taskPreview.vertical !== 'autos' && taskPreview.vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Actividad no válida.' }, 400);
        }
        const context = await resolveContactAssignmentContext(user.id, taskPreview.vertical);
        if (!context?.workspaceEnabled || context.accountId !== accountId) {
            return c.json({ ok: false, error: 'No encontramos un equipo activo para esta actividad.' }, 403);
        }
        const scope = await resolveAgentContactScope(user.id, taskPreview.vertical, context);
        const contact = await getMarketplaceContactDetail(
            messageDeps,
            user.id,
            taskPreview.vertical,
            taskPreview.personId,
            accountId,
            scope,
            context.isPersonal,
        );
        if (!contact) return c.json({ ok: false, error: 'Contacto no encontrado.' }, 404);
        const result = await db.transaction(async (tx) => {
            const locked = await lockContactWorkspace(tx, user.id, accountId, taskPreview.vertical as 'autos' | 'propiedades');
            if (!locked) return { error: 'Tus permisos o tu espacio activo cambiaron. Actualiza la página e inténtalo nuevamente.', status: 403 as const };
            if (!locked.workspaceEnabled) return { error: 'No encontramos un equipo activo para esta actividad.', status: 403 as const };
            if (parsed.data.assignedUserId !== undefined && (!locked.teamEnabled || !locked.canManage)) {
                return { error: 'Solo quien administra el espacio puede cambiar responsables.', status: 403 as const };
            }
            if (locked.teamEnabled && parsed.data.assignedUserId) {
                const [targetMembership] = await tx.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(and(
                        eq(accountUsers.accountId, accountId),
                        eq(accountUsers.userId, parsed.data.assignedUserId),
                    ))
                    .limit(1)
                    .for('update');
                if (!targetMembership) {
                    return { error: 'La persona asignada ya no pertenece a este equipo.', status: 400 as const };
                }
            }

            const contactAssignment = await lockRelationshipAssignment(
                tx,
                accountId,
                taskPreview.vertical as 'autos' | 'propiedades',
                taskPreview.personId,
            );
            if (locked.membershipRole === 'agent' && !await isAgentContactInCurrentScope(
                tx,
                user.id,
                accountId,
                taskPreview.vertical as 'autos' | 'propiedades',
                taskPreview.personId,
                locked.isPersonal,
                contactAssignment,
            )) {
                return { error: 'Contacto no encontrado.', status: 404 as const };
            }

            const [task] = await tx.select().from(accountRelationshipTasks)
                .where(and(
                    eq(accountRelationshipTasks.id, taskId),
                    eq(accountRelationshipTasks.accountId, accountId),
                ))
                .limit(1)
                .for('update');
            if (!task) return { error: 'Seguimiento no encontrado.', status: 404 as const };
            if (task.vertical !== taskPreview.vertical || task.personId !== taskPreview.personId) {
                return { error: 'El seguimiento cambió mientras lo editabas. Actualiza la página e inténtalo nuevamente.', status: 409 as const };
            }
            if (!locked.canManage && task.assignedUserId !== user.id && task.createdByUserId !== user.id) {
                return { error: 'Este seguimiento no está asignado a tu trabajo.', status: 403 as const };
            }

            const values: Record<string, unknown> = { updatedAt: new Date() };
            if (parsed.data.title !== undefined) values.title = parsed.data.title;
            if (parsed.data.dueAt !== undefined) values.dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;
            if (parsed.data.assignedUserId !== undefined) values.assignedUserId = parsed.data.assignedUserId;
            values.reminderSentAt = null;
            if (parsed.data.status !== undefined) {
                values.status = parsed.data.status;
                values.completedAt = parsed.data.status === 'done' ? new Date() : null;
            }
            const [updated] = await tx.update(accountRelationshipTasks)
                .set(values)
                .where(eq(accountRelationshipTasks.id, taskId))
                .returning();
            await tx.delete(platformNotifications).where(and(
                eq(platformNotifications.vertical, task.vertical),
                eq(platformNotifications.entityType, 'relationship_task'),
                eq(platformNotifications.entityId, task.id),
            ));
            return { updated, task };
        });
        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
        const { task, updated } = result;

        if (parsed.data.status === 'done' && task.status !== 'done') {
            emitTimelineEvent(db, timelineEvents, {
                type: 'task.completed',
                business: { vertical: task.vertical as 'autos' | 'propiedades', id: accountId },
                person: { id: task.personId, kind: 'user' },
                subject: { kind: 'relationship_task', id: task.id },
                actor: 'team_member',
                payload: { title: updated?.title ?? task.title },
            });
        }

        return c.json({ ok: true, task: updated });
    });

    app.get('/threads', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const folderParsed = messageFolderSchema.safeParse(c.req.query('folder'));
        const folder = folderParsed.success ? folderParsed.data : 'inbox';
        const accountId = await getCurrentAccountId(user.id);
        const threads = await listMessageThreadsForUser(user.id, vertical, folder, accountId);
        const visibility = await Promise.all(threads.map(async (thread: any) => {
            const seller = await canViewThreadAsSeller(user.id, thread, accountId);
            return {
                thread,
                seller,
                visible: await canViewThreadInCurrentAccount(user.id, thread, seller, accountId),
            };
        }));
        const visible = visibility.filter((item) => item.visible);
        const items = await Promise.all(visible.map(async ({ thread, seller }) => {
            const entries = await listMessageEntries(thread.id);
            return await messageThreadToResponse(thread, user.id, entries, seller && thread.ownerUserId !== user.id);
        }));

        return c.json({ ok: true, items });
    });

    app.get('/threads/:id', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const thread = await getMessageThreadById(c.req.param('id'));
        if (!thread || thread.vertical !== vertical) {
            return c.json({ ok: false, error: 'Conversación no encontrada.' }, 404);
        }
        const accountId = await getCurrentAccountId(user.id);
        const seller = await canViewThreadAsSeller(user.id, thread, accountId);
        if (!await canViewThreadInCurrentAccount(user.id, thread, seller, accountId)) {
            return c.json({ ok: false, error: 'No autorizado' }, 403);
        }

        const viewerThread = threadForSellerViewer(user.id, thread, seller);
        const hydratedThread = await markMessageThreadRead(viewerThread, user.id);
        const entries = await listMessageEntries(hydratedThread.id);

        return c.json({
            ok: true,
            item: await messageThreadToResponse(hydratedThread, user.id, entries, seller && thread.ownerUserId !== user.id),
            entries: entries.map((entry: any) => messageEntryToResponse(entry, user.id)),
        });
    });

    app.patch('/threads/:id', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const payload = await c.req.json().catch(() => null);
        const parsed = messageThreadUpdateSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const thread = await getMessageThreadById(c.req.param('id'));
        if (!thread || thread.vertical !== vertical) {
            return c.json({ ok: false, error: 'Conversación no encontrada.' }, 404);
        }
        const accountId = await getCurrentAccountId(user.id);
        const seller = await canViewThreadAsSeller(user.id, thread, accountId);
        if (!await canViewThreadInCurrentAccount(user.id, thread, seller, accountId)) {
            return c.json({ ok: false, error: 'No autorizado' }, 403);
        }

        const updatedThread = await updateMessageThreadViewerState(threadForSellerViewer(user.id, thread, seller), user.id, parsed.data.action);
        const entries = await listMessageEntries(updatedThread.id);

        return c.json({
            ok: true,
            item: await messageThreadToResponse(updatedThread, user.id, entries, seller && thread.ownerUserId !== user.id),
        });
    });

    app.post('/threads/:id/messages', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const payload = await c.req.json().catch(() => null);
        const parsed = messageEntryCreateSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const thread = await getMessageThreadById(c.req.param('id'));
        if (!thread || thread.vertical !== vertical) {
            return c.json({ ok: false, error: 'Conversación no encontrada.' }, 404);
        }
        const accountId = await getCurrentAccountId(user.id);
        const seller = await canViewThreadAsSeller(user.id, thread, accountId);
        if (!await canViewThreadInCurrentAccount(user.id, thread, seller, accountId)) {
            return c.json({ ok: false, error: 'No autorizado' }, 403);
        }

        const senderRole = seller ? 'seller' : 'buyer';
        const now = Date.now();
        const entry = await createMessageEntry({
            threadId: thread.id,
            senderUserId: user.id,
            senderRole,
            body: parsed.data.body,
            createdAt: now,
        });
        const updatedThread = await touchMessageThreadAfterIncomingMessage(thread, senderRole, now);
        const recipientUserId = senderRole === 'seller' ? thread.buyerUserId : thread.ownerUserId;
        void (async () => {
            try {
                const display = thread.listingId
                    ? null
                    : await resolveMessageThreadListingDisplay(
                        updatedThread,
                        messageDeps.listingsById,
                        (section) => publicSectionLabel(section as BoostSection),
                    );
                const listing = thread.listingId
                    ? messageDeps.listingsById.get(thread.listingId)
                    : display;
                const contextTitle = listing?.title ?? 'tu conversación';
                await notifyMessageThreadActivity({
                    recipientUserId,
                    vertical: thread.vertical,
                    threadId: thread.id,
                    senderUserId: user.id,
                    contextTitle,
                    preview: parsed.data.body,
                    isNewThread: false,
                    accountId: senderRole === 'seller' ? null : thread.accountId,
                });
            } catch (error) {
                console.error('[messages] No se pudo notificar el mensaje:', error);
            }
        })();
        const entries = await listMessageEntries(updatedThread.id);
        return c.json({
            ok: true,
            item: await messageThreadToResponse(updatedThread, user.id, entries, seller && thread.ownerUserId !== user.id),
            entry: messageEntryToResponse(entry, user.id),
            entries: entries.map((e: any) => messageEntryToResponse(e, user.id)),
        }, 201);
    });

    return app;
}

export interface PanelNotificationsRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    listMessageThreadsForUser: (userId: string, vertical: any, folder: any, accountId?: string | null) => Promise<any[]>;
    buildMessageThreadNotification: (thread: any, userId: string, sellerOverride?: boolean) => Promise<any>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipsForUser: (userId: string) => Array<{ accountId: string; role: string }>;
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
}

export function createPanelNotificationsRouter(deps: PanelNotificationsRouterDeps) {
    const {
        authUser,
        parseVertical,
        listMessageThreadsForUser,
        buildMessageThreadNotification,
        getPrimaryAccountIdForUser,
        getAccountMembershipsForUser,
        getAccountMembershipFromDb,
    } = deps;

    const app = new Hono();

    app.get('/notifications', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const defaultMembership = getAccountMembershipFromDb
            ? await getAccountMembershipFromDb(user.id)
            : null;
        const accountId = getAccountMembershipFromDb
            ? defaultMembership?.accountId ?? null
            : await getPrimaryAccountIdForUser(user.id);
        const threads = await listMessageThreadsForUser(user.id, vertical, 'inbox', accountId);
        let visibleThreads = threads;
        const membership = accountId
            ? (defaultMembership?.accountId === accountId
                ? defaultMembership
                : getAccountMembershipFromDb
                    ? await getAccountMembershipFromDb(user.id, accountId)
                    : getAccountMembershipsForUser(user.id).find((item) => item.accountId === accountId))
            : null;
        if (vertical === 'autos' || vertical === 'propiedades') {
            const [account] = accountId
                ? await db.select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
                    .from(accounts)
                    .where(eq(accounts.id, accountId))
                    .limit(1)
                : [];
            const isOwnerPersonalWorkspace = Boolean(account?.isPersonal && account.ownerUserId === user.id);
            visibleThreads = threads.filter((thread: any) => (
                (isOwnerPersonalWorkspace && thread.buyerUserId === user.id)
                || Boolean(membership && thread.accountId === accountId)
                || Boolean(isOwnerPersonalWorkspace && !thread.accountId && thread.ownerUserId === user.id)
            ));
        }
        if ((vertical === 'autos' || vertical === 'propiedades') && accountId && membership?.role === 'agent') {
            const teamVertical = vertical as 'autos' | 'propiedades';
            const [ownedListings, assignedListings, assignedContacts] = await Promise.all([
                db.select({ id: listings.id })
                    .from(listings)
                    .where(and(
                        eq(listings.accountId, accountId),
                        eq(listings.vertical, teamVertical),
                        eq(listings.ownerId, user.id),
                    )),
                db.select({ listingId: accountListingAssignments.listingId })
                    .from(accountListingAssignments)
                    .where(and(
                        eq(accountListingAssignments.accountId, accountId),
                        eq(accountListingAssignments.vertical, teamVertical),
                        eq(accountListingAssignments.assignedUserId, user.id),
                    )),
                db.select({ personId: accountRelationshipAssignments.personId })
                    .from(accountRelationshipAssignments)
                    .where(and(
                        eq(accountRelationshipAssignments.accountId, accountId),
                        eq(accountRelationshipAssignments.vertical, teamVertical),
                        eq(accountRelationshipAssignments.assignedUserId, user.id),
                    )),
            ]);
            const listingIds = new Set([
                ...ownedListings.map((row: { id: string }) => row.id),
                ...assignedListings.map((row: { listingId: string }) => row.listingId),
            ]);
            const personIds = new Set(assignedContacts.map((row: { personId: string }) => row.personId));
            visibleThreads = threads.filter((thread: any) => (
                thread.accountId === accountId
                && (personIds.has(thread.buyerUserId)
                    || Boolean(thread.listingId && listingIds.has(thread.listingId)))
            ));
        }
        const messageNotifications = (await Promise.all(
            visibleThreads.slice(0, 8).map((thread: any) => {
                const sellerOverride = Boolean(
                    thread.ownerUserId !== user.id
                    && thread.accountId === accountId
                    && membership,
                );
                return buildMessageThreadNotification(thread, user.id, sellerOverride);
            }),
        )).filter((item): item is NonNullable<typeof item> => Boolean(item));

        return c.json({
            ok: true,
            items: messageNotifications.sort((a: any, b: any) => b.createdAt - a.createdAt).slice(0, 8),
        });
    });

    return app;
}
