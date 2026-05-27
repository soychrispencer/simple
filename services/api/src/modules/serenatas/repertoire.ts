import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    serenataClients,
    serenataGroupServices,
    serenataMusicians,
    serenataProviderGroupMembers,
    serenataProviderGroups,
    serenataRepertoireSongs,
    serenataServiceSongs,
    serenataSongScores,
    serenataSongSelections,
    serenatas,
} from '../../db/schema.js';
import type { MarketplaceDeps } from './marketplace.js';
import {
    backfillRepertoireCatalogLinks,
    bulkLinkCatalogToRepertoire,
    findOrCreateCatalogSong,
    linkCatalogToProviderRepertoire,
    mapCatalogSong,
    searchSongCatalog,
} from './song-catalog.js';

const emptyStringToNull = z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
}, z.string().nullable().optional());

const repertoireSongWriteBaseSchema = z.object({
    catalogSongId: z.string().uuid().optional(),
    title: z.string().min(1).max(200).optional(),
    artist: emptyStringToNull,
    tags: z.array(z.string().min(1).max(40)).max(12).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    notes: emptyStringToNull,
});

export const repertoireSongWriteSchema = repertoireSongWriteBaseSchema.refine(
    (data) => Boolean(data.catalogSongId) || Boolean(data.title?.trim()),
    { message: 'Indica catalogSongId o título.' },
);

export const bulkRepertoireSchema = z.object({
    catalogSongIds: z.array(z.string().uuid()).min(1).max(80),
});

export const catalogSongWriteSchema = z.object({
    title: z.string().min(1).max(200),
    artist: emptyStringToNull,
    tags: z.array(z.string().min(1).max(40)).max(12).optional(),
});

export const repertoireSongPatchSchema = repertoireSongWriteBaseSchema.partial();

export const clientSongSelectionSchema = z.object({
    repertoireSongId: z.string().uuid(),
    clientNote: emptyStringToNull,
});

export const confirmSetlistSchema = z.object({
    songs: z.array(z.object({
        repertoireSongId: z.string().uuid(),
        sortOrder: z.number().int().min(0).optional(),
    })).min(0).max(50),
});

export type RepertoireDeps = MarketplaceDeps;

function normalizeTags(tags: string[] | undefined) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of tags ?? []) {
        const tag = raw.trim();
        if (!tag) continue;
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(tag);
    }
    return out;
}

