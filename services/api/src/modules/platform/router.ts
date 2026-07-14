import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import {
    countUnreadPlatformNotifications,
    listPlatformNotificationsForUser,
    markAllPlatformNotificationsRead,
    markPlatformNotificationRead,
} from './notifications-service.js';
import {
    createRelationshipNote,
    deleteRelationshipNote,
    listRelationshipNotes,
    relationshipNoteVerticalSchema,
    resolveRelationshipBusinessId,
} from './relationship-notes.js';

export type PlatformRouterDeps = {
    authUser: (c: Context) => Promise<{ id: string } | null>;
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

        const businessId = await resolveRelationshipBusinessId(user.id, verticalParsed.data);
        if (!businessId) {
            return c.json({ ok: false, error: 'No tienes un negocio activo en esta vertical.' }, 403);
        }

        const items = await listRelationshipNotes({
            vertical: verticalParsed.data,
            businessId,
            personId: personId.slice(0, 160),
        });
        return c.json({ ok: true, items });
    });

    app.post('/relationship-notes', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const parsed = createNoteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Nota inválida' }, 400);
        }

        const businessId = await resolveRelationshipBusinessId(user.id, parsed.data.vertical);
        if (!businessId) {
            return c.json({ ok: false, error: 'No tienes un negocio activo en esta vertical.' }, 403);
        }

        const item = await createRelationshipNote({
            vertical: parsed.data.vertical,
            businessId,
            personId: parsed.data.personId,
            body: parsed.data.body,
            authorUserId: user.id,
        });
        return c.json({ ok: true, item }, 201);
    });

    app.delete('/relationship-notes/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const verticalParsed = relationshipNoteVerticalSchema.safeParse(c.req.query('vertical'));
        if (!verticalParsed.success) {
            return c.json({ ok: false, error: 'vertical requerida' }, 400);
        }

        const businessId = await resolveRelationshipBusinessId(user.id, verticalParsed.data);
        if (!businessId) {
            return c.json({ ok: false, error: 'No tienes un negocio activo en esta vertical.' }, 403);
        }

        const ok = await deleteRelationshipNote({
            noteId: c.req.param('id'),
            businessId,
            authorUserId: user.id,
        });
        if (!ok) return c.json({ ok: false, error: 'Nota no encontrada' }, 404);
        return c.json({ ok: true });
    });

    return app;
}
