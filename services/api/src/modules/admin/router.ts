import { Hono } from 'hono';
import {
    type CrmServiceDeps,
    type AppUser,
    type VerticalType,
    type ListingLeadStatus,
    type ServiceLeadStatus,
    serviceLeadUpdateSchema,
    serviceLeadNoteSchema,
    listingLeadUpdateSchema,
    listingLeadNoteSchema,
    leadQuickActionSchema,
    listServiceLeadRecords,
    getServiceLeadById,
    buildServiceLeadDetailPayload,
    updateServiceLeadRecord,
    createServiceLeadActivity,
    runServiceLeadQuickAction,
    serviceLeadToResponse,
    serviceLeadActivityToResponse,
    listListingLeadRecords,
    getListingLeadById,
    buildListingLeadDetailPayload,
    updateListingLeadRecord,
    createListingLeadActivity,
    runListingLeadQuickAction,
    listingLeadToResponse,
    listingLeadActivityToResponse,
    getLeadQuickActionLabel,
    mapServiceLeadRow,
    mapListingLeadRow,
} from '../crm/service.js';

export type AdminRouterDeps = CrmServiceDeps & {
    authUser: (c: any) => Promise<AppUser | null>;
    isAdminRole: (role: any) => boolean;
    parseVertical: (raw: any) => any;
    getUserById: (id: string) => Promise<AppUser | null>;
    sanitizeUser: (user: any) => any;
    mapUserRowToAppUser: (row: any) => AppUser;
    permanentlyDeleteUser: (userId: string) => Promise<void>;
    countActiveSuperadminUsers: () => Promise<number>;
    isActiveAdminStatus: (status: any) => boolean;
    ensurePrimaryAccountForUser: (user: any, accountType?: any) => Promise<any>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getEnvStatus: () => Record<string, unknown>;
    isAdminForVertical: (user: AppUser, vertical: VerticalType) => boolean;
    listAdminUsersSnapshot: (vertical?: VerticalType | null) => Promise<any[]>;
    listAdminListingsSnapshot: (vertical?: VerticalType | null) => Promise<any[]>;
    getPaidSubscriptionPlan: (vertical: any, planId: any) => any;
    makeSubscriptionId: (vertical: any, planId: any) => string;
    upsertActiveSubscription: (sub: any) => void;
    activeSubscriptionsByUser: Map<string, any[]>;
    isAdminBootstrapEnabled: () => boolean;
    handleBootstrap: (c: any) => Promise<Response>;
    tables: CrmServiceDeps['tables'] & {
        agendaProfessionalProfiles: any;
        subscriptions?: any;
        serenataCoordinatorProfiles?: any;
        serenataMusicians?: any;
        serenataPayments?: any;
        serenatas?: any;
    };
    sql: any;
};

/** Recorre `cause` y adjunta `code`/`detail`/`hint` de Postgres (PostgresError no siempre va en el primer nivel). */
function serializePgErrorChain(error: unknown): string {
    const parts: string[] = [];
    const seen = new Set<unknown>();
    let cur: unknown = error;
    for (let depth = 0; depth < 14 && cur != null; depth++) {
        if (seen.has(cur)) break;
        seen.add(cur);
        if (cur instanceof Error) {
            parts.push(cur.message);
        } else if (typeof cur === 'object') {
            const o = cur as Record<string, unknown>;
            if (typeof o.message === 'string') parts.push(o.message);
        } else {
            parts.push(String(cur));
        }
        if (typeof cur === 'object' && cur !== null) {
            const o = cur as Record<string, unknown>;
            if (typeof o.code === 'string') parts.push(`code=${o.code}`);
            if (typeof o.detail === 'string' && o.detail) parts.push(o.detail);
            if (typeof o.hint === 'string' && o.hint) parts.push(`hint=${o.hint}`);
            if (typeof o.column === 'string') parts.push(`column=${o.column}`);
        }
        cur = typeof cur === 'object' && cur !== null && 'cause' in cur ? (cur as { cause?: unknown }).cause : undefined;
    }
    return parts.join(' | ');
}

/** SQLSTATE Postgres (5 caracteres; ej. `42P01` relación inexistente, `42703` columna inexistente). */
function pickPgCode(error: unknown): string | undefined {
    let cur: unknown = error;
    const seen = new Set<unknown>();
    for (let depth = 0; depth < 14 && cur != null; depth++) {
        if (seen.has(cur)) break;
        seen.add(cur);
        if (typeof cur === 'object' && cur !== null && 'code' in cur) {
            const c = (cur as { code?: unknown }).code;
            if (typeof c === 'string' && /^[0-9A-Z]{5}$/i.test(c)) return c.toUpperCase();
        }
        cur =
            typeof cur === 'object' && cur !== null && 'cause' in cur
                ? (cur as { cause?: unknown }).cause
                : undefined;
    }
    return undefined;
}

