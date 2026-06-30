import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { MessageServiceDeps } from './service.js';
import { createOrAppendListingConversation } from './listing-conversation.js';

const listingConversationSchema = z.object({
    listingId: z.string().uuid(),
    message: z.string().min(1).max(4000),
    contactName: z.string().min(2).max(120).optional(),
});

export interface MessagesRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    messageFolderSchema: any;
    messageThreadUpdateSchema: any;
    messageEntryCreateSchema: any;
    listMessageThreadsForUser: (userId: string, vertical: any, folder: any) => Promise<any[]>;
    listMessageEntries: (threadId: string) => Promise<any[]>;
    messageThreadToResponse: (thread: any, userId: string, entries: any[]) => any | Promise<any>;
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
    } = deps;

    const app = new Hono();

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
        if (listing.ownerId === user.id) {
            return c.json({ ok: false, error: 'No puedes enviarte mensajes a tu propia publicación.' }, 400);
        }

        const buyerName = parsed.data.contactName?.trim() || user.name || user.email;
        const result = await createOrAppendListingConversation(messageDeps, {
            listing: {
                id: listing.id,
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

    app.get('/threads', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const folderParsed = messageFolderSchema.safeParse(c.req.query('folder'));
        const folder = folderParsed.success ? folderParsed.data : 'inbox';
        const threads = await listMessageThreadsForUser(user.id, vertical, folder);
        const items = await Promise.all(threads.map(async (thread: any) => {
            const entries = await listMessageEntries(thread.id);
            return await messageThreadToResponse(thread, user.id, entries);
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
        const entries = await listMessageEntries(hydratedThread.id);

        return c.json({
            ok: true,
            item: await messageThreadToResponse(hydratedThread, user.id, entries),
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
        if (!isThreadParticipant(user.id, thread) && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No autorizado' }, 403);
        }

        const updatedThread = await updateMessageThreadViewerState(thread, user.id, parsed.data.action);
        const entries = await listMessageEntries(updatedThread.id);

        return c.json({
            ok: true,
            item: await messageThreadToResponse(updatedThread, user.id, entries),
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
        const entries = await listMessageEntries(updatedThread.id);
        return c.json({
            ok: true,
            item: await messageThreadToResponse(updatedThread, user.id, entries),
            entry: messageEntryToResponse(entry, user.id),
            entries: entries.map((e: any) => messageEntryToResponse(e, user.id)),
        }, 201);
    });

    return app;
}

export interface PanelNotificationsRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    listMessageThreadsForUser: (userId: string, vertical: any, folder: any) => Promise<any[]>;
    buildMessageThreadNotification: (thread: any, userId: string) => Promise<any>;
}

export function createPanelNotificationsRouter(deps: PanelNotificationsRouterDeps) {
    const {
        authUser,
        parseVertical,
        listMessageThreadsForUser,
        buildMessageThreadNotification,
    } = deps;

    const app = new Hono();

    app.get('/notifications', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const threads = await listMessageThreadsForUser(user.id, vertical, 'inbox');
        const messageNotifications = (await Promise.all(
            threads.slice(0, 8).map((thread: any) => buildMessageThreadNotification(thread, user.id)),
        )).filter((item): item is NonNullable<typeof item> => Boolean(item));

        return c.json({
            ok: true,
            items: messageNotifications.sort((a: any, b: any) => b.createdAt - a.createdAt).slice(0, 8),
        });
    });

    return app;
}
