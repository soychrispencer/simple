import { Hono } from 'hono';
import type { Context } from 'hono';

export interface MessagesRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    db: any;
    tables: { listingLeads: any };
    dbHelpers: { eq: any };
    messageFolderSchema: any;
    messageThreadUpdateSchema: any;
    messageEntryCreateSchema: any;
    listMessageThreadsForUser: (userId: string, vertical: any, folder: any) => Promise<any[]>;
    listMessageEntries: (threadId: string) => Promise<any[]>;
    messageThreadToResponse: (thread: any, userId: string, entries: any[]) => any;
    messageEntryToResponse: (entry: any, userId: string) => any;
    getMessageThreadById: (id: string) => Promise<any>;
    isThreadParticipant: (userId: string, thread: any) => boolean;
    markMessageThreadRead: (thread: any, userId: string) => Promise<any>;
    getListingLeadById: (id: string) => Promise<any>;
    listingLeadToResponse: (lead: any, opts?: any) => any;
    updateMessageThreadViewerState: (thread: any, userId: string, action: any) => Promise<any>;
    createMessageEntry: (opts: any) => Promise<any>;
    touchMessageThreadAfterIncomingMessage: (thread: any, senderRole: any, now: number) => Promise<any>;
    mapListingLeadRow: (row: any) => any;
    createListingLeadActivity: (opts: any) => Promise<any>;
    listingLeadStatusLabel: (status: any) => string;
    listListingLeadRecords: (opts: any) => Promise<any[]>;
    listServiceLeadRecords: (opts: any) => Promise<any[]>;
    userCanUseCrm: (user: any, vertical: any) => boolean;
    isAdminRole: (role: any) => boolean;
    buildMessageThreadNotification: (thread: any, userId: string) => Promise<any>;
    buildListingLeadNotification: (lead: any) => any;
    buildServiceLeadNotification: (lead: any) => any;
}

