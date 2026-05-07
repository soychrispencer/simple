/**
 * Rutas HTTP de notificaciones Serenatas (extraídas del router principal).
 * Montaje: `attachSerenatasNotificationRoutes(app, deps)` desde `router.ts`.
 */
import type { Context } from 'hono';
import type { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import type { SerenatasRouterDeps } from './serenatas-router-deps.js';

export function attachSerenatasNotificationRoutes(app: Hono, deps: SerenatasRouterDeps): void {
    const { db, authUser, requireAuth, tables, vapidPublicKey } = deps;
    const pushSubs = tables.pushSubscriptions;

    async function getAuthUser(c: Context) {
        return authUser(c);
    }

    app.get('/notifications', requireAuth, async (c) => {
        try {
            const user = await getAuthUser(c);
            if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

            const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
            const unreadOnly = c.req.query('unread') === 'true';

            const conditions = [eq(tables.serenataNotifications.userId, user.id)];
            if (unreadOnly) {
                conditions.push(eq(tables.serenataNotifications.isRead, false));
            }

            const notifications = await db.query.serenataNotifications.findMany({
                where: and(...conditions),
                limit,
                orderBy: [desc(tables.serenataNotifications.createdAt)],
            });

            const unreadCount = await db.query.serenataNotifications
                .findMany({
                    where: and(
                        eq(tables.serenataNotifications.userId, user.id),
                        eq(tables.serenataNotifications.isRead, false)
                    ),
                })
                .then((n: unknown[]) => n.length);

            return c.json({ ok: true, notifications, unreadCount });
        } catch (error) {
            console.error('[serenatas/notifications] Error getting notifications:', error);
            return c.json({ ok: false, error: 'Error al obtener notificaciones' }, 500);
        }
    });

    app.patch('/notifications/:id/read', requireAuth, async (c) => {
        try {
            const user = await getAuthUser(c);
            if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

            const id = c.req.param('id');

            const [updated] = await db
                .update(tables.serenataNotifications)
                .set({ isRead: true, readAt: new Date() })
                .where(
                    and(
                        eq(tables.serenataNotifications.id, id),
                        eq(tables.serenataNotifications.userId, user.id)
                    )
                )
                .returning();

            if (!updated) {
                return c.json({ ok: false, error: 'Notificación no encontrada' }, 404);
            }

            return c.json({ ok: true });
        } catch (error) {
            console.error('[serenatas/notifications] Error marking as read:', error);
            return c.json({ ok: false, error: 'Error al marcar notificación' }, 500);
        }
    });

    app.post('/notifications/read-all', requireAuth, async (c) => {
        try {
            const user = await getAuthUser(c);
            if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

            await db
                .update(tables.serenataNotifications)
                .set({ isRead: true, readAt: new Date() })
                .where(
                    and(
                        eq(tables.serenataNotifications.userId, user.id),
                        eq(tables.serenataNotifications.isRead, false)
                    )
                );

            return c.json({ ok: true, message: 'Todas las notificaciones marcadas como leídas' });
        } catch (error) {
            console.error('[serenatas/notifications] Error marking all as read:', error);
            return c.json({ ok: false, error: 'Error al marcar notificaciones' }, 500);
        }
    });

    app.delete('/notifications/:id', requireAuth, async (c) => {
        try {
            const user = await getAuthUser(c);
            if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

            const id = c.req.param('id');

            await db
                .delete(tables.serenataNotifications)
                .where(
                    and(
                        eq(tables.serenataNotifications.id, id),
                        eq(tables.serenataNotifications.userId, user.id)
                    )
                );

            return c.json({ ok: true });
        } catch (error) {
            console.error('[serenatas/notifications] Error deleting notification:', error);
            return c.json({ ok: false, error: 'Error al eliminar notificación' }, 500);
        }
    });

    app.get('/notifications/unread-count', requireAuth, async (c) => {
        try {
            const user = await getAuthUser(c);
            if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

            const count = await db.query.serenataNotifications
                .findMany({
                    where: and(
                        eq(tables.serenataNotifications.userId, user.id),
                        eq(tables.serenataNotifications.isRead, false)
                    ),
                })
                .then((n: unknown[]) => n.length);

            return c.json({ ok: true, count });
        } catch (error) {
            console.error('[serenatas/notifications] Error getting unread count:', error);
            return c.json({ ok: false, error: 'Error al obtener conteo' }, 500);
        }
    });

    // ── Web Push (misma tabla `push_subscriptions` que SimpleAgenda) ─────────
    app.get('/push/vapid-public-key', requireAuth, async (c) => {
        return c.json({ ok: true, key: vapidPublicKey || null });
    });

    app.post('/push/subscribe', requireAuth, async (c) => {
        try {
            const user = await getAuthUser(c);
            if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

            const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
            const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;
            const keys = body.keys && typeof body.keys === 'object' ? (body.keys as Record<string, string>) : null;
            if (!endpoint || !keys?.p256dh || !keys?.auth) {
                return c.json({ ok: false, error: 'Suscripción inválida' }, 400);
            }
            const ua = c.req.header('user-agent')?.slice(0, 500) ?? null;
            await db
                .insert(pushSubs)
                .values({
                    userId: user.id,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userAgent: ua,
                })
                .onConflictDoNothing();
            return c.json({ ok: true });
        } catch (error) {
            console.error('[serenatas/push/subscribe]', error);
            return c.json({ ok: false, error: 'Error al guardar suscripción' }, 500);
        }
    });

    app.post('/push/unsubscribe', requireAuth, async (c) => {
        try {
            const user = await getAuthUser(c);
            if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

            const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
            const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;
            if (!endpoint) return c.json({ ok: false, error: 'endpoint requerido' }, 400);

            await db.delete(pushSubs).where(and(eq(pushSubs.userId, user.id), eq(pushSubs.endpoint, endpoint)));
            return c.json({ ok: true });
        } catch (error) {
            console.error('[serenatas/push/unsubscribe]', error);
            return c.json({ ok: false, error: 'Error al eliminar suscripción' }, 500);
        }
    });
}
