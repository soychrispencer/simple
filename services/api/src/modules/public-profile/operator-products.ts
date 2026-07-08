import type { Hono } from 'hono';
import type { Context } from 'hono';
import { cleanupReplacedMediaUrl } from '../media/stored-object.js';

type Vertical = 'autos' | 'propiedades';

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function validatePromoPriceAgainstBase(price: number | null, promoPrice: number | null): string | null {
    if (promoPrice == null) return null;
    if (price == null || price <= 0) return 'Indica un precio normal antes de agregar promo.';
    if (promoPrice >= price) return 'El precio promo debe ser menor al precio normal.';
    return null;
}

function mapProductRow(row: Record<string, unknown>) {
    return {
        id: String(row.id),
        name: String(row.name),
        description: row.description ? String(row.description) : null,
        imageUrl: row.imageUrl ? String(row.imageUrl) : null,
        category: String(row.category ?? 'other'),
        price: String(row.price),
        promoPrice: row.promoPrice != null ? String(row.promoPrice) : null,
        currency: String(row.currency ?? 'CLP'),
        stock: typeof row.stock === 'number' ? row.stock : (row.stock != null ? Number(row.stock) : null),
        sku: row.sku ? String(row.sku) : null,
        isActive: row.isActive !== false,
        position: typeof row.position === 'number' ? row.position : 0,
    };
}

function mapProvider(profile: Record<string, unknown>) {
    return {
        profileId: String(profile.id),
        name: String(profile.displayName),
        slug: String(profile.slug),
        profileHref: `/perfil/${profile.slug}`,
        city: profile.city ? String(profile.city) : null,
        region: profile.region ? String(profile.region) : null,
        coverImageUrl: profile.coverImageUrl ? String(profile.coverImageUrl) : null,
        avatarImageUrl: profile.avatarImageUrl ? String(profile.avatarImageUrl) : null,
    };
}

export type OperatorProductsDeps = {
    authUser: (c: Context) => Promise<{ id: string } | null>;
    parseVertical: (v: string | undefined) => Vertical | null;
    db: any;
    dbHelpers: { eq: any; and: any; asc: any; desc: any; ilike: any; or: any; sql: any };
    tables: {
        publicProfiles: any;
        marketplaceOperatorProducts: any;
    };
    getPublicProfileRecord: (userId: string, vertical: Vertical) => { id: string } | null;
    ensureMarketplaceDraftProfileForUser?: (user: { id: string; name?: string; email?: string }, vertical: Vertical) => Promise<void>;
};

async function resolveProfileId(deps: OperatorProductsDeps, user: { id: string; name?: string; email?: string }, vertical: Vertical) {
    if (deps.ensureMarketplaceDraftProfileForUser) {
        await deps.ensureMarketplaceDraftProfileForUser(user as { id: string; name: string; email: string }, vertical);
    }
    const profile = deps.getPublicProfileRecord(user.id, vertical);
    return profile?.id ?? null;
}

export async function fetchPublishedOperatorProducts(
    deps: Pick<OperatorProductsDeps, 'db' | 'dbHelpers' | 'tables'>,
    profileId: string,
) {
    const { db, dbHelpers: { eq, and, asc }, tables } = deps;
    const rows = await db.select().from(tables.marketplaceOperatorProducts)
        .where(and(
            eq(tables.marketplaceOperatorProducts.publicProfileId, profileId),
            eq(tables.marketplaceOperatorProducts.isActive, true),
        ))
        .orderBy(asc(tables.marketplaceOperatorProducts.position), asc(tables.marketplaceOperatorProducts.createdAt));
    return rows.map(mapProductRow);
}

export async function searchPublicOperatorProducts(
    deps: Pick<OperatorProductsDeps, 'db' | 'dbHelpers' | 'tables'>,
    input: { vertical: Vertical; q?: string; category?: string; region?: string; commune?: string; limit?: number },
) {
    const { db, dbHelpers: { eq, and, asc, desc, ilike, or }, tables } = deps;
    const limit = Math.min(Math.max(input.limit ?? 48, 1), 100);
    const conditions = [
        eq(tables.marketplaceOperatorProducts.vertical, input.vertical),
        eq(tables.marketplaceOperatorProducts.isActive, true),
        eq(tables.publicProfiles.isPublished, true),
        eq(tables.publicProfiles.vertical, input.vertical),
    ];
    if (input.category) conditions.push(eq(tables.marketplaceOperatorProducts.category, input.category));
    if (input.region) conditions.push(ilike(tables.publicProfiles.region, `%${input.region}%`));
    if (input.commune) {
        conditions.push(or(
            ilike(tables.publicProfiles.city, `%${input.commune}%`),
            ilike(tables.publicProfiles.region, `%${input.commune}%`),
        ));
    }
    if (input.q) {
        const pattern = `%${input.q}%`;
        conditions.push(or(
            ilike(tables.marketplaceOperatorProducts.name, pattern),
            ilike(tables.marketplaceOperatorProducts.description, pattern),
            ilike(tables.publicProfiles.displayName, pattern),
        ));
    }

    const rows = await db
        .select({
            product: tables.marketplaceOperatorProducts,
            profile: tables.publicProfiles,
        })
        .from(tables.marketplaceOperatorProducts)
        .innerJoin(tables.publicProfiles, eq(tables.marketplaceOperatorProducts.publicProfileId, tables.publicProfiles.id))
        .where(and(...conditions))
        .orderBy(asc(tables.marketplaceOperatorProducts.position), desc(tables.marketplaceOperatorProducts.updatedAt))
        .limit(limit);

    return rows.map(({ product, profile }: { product: Record<string, unknown>; profile: Record<string, unknown> }) => ({
        ...mapProductRow(product),
        provider: mapProvider(profile),
    }));
}

