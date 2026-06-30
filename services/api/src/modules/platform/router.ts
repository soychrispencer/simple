import { Hono } from 'hono';
import type { Context } from 'hono';
import {
    countUnreadPlatformNotifications,
    listPlatformNotificationsForUser,
    markAllPlatformNotificationsRead,
    markPlatformNotificationRead,
} from './notifications-service.js';

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

    return app;
}