export function createMessagesRouter(deps: MessagesRouterDeps) {
    const {
        authUser,
        parseVertical,
        db,
        tables: { listingLeads },
        dbHelpers: { eq },
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
        getListingLeadById,
        listingLeadToResponse,
        updateMessageThreadViewerState,
        createMessageEntry,
        touchMessageThreadAfterIncomingMessage,
        mapListingLeadRow,
        createListingLeadActivity,
        listingLeadStatusLabel,
        listListingLeadRecords,
        listServiceLeadRecords,
        userCanUseCrm,
        isAdminRole,
        buildMessageThreadNotification,
        buildListingLeadNotification,
        buildServiceLeadNotification,
    } = deps;

    const app = new Hono();

    app.get('/threads', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const folderParsed = messageFolderSchema.safeParse(c.req.query('folder'));
        const folder = folderParsed.success ? folderParsed.data : 'inbox';
        const threads = await listMessageThreadsForUser(user.id, vertical, folder);
        const items = await Promise.all(threads.map(async (thread: any) => {
            const entries = await listMessageEntries(thread.id);
            return messageThreadToResponse(thread, user.id, entries);
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
        if (!isThreadParticipant(user.id, thread) && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No autorizado' }, 403);
        }

        const hydratedThread = await markMessageThreadRead(thread, user.id);
        const [entries, lead] = await Promise.all([
            listMessageEntries(hydratedThread.id),
            getListingLeadById(hydratedThread.leadId),
        ]);

        return c.json({
            ok: true,
            item: messageThreadToResponse(hydratedThread, user.id, entries),
            entries: entries.map((entry: any) => messageEntryToResponse(entry, user.id)),
            lead: lead ? listingLeadToResponse(lead, { threadId: hydratedThread.id }) : null,
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
        if (!isThreadParticipant(user.id, thread) && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No autorizado' }, 403);
        }

        const updatedThread = await updateMessageThreadViewerState(thread, user.id, parsed.data.action);
        const entries = await listMessageEntries(updatedThread.id);

        return c.json({
            ok: true,
            item: messageThreadToResponse(updatedThread, user.id, entries),
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
        if (!isThreadParticipant(user.id, thread) && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No autorizado' }, 403);
        }

        const senderRole = user.id === thread.ownerUserId ? 'seller' : 'buyer';
        const now = Date.now();
        const entry = await createMessageEntry({
            threadId: thread.id,
            senderUserId: user.id,
            senderRole,
            body: parsed.data.body,
            createdAt: now,
        });
        const updatedThread = await touchMessageThreadAfterIncomingMessage(thread, senderRole, now);

        const lead = await getListingLeadById(thread.leadId);
        let updatedLead: any = lead;
        if (lead) {
            const updatePayload: Record<string, unknown> = {
                updatedAt: new Date(now),
            };
            if (senderRole === 'seller' && lead.status === 'new') {
                updatePayload.status = 'contacted';
            }
            const rows = await db.update(listingLeads).set(updatePayload).where(eq(listingLeads.id, lead.id)).returning();
            updatedLead = rows.length > 0 ? mapListingLeadRow(rows[0]) : lead;

            if (senderRole === 'seller' && lead.status === 'new') {
                await createListingLeadActivity({
                    leadId: lead.id,
                    actorUserId: user.id,
                    type: 'status',
                    body: `Estado cambiado de ${listingLeadStatusLabel(lead.status)} a ${listingLeadStatusLabel('contacted')}.`,
                    meta: { from: lead.status, to: 'contacted' },
                });
            }
            await createListingLeadActivity({
                leadId: lead.id,
                actorUserId: user.id,
                type: 'message',
                body: senderRole === 'seller'
                    ? `Respuesta del vendedor: ${parsed.data.body.trim()}`
                    : `Nuevo mensaje del comprador: ${parsed.data.body.trim()}`,
            });
        }

        const entries = await listMessageEntries(updatedThread.id);
        return c.json({
            ok: true,
            item: messageThreadToResponse(updatedThread, user.id, entries),
            entry: messageEntryToResponse(entry, user.id),
            entries: entries.map((e: any) => messageEntryToResponse(e, user.id)),
            lead: updatedLead ? listingLeadToResponse(updatedLead, { threadId: updatedThread.id }) : null,
        }, 201);
    });

    return app;
}

export interface PanelNotificationsRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    listMessageThreadsForUser: (userId: string, vertical: any, folder: any) => Promise<any[]>;
    listListingLeadRecords: (opts: any) => Promise<any[]>;
    listServiceLeadRecords: (opts: any) => Promise<any[]>;
    userCanUseCrm: (user: any, vertical: any) => boolean;
    isAdminRole: (role: any) => boolean;
    buildMessageThreadNotification: (thread: any, userId: string) => Promise<any>;
    buildListingLeadNotification: (lead: any) => any;
    buildServiceLeadNotification: (lead: any) => any;
}

export function createPanelNotificationsRouter(deps: PanelNotificationsRouterDeps) {
    const {
        authUser,
        parseVertical,
        listMessageThreadsForUser,
        listListingLeadRecords,
        listServiceLeadRecords,
        userCanUseCrm,
        isAdminRole,
        buildMessageThreadNotification,
        buildListingLeadNotification,
        buildServiceLeadNotification,
    } = deps;

    const app = new Hono();

    app.get('/notifications', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const [threads, listingLeadItems, serviceLeadItems] = await Promise.all([
            listMessageThreadsForUser(user.id, vertical, 'inbox'),
            userCanUseCrm(user, vertical)
                ? listListingLeadRecords({
                    vertical,
                    ownerUserId: user.role === 'superadmin' ? undefined : user.id,
                    limit: 8,
                })
                : Promise.resolve([] as any[]),
            isAdminRole(user.role) ? listServiceLeadRecords({ vertical, limit: 8 }) : Promise.resolve([] as any[]),
        ]);

        const messageNotifications = (await Promise.all(threads.slice(0, 8).map((thread: any) => buildMessageThreadNotification(thread, user.id))))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
        const items = [
            ...messageNotifications,
            ...listingLeadItems.map(buildListingLeadNotification),
            ...serviceLeadItems.map(buildServiceLeadNotification),
        ]
            .sort((a: any, b: any) => b.createdAt - a.createdAt)
            .slice(0, 8);

        return c.json({ ok: true, items });
    });

    return app;
}