export function createAdminRouter(deps: AdminRouterDeps) {
    const app = new Hono();
    const createAdminAudit = async (input: {
        actorUserId: string;
        action: string;
        entityType: string;
        entityId: string;
        payload?: unknown;
    }) => {
        try {
            await deps.db.execute(deps.sql`
                INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, payload)
                VALUES (${input.actorUserId}, ${input.action}, ${input.entityType}, ${input.entityId}, ${JSON.stringify(input.payload ?? {})}::jsonb)
            `);
        } catch (error) {
            console.error('[admin audit] error creating log', error);
        }
    };

    // ── Bootstrap ────────────────────────────────────────────────────────────

    app.post('/bootstrap', (c) => deps.handleBootstrap(c));

    // ── Overview ─────────────────────────────────────────────────────────────

    app.get('/overview', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const [adminUsers, adminListings, recentLeads] = await Promise.all([
            deps.listAdminUsersSnapshot(scopedVertical),
            deps.listAdminListingsSnapshot(scopedVertical),
            listServiceLeadRecords(deps, { limit: 6, vertical: scopedVertical ?? undefined }),
        ]);

        const autosListings = adminListings.filter((item: any) => item.vertical === 'autos');
        const propiedadesListings = adminListings.filter((item: any) => item.vertical === 'propiedades');
        const newLeads = recentLeads.filter((lead) => lead.status === 'new').length;

        return c.json({
            ok: true,
            stats: {
                usersTotal: adminUsers.length,
                autosListingsTotal: autosListings.length,
                propiedadesListingsTotal: propiedadesListings.length,
                newServiceLeads: newLeads,
            },
            recentUsers: adminUsers.slice(0, 6),
            recentListings: adminListings.slice(0, 6),
            recentLeads: recentLeads.map((r) => serviceLeadToResponse(deps, r)),
            systemStatus: deps.getEnvStatus(),
        });
    });

    // ── System status ─────────────────────────────────────────────────────────

    app.get('/system-status', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
        return c.json({ ok: true, status: deps.getEnvStatus() });
    });

    // ── Users ─────────────────────────────────────────────────────────────────

    app.get('/users', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const items = await deps.listAdminUsersSnapshot(scopedVertical);
        return c.json({ ok: true, items });
    });

    app.patch('/users/:id/role', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede modificar roles' }, 403);

        const payload = await c.req.json().catch(() => null);
        const role = payload?.role;
        if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
            return c.json({ ok: false, error: 'Rol inválido' }, 400);
        }

        const userId = c.req.param('id') ?? '';
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        const updated = await deps.db.update(deps.tables.users).set({ role }).where(deps.eq(deps.tables.users.id, userId)).returning();
        if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

        const appUser = deps.mapUserRowToAppUser(updated[0]);
        return c.json({ ok: true, item: deps.sanitizeUser(appUser) });
    });

    app.patch('/users/:id/status', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede modificar el estado de usuarios' }, 403);

        const payload = await c.req.json().catch(() => null);
        const status = payload?.status;
        if (!status || !['active', 'verified', 'suspended'].includes(status)) {
            return c.json({ ok: false, error: 'Status inválido' }, 400);
        }

        const userId = c.req.param('id') ?? '';
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        const updated = await deps.db.update(deps.tables.users).set({ status }).where(deps.eq(deps.tables.users.id, userId)).returning();
        if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

        const appUser = deps.mapUserRowToAppUser(updated[0]);
        return c.json({ ok: true, item: deps.sanitizeUser(appUser) });
    });

    app.delete('/users/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede eliminar usuarios' }, 403);

        const userId = c.req.param('id') ?? '';
        if (adminUser.id === userId) {
            return c.json({ ok: false, error: 'No puedes eliminar tu propia cuenta' }, 400);
        }

        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        if (targetUser.role === 'superadmin' && deps.isActiveAdminStatus(targetUser.status)) {
            const remainingSuperadmins = await deps.countActiveSuperadminUsers();
            if (remainingSuperadmins <= 1) {
                return c.json({ ok: false, error: 'No puedes eliminar al último superadmin activo' }, 400);
            }
        }

        await deps.permanentlyDeleteUser(userId);
        return c.json({ ok: true, message: 'Usuario eliminado permanentemente' });
    });

    app.put('/users/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede editar usuarios' }, 403);

        const payload = await c.req.json().catch(() => null);
        const userId = c.req.param('id') ?? '';
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        const updates: Record<string, any> = {};
        if (payload?.name && typeof payload.name === 'string' && payload.name.trim().length > 0) {
            updates.name = payload.name.trim();
        }
        if (payload?.phone && typeof payload.phone === 'string') {
            updates.phone = payload.phone.trim() || null;
        }
        if (Object.keys(updates).length === 0) {
            return c.json({ ok: false, error: 'No hay datos para actualizar' }, 400);
        }

        const updated = await deps.db.update(deps.tables.users).set(updates).where(deps.eq(deps.tables.users.id, userId)).returning();
        if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

        const appUser = deps.mapUserRowToAppUser(updated[0]);
        return c.json({ ok: true, item: deps.sanitizeUser(appUser) });
    });

    app.patch('/users/:id/subscriptions', async (c) => {
        try {
            const adminUser = await deps.authUser(c);
            if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
            if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

            const payload = await c.req.json().catch(() => null);
            const userId = c.req.param('id') ?? '';

            const targetUser = await deps.getUserById(userId);
            if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);
            const targetAccount = await deps.ensurePrimaryAccountForUser(targetUser);

            const subData = payload?.subscriptions || {};
            const results: Record<string, any> = {};

            if (subData.agenda) {
                const profile = await deps.db.select()
                    .from(deps.tables.agendaProfessionalProfiles)
                    .where(deps.eq(deps.tables.agendaProfessionalProfiles.userId, userId))
                    .limit(1);

                const plan = subData.agenda.plan;
                const expiresAt = subData.agenda.expiresAt ? new Date(subData.agenda.expiresAt) : null;

                if (profile.length > 0) {
                    await deps.db.update(deps.tables.agendaProfessionalProfiles)
                        .set({ plan, planExpiresAt: expiresAt, updatedAt: new Date() })
                        .where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profile[0].id));
                    results.agenda = { plan, expiresAt: expiresAt?.toISOString() || null };
                } else {
                    const slug = `${targetUser.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`;
                    await deps.db.insert(deps.tables.agendaProfessionalProfiles).values({
                        accountId: await deps.getPrimaryAccountIdForUser(userId),
                        userId,
                        slug,
                        displayName: targetUser.name,
                        plan,
                        planExpiresAt: expiresAt,
                    }).returning();
                    results.agenda = { plan, expiresAt: expiresAt?.toISOString() || null, created: true };
                }
            }

            if (subData.autos) {
                const planId = subData.autos.planId || null;
                const status = subData.autos.status || 'active';
                const expiresAt = subData.autos.expiresAt ? new Date(subData.autos.expiresAt) : null;
                const existing = await deps.db.execute(deps.sql`
                    SELECT id FROM subscriptions WHERE user_id = ${userId} AND vertical = 'autos' LIMIT 1
                `);
                if (existing.length > 0) {
                    await deps.db.execute(deps.sql`
                        UPDATE subscriptions SET plan_id = ${planId}, status = ${status}, expires_at = ${expiresAt}, updated_at = now()
                        WHERE id = ${(existing[0] as any).id}
                    `);
                } else {
                    await deps.db.execute(deps.sql`
                        INSERT INTO subscriptions (account_id, user_id, plan_id, vertical, status, provider, expires_at)
                        VALUES (${targetAccount.id}, ${userId}, ${planId}, 'autos', ${status}, 'manual', ${expiresAt})
                    `);
                }
                results.autos = { planId, status, expiresAt: expiresAt?.toISOString() || null };
            }

            if (subData.propiedades) {
                const planId = subData.propiedades.planId || null;
                const status = subData.propiedades.status || 'active';
                const expiresAt = subData.propiedades.expiresAt ? new Date(subData.propiedades.expiresAt) : null;
                const existing = await deps.db.execute(deps.sql`
                    SELECT id FROM subscriptions WHERE user_id = ${userId} AND vertical = 'propiedades' LIMIT 1
                `);
                if (existing.length > 0) {
                    await deps.db.execute(deps.sql`
                        UPDATE subscriptions SET plan_id = ${planId}, status = ${status}, expires_at = ${expiresAt}, updated_at = now()
                        WHERE id = ${(existing[0] as any).id}
                    `);
                } else {
                    await deps.db.execute(deps.sql`
                        INSERT INTO subscriptions (account_id, user_id, plan_id, vertical, status, provider, expires_at)
                        VALUES (${targetAccount.id}, ${userId}, ${planId}, 'propiedades', ${status}, 'manual', ${expiresAt})
                    `);
                }
                results.propiedades = { planId, status, expiresAt: expiresAt?.toISOString() || null };
            }

            if (subData.serenatas) {
                const planId = subData.serenatas.planId || null;
                const status = subData.serenatas.status || 'active';
                const expiresAt = subData.serenatas.expiresAt ? new Date(subData.serenatas.expiresAt) : null;
                const existing = await deps.db.execute(deps.sql`
                    SELECT id FROM subscriptions WHERE user_id = ${userId} AND vertical = 'serenatas' LIMIT 1
                `);
                if (existing.length > 0) {
                    await deps.db.execute(deps.sql`
                        UPDATE subscriptions SET plan_id = ${planId}, status = ${status}, expires_at = ${expiresAt}, updated_at = now()
                        WHERE id = ${(existing[0] as any).id}
                    `);
                } else {
                    await deps.db.execute(deps.sql`
                        INSERT INTO subscriptions (account_id, user_id, plan_id, vertical, status, provider, expires_at)
                        VALUES (${targetAccount.id}, ${userId}, ${planId}, 'serenatas', ${status}, 'manual', ${expiresAt})
                    `);
                }
                results.serenatas = { planId, status, expiresAt: expiresAt?.toISOString() || null };
            }

            return c.json({ ok: true, results });
        } catch (error) {
            console.error('[admin subscriptions] error:', error);
            return c.json({ ok: false, error: 'Error al actualizar suscripciones' }, 500);
        }
    });

    app.patch('/users/:id/serenatas-role', async (c) => {
        try {
            const adminUser = await deps.authUser(c);
            if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
            if (!deps.isAdminRole(adminUser.role)) {
                return c.json({ ok: false, error: 'No autorizado' }, 403);
            }

            const userId = c.req.param('id') ?? '';
            const payload = await c.req.json().catch(() => null);
            const role = payload?.role;
            if (!role || !['client', 'musician', 'coordinator'].includes(role)) {
                return c.json({ ok: false, error: 'Rol serenatas inválido' }, 400);
            }

            const targetUser = await deps.getUserById(userId);
            if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);
            if (!deps.tables.serenataCoordinatorProfiles || !deps.tables.serenataMusicians) {
                return c.json({ ok: false, error: 'Tablas serenatas no disponibles' }, 500);
            }

            /**
             * Permite borrar `serenata_coordinator_profiles`:
             * - serenatas conserva filas pero pierde el vínculo (nullable)
             * - serenata_payments tiene FK sin CASCADE: hay que borrar esos pagos primero
             */
            const prepareCoordinatorProfileDeletion = async (profileId: string) => {
                // Pagos primero: FK a coordinador sin ON DELETE CASCADE bloquea otros pasos.
                if (deps.tables.serenataPayments) {
                    try {
                        await deps.db
                            .delete(deps.tables.serenataPayments)
                            .where(deps.eq(deps.tables.serenataPayments.coordinatorProfileId, profileId));
                    } catch (payErr) {
                        const pc = pickPgCode(payErr);
                        if (pc === '42P01') {
                            // Migraciones no aplicadas: tabla `serenata_payments` inexistente; seguir con `serenatas`.
                        } else if (pc === '42703') {
                            await deps.db.execute(deps.sql`
                                DELETE FROM serenata_payments WHERE captain_id = ${profileId}
                            `);
                        } else {
                            throw payErr;
                        }
                    }
                }
                if (deps.tables.serenatas) {
                    try {
                        await deps.db.execute(deps.sql`
                            UPDATE serenatas
                            SET coordinator_profile_id = NULL
                            WHERE coordinator_profile_id = ${profileId}
                        `);
                    } catch (serErr) {
                        const sc = pickPgCode(serErr);
                        if (sc === '42P01') {
                            // Migraciones Serenatas no aplicadas: no existe `serenatas`.
                            return;
                        }
                        if (sc !== '42703') throw serErr;
                        await deps.db.execute(deps.sql`
                            UPDATE serenatas SET captain_id = NULL WHERE captain_id = ${profileId}
                        `);
                    }
                }
            };

            /** Inserta fila músico si no existe (sin ON CONFLICT: evita errores si el índice único difiere). */
            const ensureMusicianRow = async () => {
                const existing = await deps.db
                    .select({ id: deps.tables.serenataMusicians.id })
                    .from(deps.tables.serenataMusicians)
                    .where(deps.eq(deps.tables.serenataMusicians.userId, userId))
                    .limit(1);
                if (existing.length > 0) return;
                try {
                    await deps.db.execute(deps.sql`
                        INSERT INTO serenata_musicians (user_id, instrument, instruments, status)
                        SELECT ${userId}, 'Voz', ARRAY['Voz']::varchar(255)[], 'active'
                        WHERE NOT EXISTS (
                          SELECT 1 FROM serenata_musicians m WHERE m.user_id = ${userId}
                        )
                    `);
                } catch {
                    try {
                        await deps.db.insert(deps.tables.serenataMusicians).values({
                            userId,
                            instrument: 'Voz',
                            status: 'active',
                        });
                    } catch (insertErr: unknown) {
                        const code =
                            insertErr && typeof insertErr === 'object' && 'code' in insertErr
                                ? (insertErr as { code?: string }).code
                                : undefined;
                        if (code === '23505') return;
                        throw insertErr;
                    }
                }
            };

            if (role === 'coordinator') {
                const existing = await deps.db
                    .select({ id: deps.tables.serenataCoordinatorProfiles.id })
                    .from(deps.tables.serenataCoordinatorProfiles)
                    .where(deps.eq(deps.tables.serenataCoordinatorProfiles.userId, userId))
                    .limit(1);
                if (existing.length === 0) {
                    await deps.db.insert(deps.tables.serenataCoordinatorProfiles).values({
                        userId,
                        phone: targetUser.phone ?? null,
                        city: null,
                        region: null,
                        subscriptionPlan: 'free',
                        subscriptionStatus: 'active',
                    });
                }
                await deps.db.delete(deps.tables.serenataMusicians).where(deps.eq(deps.tables.serenataMusicians.userId, userId));
                await deps.db
                    .update(deps.tables.users)
                    .set({ role: 'coordinator' })
                    .where(deps.eq(deps.tables.users.id, userId));
            }

            if (role === 'musician') {
                await ensureMusicianRow();
                const coordRows = await deps.db
                    .select({ id: deps.tables.serenataCoordinatorProfiles.id })
                    .from(deps.tables.serenataCoordinatorProfiles)
                    .where(deps.eq(deps.tables.serenataCoordinatorProfiles.userId, userId))
                    .limit(1);
                if (coordRows.length > 0) {
                    const profileId = coordRows[0].id;
                    await prepareCoordinatorProfileDeletion(profileId);
                }
                await deps.db
                    .delete(deps.tables.serenataCoordinatorProfiles)
                    .where(deps.eq(deps.tables.serenataCoordinatorProfiles.userId, userId));
                await deps.db
                    .update(deps.tables.users)
                    .set({ role: 'musician' })
                    .where(deps.eq(deps.tables.users.id, userId));
            }

            if (role === 'client') {
                await deps.db.delete(deps.tables.serenataMusicians).where(deps.eq(deps.tables.serenataMusicians.userId, userId));
                const coordRows = await deps.db
                    .select({ id: deps.tables.serenataCoordinatorProfiles.id })
                    .from(deps.tables.serenataCoordinatorProfiles)
                    .where(deps.eq(deps.tables.serenataCoordinatorProfiles.userId, userId))
                    .limit(1);
                if (coordRows.length > 0) {
                    await prepareCoordinatorProfileDeletion(coordRows[0].id);
                }
                await deps.db
                    .delete(deps.tables.serenataCoordinatorProfiles)
                    .where(deps.eq(deps.tables.serenataCoordinatorProfiles.userId, userId));
                await deps.db
                    .update(deps.tables.users)
                    .set({ role: 'client' })
                    .where(deps.eq(deps.tables.users.id, userId));
            }

            await createAdminAudit({
                actorUserId: adminUser.id,
                action: 'serenatas_role_changed',
                entityType: 'user',
                entityId: userId,
                payload: { role },
            });

            return c.json({ ok: true, role });
        } catch (error) {
            const chain = serializePgErrorChain(error);
            console.error('[admin serenatas-role]', chain, error);
            const isDev = process.env.NODE_ENV !== 'production';
            return c.json(
                {
                    ok: false,
                    error: isDev ? `Error al actualizar rol serenatas: ${chain}` : 'Error al actualizar rol serenatas',
                },
                500
            );
        }
    });

    app.get('/serenatas/payments', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
        if (!deps.tables.serenataPayments || !deps.tables.serenataCoordinatorProfiles || !deps.tables.serenatas) {
            return c.json({ ok: false, error: 'Tablas serenatas no disponibles' }, 500);
        }

        const statusFilter = c.req.query('status');
        const fromDate = c.req.query('from');
        const toDate = c.req.query('to');
        const conditions: any[] = [];
        if (statusFilter && ['pending', 'holding', 'released', 'refunded', 'disputed'].includes(statusFilter)) {
            conditions.push(deps.eq(deps.tables.serenataPayments.status, statusFilter));
        }
        if (fromDate) {
            const date = new Date(fromDate);
            if (!Number.isNaN(date.getTime())) {
                conditions.push(deps.sql`${deps.tables.serenataPayments.createdAt} >= ${date}`);
            }
        }
        if (toDate) {
            const date = new Date(toDate);
            if (!Number.isNaN(date.getTime())) {
                conditions.push(deps.sql`${deps.tables.serenataPayments.createdAt} <= ${date}`);
            }
        }

        const query = deps.db.select({
            id: deps.tables.serenataPayments.id,
            status: deps.tables.serenataPayments.status,
            totalAmount: deps.tables.serenataPayments.totalAmount,
            platformCommission: deps.tables.serenataPayments.platformCommission,
            commissionVat: deps.tables.serenataPayments.commissionVat,
            coordinatorEarnings: deps.tables.serenataPayments.coordinatorEarnings,
            createdAt: deps.tables.serenataPayments.createdAt,
            releasedToCoordinatorAt: deps.tables.serenataPayments.releasedToCoordinatorAt,
            refundedAt: deps.tables.serenataPayments.refundedAt,
            coordinatorProfileId: deps.tables.serenataPayments.coordinatorProfileId,
            coordinatorUserId: deps.tables.serenataCoordinatorProfiles.userId,
            coordinatorName: deps.tables.users.name,
            serenataId: deps.tables.serenataPayments.serenataId,
            clientName: deps.tables.serenatas.clientName,
        })
            .from(deps.tables.serenataPayments)
            .leftJoin(
                deps.tables.serenataCoordinatorProfiles,
                deps.eq(deps.tables.serenataPayments.coordinatorProfileId, deps.tables.serenataCoordinatorProfiles.id)
            )
            .leftJoin(deps.tables.users, deps.eq(deps.tables.serenataCoordinatorProfiles.userId, deps.tables.users.id))
            .leftJoin(deps.tables.serenatas, deps.eq(deps.tables.serenataPayments.serenataId, deps.tables.serenatas.id));
        const rows = await (conditions.length > 0
            ? query.where(deps.and(...conditions)).orderBy(deps.desc(deps.tables.serenataPayments.createdAt))
            : query.orderBy(deps.desc(deps.tables.serenataPayments.createdAt)));

        return c.json({
            ok: true,
            items: rows.map((row: any) => ({
                ...row,
                createdAt: row.createdAt ? row.createdAt.toISOString() : null,
                releasedToCoordinatorAt: row.releasedToCoordinatorAt ? row.releasedToCoordinatorAt.toISOString() : null,
                refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
            })),
        });
    });

    app.patch('/serenatas/payments/:id/status', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
        if (!deps.tables.serenataPayments) return c.json({ ok: false, error: 'Tabla de pagos no disponible' }, 500);

        const paymentId = c.req.param('id') ?? '';
        const payload = await c.req.json().catch(() => null);
        const status = payload?.status;
        if (!status || !['pending', 'holding', 'released', 'refunded', 'disputed'].includes(status)) {
            return c.json({ ok: false, error: 'Estado de pago inválido' }, 400);
        }

        const patch: Record<string, unknown> = {
            status,
            updatedAt: new Date(),
        };
        if (status === 'released') {
            patch.releasedToCoordinatorAt = new Date();
        }
        if (status === 'refunded') {
            patch.refundedAt = new Date();
        }

        const updated = await deps.db.update(deps.tables.serenataPayments)
            .set(patch)
            .where(deps.eq(deps.tables.serenataPayments.id, paymentId))
            .returning({ id: deps.tables.serenataPayments.id, status: deps.tables.serenataPayments.status });

        if (updated.length === 0) return c.json({ ok: false, error: 'Pago no encontrado' }, 404);
        await createAdminAudit({
            actorUserId: adminUser.id,
            action: 'serenatas_payment_status_changed',
            entityType: 'serenata_payment',
            entityId: paymentId,
            payload: { status },
        });
        return c.json({ ok: true, item: updated[0] });
    });

    app.get('/audit-logs', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const entityType = c.req.query('entityType');
        const entityId = c.req.query('entityId');
        const limitRaw = Number(c.req.query('limit') ?? 30);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 30;
        const conditions: any[] = [];
        if (entityType) conditions.push(deps.sql`entity_type = ${entityType}`);
        if (entityId) conditions.push(deps.sql`entity_id = ${entityId}`);

        const rows = await deps.db.execute(
            conditions.length > 0
                ? deps.sql`
                    SELECT id, actor_user_id, action, entity_type, entity_id, payload, created_at
                    FROM admin_audit_logs
                    WHERE ${deps.and(...conditions)}
                    ORDER BY created_at DESC
                    LIMIT ${limit}
                `
                : deps.sql`
                    SELECT id, actor_user_id, action, entity_type, entity_id, payload, created_at
                    FROM admin_audit_logs
                    ORDER BY created_at DESC
                    LIMIT ${limit}
                `
        );

        return c.json({
            ok: true,
            items: (rows as any[]).map((row) => ({
                id: row.id,
                actorUserId: row.actor_user_id,
                action: row.action,
                entityType: row.entity_type,
                entityId: row.entity_id,
                payload: row.payload ?? {},
                createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
            })),
        });
    });

    // ── Listings ──────────────────────────────────────────────────────────────

    app.get('/listings', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const items = await deps.listAdminListingsSnapshot(scopedVertical);
        return c.json({ ok: true, items });
    });

    // ── Service leads ─────────────────────────────────────────────────────────

    app.get('/service-leads', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const vertical = scopedVertical ?? c.req.query('vertical');
        const status = c.req.query('status');
        const items = await listServiceLeadRecords(deps, {
            vertical: vertical === 'autos' || vertical === 'propiedades' || vertical === 'agenda' || vertical === 'serenatas' ? (vertical as VerticalType) : undefined,
            status: status === 'new' || status === 'contacted' || status === 'qualified' || status === 'closed' ? (status as ServiceLeadStatus) : undefined,
        });
        return c.json({ ok: true, items: items.map((r) => serviceLeadToResponse(deps, r)) });
    });

    app.get('/service-leads/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        return c.json({ ok: true, ...(await buildServiceLeadDetailPayload(deps, lead)) });
    });

    app.patch('/service-leads/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = serviceLeadUpdateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        const result = await updateServiceLeadRecord(deps, { actor: adminUser, lead, changes: parsed.data });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({ ok: true, item: serviceLeadToResponse(deps, result.item) });
    });

    app.post('/service-leads/:id/notes', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = serviceLeadNoteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        await deps.db.update(deps.tables.serviceLeads).set({ updatedAt: new Date() })
            .where(deps.eq(deps.tables.serviceLeads.id, lead.id));

        const activity = await createServiceLeadActivity(deps, {
            leadId: lead.id,
            actorUserId: adminUser.id,
            type: 'note',
            body: parsed.data.body.trim(),
        });
        const refreshed = await getServiceLeadById(deps, lead.id);
        return c.json({
            ok: true,
            item: serviceLeadToResponse(deps, refreshed ?? lead),
            activity: serviceLeadActivityToResponse(deps, activity),
        }, 201);
    });

    app.post('/service-leads/:id/actions', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = leadQuickActionSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        const result = await runServiceLeadQuickAction(deps, { actor: adminUser, lead, action: parsed.data.action });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({
            ok: true,
            item: serviceLeadToResponse(deps, result.item),
            activity: serviceLeadActivityToResponse(deps, result.activity),
            actionLabel: getLeadQuickActionLabel(parsed.data.action),
        }, 201);
    });

    // ── Listing leads ─────────────────────────────────────────────────────────

    app.get('/listing-leads', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const vertical = scopedVertical ?? c.req.query('vertical');
        const status = c.req.query('status');
        const items = await listListingLeadRecords(deps, {
            vertical: vertical === 'autos' || vertical === 'propiedades' || vertical === 'agenda' || vertical === 'serenatas' ? (vertical as VerticalType) : undefined,
            status: status === 'new' || status === 'contacted' || status === 'qualified' || status === 'closed' ? (status as ListingLeadStatus) : undefined,
        });
        return c.json({ ok: true, items: items.map((item) => listingLeadToResponse(deps, item)) });
    });

    app.get('/listing-leads/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        return c.json({ ok: true, ...(await buildListingLeadDetailPayload(deps, lead, adminUser.id)) });
    });

    app.patch('/listing-leads/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = listingLeadUpdateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        const result = await updateListingLeadRecord(deps, { actor: adminUser, lead, changes: parsed.data });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({ ok: true, item: listingLeadToResponse(deps, result.item) });
    });

    app.post('/listing-leads/:id/notes', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = listingLeadNoteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        await deps.db.update(deps.tables.listingLeads).set({ updatedAt: new Date() })
            .where(deps.eq(deps.tables.listingLeads.id, lead.id));

        const activity = await createListingLeadActivity(deps, {
            leadId: lead.id,
            actorUserId: adminUser.id,
            type: 'note',
            body: parsed.data.body.trim(),
        });
        const refreshed = await getListingLeadById(deps, lead.id);
        return c.json({
            ok: true,
            item: listingLeadToResponse(deps, refreshed ?? lead),
            activity: listingLeadActivityToResponse(deps, activity),
        }, 201);
    });

    app.post('/listing-leads/:id/actions', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = leadQuickActionSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        const result = await runListingLeadQuickAction(deps, { actor: adminUser, lead, action: parsed.data.action });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({
            ok: true,
            item: listingLeadToResponse(deps, result.item),
            activity: listingLeadActivityToResponse(deps, result.activity),
            actionLabel: getLeadQuickActionLabel(parsed.data.action),
        }, 201);
    });

    // ── Subscriptions (superadmin) ────────────────────────────────────────────

    app.post('/subscriptions/set-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin' }, 403);

        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const { userId, vertical, planId, expiresAt } = body as { userId?: string; vertical?: string; planId?: string; expiresAt?: string | null };

        if (!userId || !vertical || !planId) return c.json({ ok: false, error: 'userId, vertical y planId son requeridos' }, 400);
        const v = deps.parseVertical(vertical);
        if (!['autos', 'propiedades'].includes(v)) return c.json({ ok: false, error: 'Vertical debe ser autos o propiedades' }, 400);

        if (planId === 'free') {
            const current = deps.activeSubscriptionsByUser.get(userId) ?? [];
            const updated = current.map((item: any) => {
                if (item.vertical !== v || item.status !== 'active') return item;
                return { ...item, status: 'cancelled' as const, updatedAt: Date.now() };
            });
            deps.activeSubscriptionsByUser.set(userId, updated);
            return c.json({ ok: true, planId: 'free' });
        }

        const plan = deps.getPaidSubscriptionPlan(v, planId);
        if (!plan) return c.json({ ok: false, error: 'Plan no encontrado' }, 400);

        const expiry = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 365 * 24 * 60 * 60 * 1000;
        const sub = {
            id: deps.makeSubscriptionId(v, planId),
            userId,
            vertical: v,
            planId,
            planName: plan.name,
            priceMonthly: plan.priceMonthly,
            currency: 'CLP',
            features: plan.features,
            status: 'active',
            providerPreapprovalId: `admin-manual-${admin.id}`,
            providerStatus: 'manual',
            startedAt: Date.now(),
            updatedAt: Date.now(),
        };
        deps.upsertActiveSubscription(sub);
        return c.json({ ok: true, planId, expiresAt: new Date(expiry).toISOString() });
    });

    app.delete('/subscriptions/cancel-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin' }, 403);

        const body = await c.req.json().catch(() => ({})) as { userId?: string; vertical?: string };
        if (!body.userId || !body.vertical) return c.json({ ok: false, error: 'userId y vertical son requeridos' }, 400);
        const v = deps.parseVertical(body.vertical);

        const current = deps.activeSubscriptionsByUser.get(body.userId) ?? [];
        const updated = current.map((item: any) => {
            if (item.vertical !== v || item.status !== 'active') return item;
            return { ...item, status: 'cancelled' as const, updatedAt: Date.now() };
        });
        deps.activeSubscriptionsByUser.set(body.userId, updated);
        return c.json({ ok: true });
    });

    // ── SimpleAgenda (superadmin) ─────────────────────────────────────────────

    app.get('/agenda/subscriptions', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

        const profiles = await deps.db.select({
            id: deps.tables.agendaProfessionalProfiles.id,
            userId: deps.tables.agendaProfessionalProfiles.userId,
            displayName: deps.tables.agendaProfessionalProfiles.displayName,
            slug: deps.tables.agendaProfessionalProfiles.slug,
            plan: deps.tables.agendaProfessionalProfiles.plan,
            planExpiresAt: deps.tables.agendaProfessionalProfiles.planExpiresAt,
            isPublished: deps.tables.agendaProfessionalProfiles.isPublished,
            createdAt: deps.tables.agendaProfessionalProfiles.createdAt,
        }).from(deps.tables.agendaProfessionalProfiles).orderBy(deps.desc(deps.tables.agendaProfessionalProfiles.createdAt));

        const allUsers = await deps.listAdminUsersSnapshot(null);
        const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

        const result = profiles.map((p: any) => {
            const u = userMap.get(p.userId) as any;
            const expired = p.plan === 'pro' && p.planExpiresAt && p.planExpiresAt < new Date();
            return {
                profileId: p.id,
                userId: p.userId,
                userName: u?.name ?? 'Sin nombre',
                userEmail: u?.email ?? '',
                displayName: p.displayName ?? '',
                slug: p.slug,
                plan: p.plan,
                planExpiresAt: p.planExpiresAt ? p.planExpiresAt.toISOString() : null,
                isPublished: p.isPublished,
                status: p.plan === 'pro' && !expired ? 'active' : expired ? 'expired' : 'free',
                createdAt: p.createdAt.toISOString(),
            };
        });

        return c.json({ ok: true, subscriptions: result });
    });

    app.post('/agenda/set-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const { profileId, plan, expiresAt, notes } = body as { profileId?: string; plan?: string; expiresAt?: string | null; notes?: string };

        if (!profileId || !plan) return c.json({ ok: false, error: 'Se requiere profileId y plan' }, 400);
        if (!['free', 'pro'].includes(plan)) return c.json({ ok: false, error: 'Plan debe ser free o pro' }, 400);

        const profiles = await deps.db.select().from(deps.tables.agendaProfessionalProfiles)
            .where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profileId)).limit(1);
        if (!profiles[0]) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

        const expiry = plan === 'pro' && expiresAt ? new Date(expiresAt) : null;

        await deps.db.update(deps.tables.agendaProfessionalProfiles).set({
            plan,
            planExpiresAt: expiry,
            updatedAt: new Date(),
        }).where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profileId));

        return c.json({ ok: true, plan, expiresAt: expiry?.toISOString() ?? null });
    });

    app.delete('/agenda/cancel-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

        const body = await c.req.json().catch(() => ({})) as { profileId?: string };
        if (!body.profileId) return c.json({ ok: false, error: 'Se requiere profileId' }, 400);

        await deps.db.update(deps.tables.agendaProfessionalProfiles).set({
            plan: 'free',
            planExpiresAt: null,
            updatedAt: new Date(),
        }).where(deps.eq(deps.tables.agendaProfessionalProfiles.id, body.profileId));

        return c.json({ ok: true });
    });

    return app;
}