export function mapRepertoireSong(row: typeof serenataRepertoireSongs.$inferSelect) {
    return {
        id: row.id,
        providerGroupId: row.providerGroupId,
        catalogSongId: row.catalogSongId,
        title: row.title,
        artist: row.artist,
        tags: row.tags ?? [],
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function mapSongSelection(row: typeof serenataSongSelections.$inferSelect) {
    return {
        id: row.id,
        serenataId: row.serenataId,
        repertoireSongId: row.repertoireSongId,
        kind: row.kind as 'client_preference' | 'setlist',
        title: row.title,
        artist: row.artist,
        sortOrder: row.sortOrder,
        clientNote: row.clientNote,
        createdAt: row.createdAt,
    };
}

export function mapSongScore(row: typeof serenataSongScores.$inferSelect) {
    return {
        id: row.id,
        repertoireSongId: row.repertoireSongId,
        instrument: row.instrument,
        format: row.format,
        storageUrl: row.storageUrl,
        originalFilename: row.originalFilename,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function listActiveSongsForService(
    providerGroupId: string,
    service: typeof serenataGroupServices.$inferSelect,
) {
    const baseWhere = and(
        eq(serenataRepertoireSongs.providerGroupId, providerGroupId),
        eq(serenataRepertoireSongs.isActive, true),
    );
    if (service.repertoirePolicy === 'curated_only') {
        const links = await db
            .select({ song: serenataRepertoireSongs })
            .from(serenataServiceSongs)
            .innerJoin(serenataRepertoireSongs, eq(serenataRepertoireSongs.id, serenataServiceSongs.repertoireSongId))
            .where(and(eq(serenataServiceSongs.serviceId, service.id), baseWhere))
            .orderBy(asc(serenataRepertoireSongs.sortOrder), asc(serenataRepertoireSongs.title));
        return links.map((row) => mapRepertoireSong(row.song));
    }
    const rows = await db
        .select()
        .from(serenataRepertoireSongs)
        .where(baseWhere)
        .orderBy(asc(serenataRepertoireSongs.sortOrder), asc(serenataRepertoireSongs.title));
    return rows.map(mapRepertoireSong);
}

function validateSongIdsInServiceRepertoire(
    providerGroupId: string,
    service: typeof serenataGroupServices.$inferSelect,
    selections: z.infer<typeof clientSongSelectionSchema>[],
    limit: number,
    limitError: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    if (selections.length > limit) {
        return Promise.resolve({ ok: false, error: limitError });
    }
    const ids = selections.map((item) => item.repertoireSongId);
    if (new Set(ids).size !== ids.length) {
        return Promise.resolve({ ok: false, error: 'No repitas la misma canción.' });
    }
    return listActiveSongsForService(providerGroupId, service).then((allowed) => {
        const allowedIds = new Set(allowed.map((song) => song.id));
        for (const id of ids) {
            if (!allowedIds.has(id)) {
                return { ok: false, error: 'Una o más canciones no pertenecen al repertorio de este servicio.' };
            }
        }
        return { ok: true };
    });
}

export async function validateClientSongSelections(
    providerGroupId: string,
    service: typeof serenataGroupServices.$inferSelect,
    selections: z.infer<typeof clientSongSelectionSchema>[],
): Promise<{ ok: true } | { ok: false; error: string }> {
    const limit = service.songsIncluded ?? 0;
    if (limit <= 0) {
        if (selections.length > 0) {
            return { ok: false, error: 'Este servicio no incluye elección de canciones.' };
        }
        return { ok: true };
    }
    return validateSongIdsInServiceRepertoire(
        providerGroupId,
        service,
        selections,
        limit,
        `Puedes elegir hasta ${limit} canción${limit === 1 ? '' : 'es'} del repertorio.`,
    );
}

/** Serenatas propias del dueño: permite registrar pedidos aunque el servicio no tenga cupo marketplace. */
export async function validateOwnerSongSelections(
    providerGroupId: string,
    service: typeof serenataGroupServices.$inferSelect,
    selections: z.infer<typeof clientSongSelectionSchema>[],
): Promise<{ ok: true } | { ok: false; error: string }> {
    if (selections.length === 0) return { ok: true };
    const configured = service.songsIncluded ?? 0;
    const limit = configured > 0 ? configured : 12;
    return validateSongIdsInServiceRepertoire(
        providerGroupId,
        service,
        selections,
        limit,
        `Puedes registrar hasta ${limit} canción${limit === 1 ? '' : 'es'} pedidas.`,
    );
}

export async function syncOwnerSerenataSongSelections(
    serenataId: string,
    providerGroupId: string,
    service: typeof serenataGroupServices.$inferSelect,
    selections: z.infer<typeof clientSongSelectionSchema>[],
): Promise<{ ok: true } | { ok: false; error: string }> {
    const validation = await validateOwnerSongSelections(providerGroupId, service, selections);
    if (!validation.ok) return validation;

    await applyClientSongSelectionsWithAutoSetlist(serenataId, providerGroupId, service, selections);
    return { ok: true };
}

export async function insertClientSongSelections(
    serenataId: string,
    providerGroupId: string,
    service: typeof serenataGroupServices.$inferSelect,
    selections: z.infer<typeof clientSongSelectionSchema>[],
) {
    if (selections.length === 0) return;
    const songs = await db
        .select()
        .from(serenataRepertoireSongs)
        .where(and(
            eq(serenataRepertoireSongs.providerGroupId, providerGroupId),
            inArray(serenataRepertoireSongs.id, selections.map((s) => s.repertoireSongId)),
        ));
    const byId = new Map(songs.map((song) => [song.id, song]));
    await db.insert(serenataSongSelections).values(
        selections.map((selection, index) => {
            const song = byId.get(selection.repertoireSongId)!;
            return {
                serenataId,
                repertoireSongId: song.id,
                kind: 'client_preference',
                title: song.title,
                artist: song.artist,
                sortOrder: index,
                clientNote: selection.clientNote ?? null,
            };
        }),
    );
}

/** Copia preferencias del cliente al setlist confirmado (repertorio ya validado al contratar). */
export async function mirrorClientPreferencesToSetlist(serenataId: string) {
    const prefs = await db
        .select()
        .from(serenataSongSelections)
        .where(and(
            eq(serenataSongSelections.serenataId, serenataId),
            eq(serenataSongSelections.kind, 'client_preference'),
        ))
        .orderBy(asc(serenataSongSelections.sortOrder));

    await db.delete(serenataSongSelections).where(and(
        eq(serenataSongSelections.serenataId, serenataId),
        eq(serenataSongSelections.kind, 'setlist'),
    ));

    if (prefs.length > 0) {
        await db.insert(serenataSongSelections).values(
            prefs.map((row, index) => ({
                serenataId,
                repertoireSongId: row.repertoireSongId,
                kind: 'setlist' as const,
                title: row.title,
                artist: row.artist,
                sortOrder: index,
                clientNote: null,
            })),
        );
    }
}

export async function markSerenataSetlistConfirmed(
    serenataId: string,
    songsIncludedAtBooking: number,
) {
    await db.update(serenatas).set({
        setlistStatus: 'confirmed',
        songsIncludedAtBooking,
        setlistConfirmedAt: new Date(),
        updatedAt: new Date(),
    }).where(eq(serenatas.id, serenataId));
}

/** Marketplace / reserva: guarda pedido del cliente y deja setlist listo sin paso manual del dueño. */
export async function applyClientSongSelectionsWithAutoSetlist(
    serenataId: string,
    providerGroupId: string,
    service: typeof serenataGroupServices.$inferSelect,
    selections: z.infer<typeof clientSongSelectionSchema>[],
) {
    await db.delete(serenataSongSelections).where(eq(serenataSongSelections.serenataId, serenataId));
    await insertClientSongSelections(serenataId, providerGroupId, service, selections);
    await mirrorClientPreferencesToSetlist(serenataId);
    const songsIncludedAtBooking = Math.max(service.songsIncluded ?? 0, selections.length);
    await markSerenataSetlistConfirmed(serenataId, songsIncludedAtBooking);
}

export function canOwnerEditSerenataSetlist(status: typeof serenatas.$inferSelect['status']): boolean {
    return status === 'scheduled' || status === 'completed';
}

export async function loadSerenataSongs(serenataId: string) {
    const rows = await db
        .select()
        .from(serenataSongSelections)
        .where(eq(serenataSongSelections.serenataId, serenataId))
        .orderBy(asc(serenataSongSelections.sortOrder), asc(serenataSongSelections.title));
    return rows.map(mapSongSelection);
}

async function requireProviderGroupAccess(
    c: Context,
    userId: string,
    groupId: string,
    deps: RepertoireDeps,
) {
    const required = await deps.requireOwner(c, userId);
    if (!required.ok) return required;
    const group = await db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.id, groupId),
    });
    if (!group) {
        return { ok: false as const, response: deps.jsonError(c, 'Grupo no encontrado', 404) };
    }
    const isOwnerUser = group.ownerUserId === userId;
    const isLinkedOwnerProfile = group.ownerId === required.owner.id;
    if (!isOwnerUser && !isLinkedOwnerProfile) {
        return { ok: false as const, response: deps.jsonError(c, 'No autorizado', 403) };
    }
    return { ok: true as const, group, owner: required.owner };
}

async function getMusicianForUser(userId: string) {
    return db.query.serenataMusicians.findFirst({
        where: eq(serenataMusicians.userId, userId),
    });
}

async function canAccessSerenataMusicianOps(userId: string, serenata: typeof serenatas.$inferSelect) {
    if (!serenata.providerGroupId) return false;
    const musician = await getMusicianForUser(userId);
    if (!musician) return false;
    const membership = await db.query.serenataProviderGroupMembers.findFirst({
        where: and(
            eq(serenataProviderGroupMembers.providerGroupId, serenata.providerGroupId),
            eq(serenataProviderGroupMembers.musicianId, musician.id),
            eq(serenataProviderGroupMembers.status, 'active'),
        ),
    });
    return Boolean(membership);
}

async function canAccessSerenataOwnerOps(userId: string, serenata: typeof serenatas.$inferSelect) {
    if (!serenata.providerGroupId) return false;
    const group = await db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.id, serenata.providerGroupId),
    });
    if (!group) return false;
    return group.ownerUserId === userId;
}

