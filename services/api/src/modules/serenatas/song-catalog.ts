import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataRepertoireSongs, serenataSongCatalog } from '../../db/schema.js';

export function normalizeSongTitle(title: string): string {
    return title
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, ' ');
}

export function mapCatalogSong(row: typeof serenataSongCatalog.$inferSelect) {
    return {
        id: row.id,
        title: row.title,
        artist: row.artist,
        tags: row.tags ?? [],
        isPreset: row.isPreset,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function searchSongCatalog(query: string, limit = 20) {
    const q = query.trim();
    if (!q) {
        const presets = await db
            .select()
            .from(serenataSongCatalog)
            .where(eq(serenataSongCatalog.isPreset, true))
            .orderBy(asc(serenataSongCatalog.title))
            .limit(limit);
        return presets.map(mapCatalogSong);
    }
    const pattern = `%${q.replace(/[%_]/g, '')}%`;
    const rows = await db
        .select()
        .from(serenataSongCatalog)
        .where(or(
            ilike(serenataSongCatalog.title, pattern),
            ilike(serenataSongCatalog.artist, pattern),
            ilike(serenataSongCatalog.titleNormalized, `%${normalizeSongTitle(q)}%`),
        ))
        .orderBy(
            sql`CASE WHEN ${serenataSongCatalog.isPreset} THEN 0 ELSE 1 END`,
            asc(serenataSongCatalog.title),
        )
        .limit(limit);
    return rows.map(mapCatalogSong);
}

export async function findCatalogSongByNormalized(title: string) {
    const titleNormalized = normalizeSongTitle(title);
    if (!titleNormalized) return null;
    return db.query.serenataSongCatalog.findFirst({
        where: eq(serenataSongCatalog.titleNormalized, titleNormalized),
    });
}

export async function findOrCreateCatalogSong(input: {
    title: string;
    artist?: string | null;
    tags?: string[];
    createdByUserId?: string | null;
    isPreset?: boolean;
}) {
    const title = input.title.trim();
    if (!title) throw new Error('Título requerido');
    const titleNormalized = normalizeSongTitle(title);
    const existing = await findCatalogSongByNormalized(title);
    if (existing) return existing;

    const tags = normalizeCatalogTags(input.tags);
    const [created] = await db.insert(serenataSongCatalog).values({
        title,
        titleNormalized,
        artist: input.artist?.trim() || null,
        tags,
        isPreset: input.isPreset ?? false,
        createdByUserId: input.createdByUserId ?? null,
    }).returning();
    return created;
}

function normalizeCatalogTags(tags: string[] | undefined) {
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

export async function linkCatalogToProviderRepertoire(
    providerGroupId: string,
    catalogSongId: string,
    options?: { notes?: string | null },
) {
    const catalog = await db.query.serenataSongCatalog.findFirst({
        where: eq(serenataSongCatalog.id, catalogSongId),
    });
    if (!catalog) return { ok: false as const, error: 'Canción no encontrada en el banco.' };

    const existing = await db.query.serenataRepertoireSongs.findFirst({
        where: and(
            eq(serenataRepertoireSongs.providerGroupId, providerGroupId),
            eq(serenataRepertoireSongs.catalogSongId, catalogSongId),
        ),
    });
    if (existing) {
        if (!existing.isActive) {
            const [reactivated] = await db.update(serenataRepertoireSongs).set({
                isActive: true,
                updatedAt: new Date(),
            }).where(eq(serenataRepertoireSongs.id, existing.id)).returning();
            return { ok: true as const, item: reactivated, created: false };
        }
        return { ok: true as const, item: existing, created: false };
    }

    const [item] = await db.insert(serenataRepertoireSongs).values({
        providerGroupId,
        catalogSongId: catalog.id,
        title: catalog.title,
        artist: catalog.artist,
        tags: catalog.tags ?? [],
        isActive: true,
        notes: options?.notes ?? null,
    }).returning();
    return { ok: true as const, item, created: true };
}

export async function bulkLinkCatalogToRepertoire(
    providerGroupId: string,
    catalogSongIds: string[],
) {
    const uniqueIds = [...new Set(catalogSongIds)];
    const added: typeof serenataRepertoireSongs.$inferSelect[] = [];
    let skipped = 0;
    for (const catalogSongId of uniqueIds) {
        const result = await linkCatalogToProviderRepertoire(providerGroupId, catalogSongId);
        if (!result.ok) continue;
        if (result.created) added.push(result.item);
        else skipped += 1;
    }
    return { added, skipped };
}

export async function backfillRepertoireCatalogLinks(providerGroupId: string) {
    const orphans = await db
        .select()
        .from(serenataRepertoireSongs)
        .where(and(
            eq(serenataRepertoireSongs.providerGroupId, providerGroupId),
            isNull(serenataRepertoireSongs.catalogSongId),
        ));
    for (const row of orphans) {
        const catalog = await findOrCreateCatalogSong({
            title: row.title,
            artist: row.artist,
            tags: row.tags ?? [],
        });
        await db.update(serenataRepertoireSongs).set({
            catalogSongId: catalog.id,
            updatedAt: new Date(),
        }).where(eq(serenataRepertoireSongs.id, row.id));
    }
}