export function mountOperatorProductsRoutes(app: Hono, deps: OperatorProductsDeps) {
    const {
        authUser,
        parseVertical,
        db,
        dbHelpers: { eq, and, asc },
        tables: { marketplaceOperatorProducts },
    } = deps;

    async function requireProfile(c: Context, vertical: Vertical) {
        const user = await authUser(c);
        if (!user) return { error: c.json({ ok: false, error: 'No autenticado' }, 401) };
        const profileId = await resolveProfileId(deps, user, vertical);
        if (!profileId) return { error: c.json({ ok: false, error: 'Perfil no encontrado' }, 404) };
        return { user, profileId };
    }

    app.get('/operator-products', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const rows = await db.select().from(marketplaceOperatorProducts)
            .where(eq(marketplaceOperatorProducts.publicProfileId, ctx.profileId))
            .orderBy(asc(marketplaceOperatorProducts.position), asc(marketplaceOperatorProducts.createdAt));
        return c.json({ ok: true, items: rows.map(mapProductRow) });
    });

    app.post('/operator-products', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = asString(body.name);
        const price = asNumber(body.price);
        const promoPrice = asNumber(body.promoPrice);
        if (!name) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
        if (price == null || price <= 0) return c.json({ ok: false, error: 'El precio es requerido' }, 400);
        const promoError = validatePromoPriceAgainstBase(price, promoPrice);
        if (promoError) return c.json({ ok: false, error: promoError }, 400);
        const stock = asNumber(body.stock);
        const [row] = await db.insert(marketplaceOperatorProducts).values({
            publicProfileId: ctx.profileId,
            vertical,
            name,
            description: asString(body.description),
            imageUrl: asString(body.imageUrl),
            category: asString(body.category) ?? 'other',
            price,
            promoPrice,
            currency: asString(body.currency) ?? 'CLP',
            stock: stock != null && stock >= 0 ? stock : null,
            sku: asString(body.sku),
            isActive: body.isActive !== false,
            position: asNumber(body.position) ?? 0,
        }).returning();
        return c.json({ ok: true, item: mapProductRow(row) });
    });

    app.patch('/operator-products/:id', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const [existing] = await db.select().from(marketplaceOperatorProducts)
            .where(and(eq(marketplaceOperatorProducts.id, id), eq(marketplaceOperatorProducts.publicProfileId, ctx.profileId)))
            .limit(1);
        if (!existing) return c.json({ ok: false, error: 'Producto no encontrado' }, 404);

        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['name', 'description', 'imageUrl', 'category', 'price', 'promoPrice', 'currency', 'stock', 'sku', 'isActive', 'position'] as const) {
            if (!(key in body)) continue;
            if (key === 'price' || key === 'promoPrice') patch[key] = asNumber(body[key]);
            else if (key === 'stock' || key === 'position') {
                const value = asNumber(body[key]);
                patch[key] = key === 'stock' ? (value != null && value >= 0 ? value : null) : value;
            }
            else if (key === 'isActive') patch[key] = body[key] !== false;
            else patch[key] = asString(body[key]) ?? (body[key] === null ? null : body[key]);
        }

        const nextPrice = 'price' in patch ? (patch.price as number | null) : Number(existing.price);
        const nextPromoPrice = 'promoPrice' in patch ? (patch.promoPrice as number | null) : (existing.promoPrice != null ? Number(existing.promoPrice) : null);
        const promoError = validatePromoPriceAgainstBase(nextPrice, nextPromoPrice);
        if (promoError) return c.json({ ok: false, error: promoError }, 400);
        if ('imageUrl' in patch) {
            await cleanupReplacedMediaUrl(existing.imageUrl ? String(existing.imageUrl) : null, patch.imageUrl as string | null);
        }

        const [row] = await db.update(marketplaceOperatorProducts).set(patch)
            .where(and(eq(marketplaceOperatorProducts.id, id), eq(marketplaceOperatorProducts.publicProfileId, ctx.profileId)))
            .returning();
        if (!row) return c.json({ ok: false, error: 'Producto no encontrado' }, 404);
        return c.json({ ok: true, item: mapProductRow(row) });
    });

    app.delete('/operator-products/:id', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const id = c.req.param('id') ?? '';
        await db.update(marketplaceOperatorProducts).set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(marketplaceOperatorProducts.id, id), eq(marketplaceOperatorProducts.publicProfileId, ctx.profileId)));
        return c.json({ ok: true });
    });
}