export async function listPublicRepertoireForSlug(slug: string, query: { tag?: string; q?: string }) {
    const group = await db.query.serenataProviderGroups.findFirst({
        where: and(
            eq(serenataProviderGroups.slug, slug),
            eq(serenataProviderGroups.status, 'active'),
        ),
    });
    if (!group) return null;
    await backfillRepertoireCatalogLinks(group.id);
    const rows = await db
        .select()
        .from(serenataRepertoireSongs)
        .where(and(
            eq(serenataRepertoireSongs.providerGroupId, group.id),
            eq(serenataRepertoireSongs.isActive, true),
        ))
        .orderBy(asc(serenataRepertoireSongs.sortOrder), asc(serenataRepertoireSongs.title));
    const tagFilter = query.tag?.trim().toLowerCase();
    const q = query.q?.trim().toLowerCase();
    const songs = rows
        .map(mapRepertoireSong)
        .filter((song) => {
            if (tagFilter && !song.tags.some((tag) => tag.toLowerCase() === tagFilter)) return false;
            if (q) {
                const hay = `${song.title} ${song.artist ?? ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    const tagSet = new Set<string>();
    for (const song of rows) {
        for (const tag of song.tags ?? []) tagSet.add(tag);
    }
    return {
        groupId: group.id,
        tags: [...tagSet].sort((a, b) => a.localeCompare(b, 'es')),
        songs,
    };
}

export function registerRepertoireRoutes(app: Hono, deps: RepertoireDeps) {
    app.get('/song-catalog', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const q = c.req.query('q') ?? '';
        const limit = Math.min(40, Math.max(1, Number(c.req.query('limit') ?? 20) || 20));
        const items = await searchSongCatalog(q, limit);
        return c.json({ ok: true, items });
    });

    app.post('/song-catalog', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const parsed = catalogSongWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Canción inválida');
        try {
            const row = await findOrCreateCatalogSong({
                title: parsed.data.title,
                artist: parsed.data.artist,
                tags: parsed.data.tags,
                createdByUserId: user.id,
            });
            return c.json({ ok: true, item: mapCatalogSong(row), created: true }, 201);
        } catch {
            return deps.jsonError(c, 'No pudimos guardar la canción.');
        }
    });

    app.get('/marketplace/groups/:slug/repertoire', async (c) => {
        const result = await listPublicRepertoireForSlug(c.req.param('slug'), {
            tag: c.req.query('tag'),
            q: c.req.query('q'),
        });
        if (!result) return deps.jsonError(c, 'Grupo no encontrado', 404);
        return c.json({ ok: true, tags: result.tags, items: result.songs });
    });

    app.get('/provider-groups/:groupId/services/:serviceId/curated-songs', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const serviceId = c.req.param('serviceId');
        const rows = await db
            .select({ repertoireSongId: serenataServiceSongs.repertoireSongId })
            .from(serenataServiceSongs)
            .where(eq(serenataServiceSongs.serviceId, serviceId));
        return c.json({ ok: true, items: rows.map((row) => row.repertoireSongId) });
    });

    app.get('/provider-groups/:id/repertoire', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        await backfillRepertoireCatalogLinks(access.group.id);
        const rows = await db
            .select()
            .from(serenataRepertoireSongs)
            .where(eq(serenataRepertoireSongs.providerGroupId, access.group.id))
            .orderBy(asc(serenataRepertoireSongs.sortOrder), asc(serenataRepertoireSongs.title));
        return c.json({ ok: true, items: rows.map(mapRepertoireSong) });
    });

    app.post('/provider-groups/:id/repertoire/bulk', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const parsed = bulkRepertoireSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Selección inválida');
        const { added, skipped } = await bulkLinkCatalogToRepertoire(
            access.group.id,
            parsed.data.catalogSongIds,
        );
        const rows = await db
            .select()
            .from(serenataRepertoireSongs)
            .where(eq(serenataRepertoireSongs.providerGroupId, access.group.id))
            .orderBy(asc(serenataRepertoireSongs.sortOrder), asc(serenataRepertoireSongs.title));
        return c.json({
            ok: true,
            added: added.map(mapRepertoireSong),
            skipped,
            items: rows.map(mapRepertoireSong),
        });
    });

    app.post('/provider-groups/:id/repertoire', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const parsed = repertoireSongWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Canción inválida');
        if (parsed.data.catalogSongId) {
            const linked = await linkCatalogToProviderRepertoire(
                access.group.id,
                parsed.data.catalogSongId,
                { notes: parsed.data.notes ?? null },
            );
            if (!linked.ok) return deps.jsonError(c, linked.error, 404);
            return c.json({ ok: true, item: mapRepertoireSong(linked.item) }, linked.created ? 201 : 200);
        }
        const catalog = await findOrCreateCatalogSong({
            title: parsed.data.title!.trim(),
            artist: parsed.data.artist,
            tags: parsed.data.tags,
            createdByUserId: user.id,
        });
        const linked = await linkCatalogToProviderRepertoire(access.group.id, catalog.id, {
            notes: parsed.data.notes ?? null,
        });
        if (!linked.ok) return deps.jsonError(c, linked.error);
        if (parsed.data.sortOrder !== undefined || parsed.data.isActive !== undefined) {
            const [item] = await db.update(serenataRepertoireSongs).set({
                ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
                ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
                updatedAt: new Date(),
            }).where(eq(serenataRepertoireSongs.id, linked.item.id)).returning();
            return c.json({ ok: true, item: mapRepertoireSong(item) }, linked.created ? 201 : 200);
        }
        return c.json({ ok: true, item: mapRepertoireSong(linked.item) }, linked.created ? 201 : 200);
    });

    app.patch('/provider-groups/:groupId/repertoire/:songId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const parsed = repertoireSongPatchSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Canción inválida');
        const songId = c.req.param('songId');
        const existing = await db.query.serenataRepertoireSongs.findFirst({
            where: and(
                eq(serenataRepertoireSongs.id, songId),
                eq(serenataRepertoireSongs.providerGroupId, access.group.id),
            ),
        });
        if (!existing) return deps.jsonError(c, 'Canción no encontrada', 404);
        const patch = parsed.data;
        const [item] = await db.update(serenataRepertoireSongs).set({
            ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
            ...(patch.artist !== undefined ? { artist: patch.artist } : {}),
            ...(patch.tags !== undefined ? { tags: normalizeTags(patch.tags) } : {}),
            ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
            ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            updatedAt: new Date(),
        }).where(eq(serenataRepertoireSongs.id, songId)).returning();
        return c.json({ ok: true, item: mapRepertoireSong(item) });
    });

    app.delete('/provider-groups/:groupId/repertoire/:songId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const songId = c.req.param('songId');
        await db.delete(serenataRepertoireSongs).where(and(
            eq(serenataRepertoireSongs.id, songId),
            eq(serenataRepertoireSongs.providerGroupId, access.group.id),
        ));
        return c.json({ ok: true });
    });

    app.put('/provider-groups/:groupId/repertoire/:songId/scores/:instrument', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const songId = c.req.param('songId');
        const instrument = c.req.param('instrument').trim();
        if (!instrument) return deps.jsonError(c, 'Indica el instrumento.');
        const song = await db.query.serenataRepertoireSongs.findFirst({
            where: and(
                eq(serenataRepertoireSongs.id, songId),
                eq(serenataRepertoireSongs.providerGroupId, access.group.id),
            ),
        });
        if (!song) return deps.jsonError(c, 'Canción no encontrada', 404);
        const body = await c.req.json().catch(() => null) as { storageUrl?: string; originalFilename?: string } | null;
        const storageUrl = body?.storageUrl?.trim();
        if (!storageUrl) return deps.jsonError(c, 'Falta la URL del archivo.');
        const existing = await db.query.serenataSongScores.findFirst({
            where: and(
                eq(serenataSongScores.repertoireSongId, songId),
                eq(serenataSongScores.instrument, instrument),
            ),
        });
        const values = {
            repertoireSongId: songId,
            instrument,
            format: 'pdf',
            storageUrl,
            originalFilename: body?.originalFilename?.trim() || null,
            updatedAt: new Date(),
        };
        const [item] = existing
            ? await db.update(serenataSongScores).set(values).where(eq(serenataSongScores.id, existing.id)).returning()
            : await db.insert(serenataSongScores).values(values).returning();
        return c.json({ ok: true, item: mapSongScore(item) });
    });

    app.get('/provider-groups/:groupId/repertoire/:songId/scores', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const songId = c.req.param('songId');
        const rows = await db
            .select()
            .from(serenataSongScores)
            .where(eq(serenataSongScores.repertoireSongId, songId))
            .orderBy(asc(serenataSongScores.instrument));
        return c.json({ ok: true, items: rows.map(mapSongScore) });
    });

    app.get('/serenatas/:id/songs', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const serenata = await db.query.serenatas.findFirst({
            where: eq(serenatas.id, c.req.param('id')),
        });
        if (!serenata) return deps.jsonError(c, 'Serenata no encontrada', 404);
        const ownerOk = await canAccessSerenataOwnerOps(user.id, serenata);
        const musicianOk = await canAccessSerenataMusicianOps(user.id, serenata);
        const client = serenata.clientId
            ? await db.query.serenataClients.findFirst({ where: eq(serenataClients.id, serenata.clientId) })
            : null;
        const clientOk = client?.userId === user.id;
        if (!ownerOk && !musicianOk && !clientOk) {
            return deps.jsonError(c, 'No autorizado', 403);
        }
        const items = await loadSerenataSongs(serenata.id);
        return c.json({
            ok: true,
            setlistStatus: serenata.setlistStatus,
            songsIncludedAtBooking: serenata.songsIncludedAtBooking,
            setlistConfirmedAt: serenata.setlistConfirmedAt,
            items,
        });
    });

    app.post('/serenatas/:id/setlist/confirm', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const serenata = await db.query.serenatas.findFirst({
            where: eq(serenatas.id, c.req.param('id')),
        });
        if (!serenata) return deps.jsonError(c, 'Serenata no encontrada', 404);
        if (!(await canAccessSerenataOwnerOps(user.id, serenata))) {
            return deps.jsonError(c, 'No autorizado', 403);
        }
        if (!canOwnerEditSerenataSetlist(serenata.status)) {
            return deps.jsonError(
                c,
                'Solo puedes editar el repertorio cuando la serenata está confirmada en la agenda.',
                409,
            );
        }
        const parsed = confirmSetlistSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Setlist inválido');
        if (!serenata.providerGroupId) return deps.jsonError(c, 'Serenata sin grupo.');
        const allowed = await db
            .select()
            .from(serenataRepertoireSongs)
            .where(and(
                eq(serenataRepertoireSongs.providerGroupId, serenata.providerGroupId),
                eq(serenataRepertoireSongs.isActive, true),
                inArray(serenataRepertoireSongs.id, parsed.data.songs.map((s) => s.repertoireSongId)),
            ));
        if (allowed.length !== parsed.data.songs.length) {
            return deps.jsonError(c, 'Una o más canciones no están en el repertorio activo.');
        }
        const clientPrefs = await db
            .select()
            .from(serenataSongSelections)
            .where(and(
                eq(serenataSongSelections.serenataId, serenata.id),
                eq(serenataSongSelections.kind, 'client_preference'),
            ));
        const clientIds = new Set(
            clientPrefs.map((row) => row.repertoireSongId).filter((id): id is string => Boolean(id)),
        );
        for (const id of clientIds) {
            if (!parsed.data.songs.some((song) => song.repertoireSongId === id)) {
                return deps.jsonError(c, 'El setlist confirmado debe incluir las preferencias del cliente.');
            }
        }
        const byId = new Map(allowed.map((song) => [song.id, song]));
        await db.delete(serenataSongSelections).where(and(
            eq(serenataSongSelections.serenataId, serenata.id),
            eq(serenataSongSelections.kind, 'setlist'),
        ));
        if (parsed.data.songs.length > 0) {
            await db.insert(serenataSongSelections).values(
                parsed.data.songs.map((entry, index) => {
                    const song = byId.get(entry.repertoireSongId)!;
                    return {
                        serenataId: serenata.id,
                        repertoireSongId: song.id,
                        kind: 'setlist',
                        title: song.title,
                        artist: song.artist,
                        sortOrder: entry.sortOrder ?? index,
                        clientNote: null,
                    };
                }),
            );
        }
        await db.update(serenatas).set({
            setlistStatus: 'confirmed',
            setlistConfirmedAt: new Date(),
            updatedAt: new Date(),
        }).where(eq(serenatas.id, serenata.id));
        return c.json({ ok: true, items: await loadSerenataSongs(serenata.id) });
    });

    app.get('/serenatas/:serenataId/repertoire/:songId/score', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const serenata = await db.query.serenatas.findFirst({
            where: eq(serenatas.id, c.req.param('serenataId')),
        });
        if (!serenata) return deps.jsonError(c, 'Serenata no encontrada', 404);
        if (!(await canAccessSerenataMusicianOps(user.id, serenata))) {
            return deps.jsonError(c, 'Solo músicos del grupo pueden ver partituras.', 403);
        }
        const instrument = c.req.query('instrument')?.trim();
        if (!instrument) return deps.jsonError(c, 'Indica instrumento.');
        const score = await db.query.serenataSongScores.findFirst({
            where: and(
                eq(serenataSongScores.repertoireSongId, c.req.param('songId')),
                eq(serenataSongScores.instrument, instrument),
            ),
        });
        if (!score) return deps.jsonError(c, 'No hay partitura para ese instrumento.', 404);
        return c.json({ ok: true, item: mapSongScore(score) });
    });
}
