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

function mapServiceRow(row: Record<string, unknown>) {
    return {
        id: String(row.id),
        name: String(row.name),
        description: row.description ? String(row.description) : null,
        imageUrl: row.imageUrl ? String(row.imageUrl) : null,
        category: String(row.category ?? 'other'),
        pricingMode: String(row.pricingMode ?? 'fixed') as 'fixed' | 'quote',
        price: row.price != null ? String(row.price) : null,
        promoPrice: row.promoPrice != null ? String(row.promoPrice) : null,
        currency: String(row.currency ?? 'CLP'),
        durationMinutes: typeof row.durationMinutes === 'number' ? row.durationMinutes : null,
        color: row.color ? String(row.color) : null,
        isOnline: row.isOnline !== false,
        isPresential: row.isPresential !== false,
        isActive: row.isActive !== false,
        position: typeof row.position === 'number' ? row.position : 0,
    };
}

function mapPackRow(row: Record<string, unknown>) {
    return {
        id: String(row.id),
        name: String(row.name),
        description: row.description ? String(row.description) : null,
        imageUrl: row.imageUrl ? String(row.imageUrl) : null,
        sessionsCount: typeof row.sessionsCount === 'number' ? row.sessionsCount : 1,
        price: String(row.price),
        promoPrice: row.promoPrice != null ? String(row.promoPrice) : null,
        currency: String(row.currency ?? 'CLP'),
        appliesTo: String(row.appliesTo ?? 'all') as 'all' | 'services',
        serviceIds: Array.isArray(row.serviceIds) ? row.serviceIds.map(String) : [],
        validityDays: typeof row.validityDays === 'number' ? row.validityDays : null,
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

function validatePromotionDiscountValue(
    discountValue: number | null,
    discountType: 'percent' | 'fixed',
): string | null {
    if (discountValue == null || discountValue <= 0) return 'El descuento debe ser mayor a 0';
    if (discountType === 'percent' && discountValue > 100) return 'El porcentaje no puede superar 100';
    return null;
}

function validatePromoPriceAgainstBase(price: number | null, promoPrice: number | null): string | null {
    if (promoPrice == null) return null;
    if (price == null || price <= 0) return 'Indica un precio normal antes de agregar promo.';
    if (promoPrice >= price) return 'El precio promo debe ser menor al precio normal.';
    return null;
}

function isPromotionActiveNow(row: Record<string, unknown>, now = new Date()) {
    if (row.isActive === false) return false;
    const startsAt = row.startsAt instanceof Date ? row.startsAt : (row.startsAt ? new Date(String(row.startsAt)) : null);
    const endsAt = row.endsAt instanceof Date ? row.endsAt : (row.endsAt ? new Date(String(row.endsAt)) : null);
    if (startsAt && now < startsAt) return false;
    if (endsAt && now > endsAt) return false;
    return true;
}

function mapPromotionRow(row: Record<string, unknown>) {
    return {
        id: String(row.id),
        label: String(row.label),
        description: row.description ? String(row.description) : null,
        discountType: String(row.discountType ?? 'percent') as 'percent' | 'fixed',
        discountValue: String(row.discountValue),
        appliesTo: String(row.appliesTo ?? 'all') as 'all' | 'services',
        serviceIds: Array.isArray(row.serviceIds) ? row.serviceIds.map(String) : [],
        startsAt: row.startsAt instanceof Date ? row.startsAt.toISOString() : (row.startsAt ? String(row.startsAt) : null),
        endsAt: row.endsAt instanceof Date ? row.endsAt.toISOString() : (row.endsAt ? String(row.endsAt) : null),
        isActive: row.isActive !== false,
        position: typeof row.position === 'number' ? row.position : 0,
    };
}

export type OperatorServicesDeps = {
    authUser: (c: Context) => Promise<{ id: string } | null>;
    parseVertical: (v: string | undefined) => Vertical | null;
    db: any;
    dbHelpers: { eq: any; and: any; asc: any; desc: any; ilike: any; or: any; sql: any };
    tables: {
        publicProfiles: any;
        marketplaceOperatorServices: any;
        marketplaceOperatorServicePacks: any;
        marketplaceOperatorServicePromotions: any;
    };
    getPublicProfileRecord: (userId: string, vertical: Vertical) => { id: string } | null;
    ensureMarketplaceDraftProfileForUser?: (user: { id: string; name?: string; email?: string }, vertical: Vertical) => Promise<void>;
};

async function resolveProfileId(deps: OperatorServicesDeps, user: { id: string; name?: string; email?: string }, vertical: Vertical) {
    if (deps.ensureMarketplaceDraftProfileForUser) {
        await deps.ensureMarketplaceDraftProfileForUser(user as { id: string; name: string; email: string }, vertical);
    }
    const profile = deps.getPublicProfileRecord(user.id, vertical);
    return profile?.id ?? null;
}

/** Lead al minuto: si el perfil draft aún no es público, publicarlo al crear el primer ítem de catálogo. */
async function ensureProfilePublishedForCatalog(
    deps: OperatorServicesDeps,
    profileId: string,
) {
    const { db, dbHelpers: { eq }, tables } = deps;
    const [profile] = await db.select().from(tables.publicProfiles)
        .where(eq(tables.publicProfiles.id, profileId))
        .limit(1);
    if (!profile || profile.isPublished) return;
    const displayName = typeof profile.displayName === 'string' && profile.displayName.trim()
        ? profile.displayName.trim()
        : 'Mi tienda';
    await db.update(tables.publicProfiles)
        .set({ isPublished: true, displayName, updatedAt: new Date() })
        .where(eq(tables.publicProfiles.id, profileId));
}

export async function fetchPublishedOperatorCatalog(
    deps: Pick<OperatorServicesDeps, 'db' | 'dbHelpers' | 'tables'>,
    profileId: string,
) {
    const { db, dbHelpers: { eq, and, asc }, tables } = deps;
    const active = eq(tables.marketplaceOperatorServices.isActive, true);
    const [services, packs, promotions] = await Promise.all([
        db.select().from(tables.marketplaceOperatorServices)
            .where(and(eq(tables.marketplaceOperatorServices.publicProfileId, profileId), active))
            .orderBy(asc(tables.marketplaceOperatorServices.position), asc(tables.marketplaceOperatorServices.createdAt)),
        db.select().from(tables.marketplaceOperatorServicePacks)
            .where(and(eq(tables.marketplaceOperatorServicePacks.publicProfileId, profileId), eq(tables.marketplaceOperatorServicePacks.isActive, true)))
            .orderBy(asc(tables.marketplaceOperatorServicePacks.position), asc(tables.marketplaceOperatorServicePacks.createdAt)),
        db.select().from(tables.marketplaceOperatorServicePromotions)
            .where(and(eq(tables.marketplaceOperatorServicePromotions.publicProfileId, profileId), eq(tables.marketplaceOperatorServicePromotions.isActive, true)))
            .orderBy(asc(tables.marketplaceOperatorServicePromotions.position), asc(tables.marketplaceOperatorServicePromotions.createdAt)),
    ]);
    return {
        services: services.map(mapServiceRow),
        packs: packs.map(mapPackRow),
        promotions: promotions.filter(isPromotionActiveNow).map(mapPromotionRow),
    };
}

function buildProfileSearchConditions(
    deps: Pick<OperatorServicesDeps, 'dbHelpers' | 'tables'>,
    input: { vertical: Vertical; q?: string; region?: string; commune?: string },
) {
    const { eq, and, ilike, or } = deps.dbHelpers;
    const { tables } = deps;
    const conditions = [
        eq(tables.publicProfiles.isPublished, true),
        eq(tables.publicProfiles.vertical, input.vertical),
    ];
    if (input.region) conditions.push(ilike(tables.publicProfiles.region, `%${input.region}%`));
    if (input.commune) {
        conditions.push(or(
            ilike(tables.publicProfiles.city, `%${input.commune}%`),
            ilike(tables.publicProfiles.region, `%${input.commune}%`),
        ));
    }
    if (input.q) {
        const pattern = `%${input.q}%`;
        conditions.push(ilike(tables.publicProfiles.displayName, pattern));
    }
    return conditions;
}

export async function searchPublicOperatorCatalog(
    deps: Pick<OperatorServicesDeps, 'db' | 'dbHelpers' | 'tables'>,
    input: { vertical: Vertical; q?: string; category?: string; region?: string; commune?: string; limit?: number },
) {
    const services = await searchPublicOperatorServices(deps, input);
    const { db, dbHelpers: { eq, and, asc, desc, ilike, or }, tables } = deps;
    const limit = Math.min(Math.max(input.limit ?? 48, 1), 100);
    const profileConditions = buildProfileSearchConditions(deps, input);

    const packRows = await db
        .select({ pack: tables.marketplaceOperatorServicePacks, profile: tables.publicProfiles })
        .from(tables.marketplaceOperatorServicePacks)
        .innerJoin(tables.publicProfiles, eq(tables.marketplaceOperatorServicePacks.publicProfileId, tables.publicProfiles.id))
        .where(and(
            eq(tables.marketplaceOperatorServicePacks.vertical, input.vertical),
            eq(tables.marketplaceOperatorServicePacks.isActive, true),
            ...profileConditions,
            ...(input.q ? [or(
                ilike(tables.marketplaceOperatorServicePacks.name, `%${input.q}%`),
                ilike(tables.marketplaceOperatorServicePacks.description, `%${input.q}%`),
            )] : []),
        ))
        .orderBy(asc(tables.marketplaceOperatorServicePacks.position), desc(tables.marketplaceOperatorServicePacks.updatedAt))
        .limit(limit);

    const promotionRows = await db
        .select({ promotion: tables.marketplaceOperatorServicePromotions, profile: tables.publicProfiles })
        .from(tables.marketplaceOperatorServicePromotions)
        .innerJoin(tables.publicProfiles, eq(tables.marketplaceOperatorServicePromotions.publicProfileId, tables.publicProfiles.id))
        .where(and(
            eq(tables.marketplaceOperatorServicePromotions.vertical, input.vertical),
            eq(tables.marketplaceOperatorServicePromotions.isActive, true),
            ...profileConditions,
            ...(input.q ? [or(
                ilike(tables.marketplaceOperatorServicePromotions.label, `%${input.q}%`),
                ilike(tables.marketplaceOperatorServicePromotions.description, `%${input.q}%`),
            )] : []),
        ))
        .orderBy(asc(tables.marketplaceOperatorServicePromotions.position), desc(tables.marketplaceOperatorServicePromotions.updatedAt))
        .limit(limit);

    return {
        services,
        packs: packRows.map(({ pack, profile }: { pack: Record<string, unknown>; profile: Record<string, unknown> }) => ({
            ...mapPackRow(pack),
            provider: mapProvider(profile),
        })),
        promotions: promotionRows
            .filter(({ promotion }: { promotion: Record<string, unknown> }) => isPromotionActiveNow(promotion))
            .map(({ promotion, profile }: { promotion: Record<string, unknown>; profile: Record<string, unknown> }) => ({
                ...mapPromotionRow(promotion),
                provider: mapProvider(profile),
            })),
    };
}

export async function searchPublicOperatorServices(
    deps: Pick<OperatorServicesDeps, 'db' | 'dbHelpers' | 'tables'>,
    input: { vertical: Vertical; q?: string; category?: string; region?: string; commune?: string; limit?: number },
) {
    const { db, dbHelpers: { eq, and, asc, desc, ilike, or, sql }, tables } = deps;
    const limit = Math.min(Math.max(input.limit ?? 48, 1), 100);
    const conditions = [
        eq(tables.marketplaceOperatorServices.vertical, input.vertical),
        eq(tables.marketplaceOperatorServices.isActive, true),
        eq(tables.publicProfiles.isPublished, true),
        eq(tables.publicProfiles.vertical, input.vertical),
    ];
    if (input.category) conditions.push(eq(tables.marketplaceOperatorServices.category, input.category));
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
            ilike(tables.marketplaceOperatorServices.name, pattern),
            ilike(tables.marketplaceOperatorServices.description, pattern),
            ilike(tables.publicProfiles.displayName, pattern),
        ));
    }

    const rows = await db
        .select({
            service: tables.marketplaceOperatorServices,
            profile: tables.publicProfiles,
        })
        .from(tables.marketplaceOperatorServices)
        .innerJoin(tables.publicProfiles, eq(tables.marketplaceOperatorServices.publicProfileId, tables.publicProfiles.id))
        .where(and(...conditions))
        .orderBy(asc(tables.marketplaceOperatorServices.position), desc(tables.marketplaceOperatorServices.updatedAt))
        .limit(limit);

    return rows.map(({ service, profile }: { service: Record<string, unknown>; profile: Record<string, unknown> }) => ({
        ...mapServiceRow(service),
        provider: mapProvider(profile),
    }));
}

export async function getPublicOperatorServiceById(
    deps: Pick<OperatorServicesDeps, 'db' | 'dbHelpers' | 'tables'>,
    input: { vertical: Vertical; id: string },
) {
    const { db, dbHelpers: { eq, and }, tables } = deps;
    const [row] = await db
        .select({
            service: tables.marketplaceOperatorServices,
            profile: tables.publicProfiles,
        })
        .from(tables.marketplaceOperatorServices)
        .innerJoin(tables.publicProfiles, eq(tables.marketplaceOperatorServices.publicProfileId, tables.publicProfiles.id))
        .where(and(
            eq(tables.marketplaceOperatorServices.id, input.id),
            eq(tables.marketplaceOperatorServices.vertical, input.vertical),
            eq(tables.marketplaceOperatorServices.isActive, true),
            eq(tables.publicProfiles.isPublished, true),
            eq(tables.publicProfiles.vertical, input.vertical),
        ))
        .limit(1);
    if (!row) return null;
    return {
        ...mapServiceRow(row.service),
        provider: mapProvider(row.profile),
    };
}

export function mountOperatorServicesRoutes(app: Hono, deps: OperatorServicesDeps) {
    const {
        authUser,
        parseVertical,
        db,
        dbHelpers: { eq, and, asc },
        tables: { marketplaceOperatorServices, marketplaceOperatorServicePacks, marketplaceOperatorServicePromotions },
    } = deps;

    async function requireProfile(c: Context, vertical: Vertical) {
        const user = await authUser(c);
        if (!user) return { error: c.json({ ok: false, error: 'No autenticado' }, 401) };
        const profileId = await resolveProfileId(deps, user, vertical);
        if (!profileId) return { error: c.json({ ok: false, error: 'Perfil no encontrado' }, 404) };
        return { user, profileId };
    }

    app.get('/operator-services', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const rows = await db.select().from(marketplaceOperatorServices)
            .where(eq(marketplaceOperatorServices.publicProfileId, ctx.profileId))
            .orderBy(asc(marketplaceOperatorServices.position), asc(marketplaceOperatorServices.createdAt));
        return c.json({ ok: true, items: rows.map(mapServiceRow) });
    });

    app.post('/operator-services', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = asString(body.name);
        if (!name) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
        const price = asNumber(body.price);
        const promoPrice = asNumber(body.promoPrice);
        const promoError = validatePromoPriceAgainstBase(price, promoPrice);
        if (promoError) return c.json({ ok: false, error: promoError }, 400);
        const isOnline = typeof body.isOnline === 'boolean' ? body.isOnline : true;
        const isPresential = typeof body.isPresential === 'boolean' ? body.isPresential : true;
        if (!isOnline && !isPresential) return c.json({ ok: false, error: 'Selecciona al menos una modalidad.' }, 400);
        const [row] = await db.insert(marketplaceOperatorServices).values({
            publicProfileId: ctx.profileId,
            vertical,
            name,
            description: asString(body.description),
            imageUrl: asString(body.imageUrl),
            category: asString(body.category) ?? 'other',
            pricingMode: body.pricingMode === 'quote' ? 'quote' : 'fixed',
            price,
            promoPrice,
            currency: asString(body.currency) ?? 'CLP',
            durationMinutes: asNumber(body.durationMinutes),
            color: asString(body.color),
            isOnline,
            isPresential,
            isActive: body.isActive !== false,
            position: asNumber(body.position) ?? 0,
        }).returning();
        if (body.isActive !== false) {
            await ensureProfilePublishedForCatalog(deps, ctx.profileId);
        }
        return c.json({ ok: true, item: mapServiceRow(row) });
    });

    app.patch('/operator-services/:id', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['name', 'description', 'imageUrl', 'category', 'pricingMode', 'price', 'promoPrice', 'currency', 'durationMinutes', 'color', 'isOnline', 'isPresential', 'isActive', 'position'] as const) {
            if (!(key in body)) continue;
            if (key === 'pricingMode') patch[key] = body[key] === 'quote' ? 'quote' : 'fixed';
            else if (key === 'price' || key === 'promoPrice') patch[key] = asNumber(body[key]);
            else if (key === 'durationMinutes' || key === 'position') patch[key] = asNumber(body[key]);
            else if (key === 'isActive') patch[key] = body[key] !== false;
            else if (key === 'isOnline' || key === 'isPresential') patch[key] = body[key] === true;
            else patch[key] = asString(body[key]) ?? (body[key] === null ? null : body[key]);
        }
        const [existing] = await db.select().from(marketplaceOperatorServices)
            .where(and(eq(marketplaceOperatorServices.id, id), eq(marketplaceOperatorServices.publicProfileId, ctx.profileId)))
            .limit(1);
        if (!existing) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
        const nextPrice = 'price' in patch ? (patch.price as number | null) : (existing.price != null ? Number(existing.price) : null);
        const nextPromoPrice = 'promoPrice' in patch ? (patch.promoPrice as number | null) : (existing.promoPrice != null ? Number(existing.promoPrice) : null);
        const promoError = validatePromoPriceAgainstBase(nextPrice, nextPromoPrice);
        if (promoError) return c.json({ ok: false, error: promoError }, 400);
        const nextOnline = 'isOnline' in patch ? patch.isOnline === true : existing.isOnline !== false;
        const nextPresential = 'isPresential' in patch ? patch.isPresential === true : existing.isPresential !== false;
        if (!nextOnline && !nextPresential) return c.json({ ok: false, error: 'Selecciona al menos una modalidad.' }, 400);
        if ('imageUrl' in patch) {
            await cleanupReplacedMediaUrl(existing.imageUrl ? String(existing.imageUrl) : null, patch.imageUrl as string | null);
        }
        const [row] = await db.update(marketplaceOperatorServices).set(patch)
            .where(and(eq(marketplaceOperatorServices.id, id), eq(marketplaceOperatorServices.publicProfileId, ctx.profileId)))
            .returning();
        if (!row) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
        return c.json({ ok: true, item: mapServiceRow(row) });
    });

    app.delete('/operator-services/:id', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const id = c.req.param('id') ?? '';
        await db.update(marketplaceOperatorServices).set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(marketplaceOperatorServices.id, id), eq(marketplaceOperatorServices.publicProfileId, ctx.profileId)));
        return c.json({ ok: true });
    });

    app.get('/operator-service-packs', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const rows = await db.select().from(marketplaceOperatorServicePacks)
            .where(eq(marketplaceOperatorServicePacks.publicProfileId, ctx.profileId))
            .orderBy(asc(marketplaceOperatorServicePacks.position), asc(marketplaceOperatorServicePacks.createdAt));
        return c.json({ ok: true, items: rows.map(mapPackRow) });
    });

    app.post('/operator-service-packs', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = asString(body.name);
        const price = asNumber(body.price);
        const promoPrice = asNumber(body.promoPrice);
        if (!name || price == null) return c.json({ ok: false, error: 'Nombre y precio son requeridos' }, 400);
        const packPromoError = validatePromoPriceAgainstBase(price, promoPrice);
        if (packPromoError) return c.json({ ok: false, error: packPromoError }, 400);
        const [row] = await db.insert(marketplaceOperatorServicePacks).values({
            publicProfileId: ctx.profileId,
            vertical,
            name,
            description: asString(body.description),
            imageUrl: asString(body.imageUrl),
            sessionsCount: asNumber(body.sessionsCount) ?? 1,
            price,
            promoPrice,
            currency: asString(body.currency) ?? 'CLP',
            appliesTo: body.appliesTo === 'services' ? 'services' : 'all',
            serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds.map(String) : [],
            validityDays: asNumber(body.validityDays),
            isActive: body.isActive !== false,
            position: asNumber(body.position) ?? 0,
        }).returning();
        return c.json({ ok: true, item: mapPackRow(row) });
    });

    app.patch('/operator-service-packs/:id', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['name', 'description', 'imageUrl', 'sessionsCount', 'price', 'promoPrice', 'currency', 'appliesTo', 'validityDays', 'isActive', 'position'] as const) {
            if (!(key in body)) continue;
            if (key === 'price' || key === 'promoPrice') patch[key] = asNumber(body[key]);
            else if (key === 'sessionsCount' || key === 'validityDays' || key === 'position') patch[key] = asNumber(body[key]);
            else if (key === 'isActive') patch[key] = body[key] !== false;
            else if (key === 'appliesTo') patch[key] = body[key] === 'services' ? 'services' : 'all';
            else patch[key] = asString(body[key]) ?? (body[key] === null ? null : body[key]);
        }
        if ('serviceIds' in body) patch.serviceIds = Array.isArray(body.serviceIds) ? body.serviceIds.map(String) : [];
        const [existingPack] = await db.select().from(marketplaceOperatorServicePacks)
            .where(and(eq(marketplaceOperatorServicePacks.id, id), eq(marketplaceOperatorServicePacks.publicProfileId, ctx.profileId)))
            .limit(1);
        if (!existingPack) return c.json({ ok: false, error: 'Pack no encontrado' }, 404);
        const nextPackPrice = 'price' in patch ? (patch.price as number | null) : Number(existingPack.price);
        const nextPackPromo = 'promoPrice' in patch ? (patch.promoPrice as number | null) : (existingPack.promoPrice != null ? Number(existingPack.promoPrice) : null);
        const packPromoError = validatePromoPriceAgainstBase(nextPackPrice, nextPackPromo);
        if (packPromoError) return c.json({ ok: false, error: packPromoError }, 400);
        if ('imageUrl' in patch) {
            await cleanupReplacedMediaUrl(existingPack.imageUrl ? String(existingPack.imageUrl) : null, patch.imageUrl as string | null);
        }
        const [row] = await db.update(marketplaceOperatorServicePacks).set(patch)
            .where(and(eq(marketplaceOperatorServicePacks.id, id), eq(marketplaceOperatorServicePacks.publicProfileId, ctx.profileId)))
            .returning();
        if (!row) return c.json({ ok: false, error: 'Pack no encontrado' }, 404);
        return c.json({ ok: true, item: mapPackRow(row) });
    });

    app.delete('/operator-service-packs/:id', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const id = c.req.param('id') ?? '';
        await db.update(marketplaceOperatorServicePacks).set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(marketplaceOperatorServicePacks.id, id), eq(marketplaceOperatorServicePacks.publicProfileId, ctx.profileId)));
        return c.json({ ok: true });
    });

    app.get('/operator-service-promotions', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const rows = await db.select().from(marketplaceOperatorServicePromotions)
            .where(eq(marketplaceOperatorServicePromotions.publicProfileId, ctx.profileId))
            .orderBy(asc(marketplaceOperatorServicePromotions.position), asc(marketplaceOperatorServicePromotions.createdAt));
        return c.json({ ok: true, items: rows.map(mapPromotionRow) });
    });

    app.post('/operator-service-promotions', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const label = asString(body.label);
        const discountType = body.discountType === 'fixed' ? 'fixed' : 'percent';
        const discountValue = asNumber(body.discountValue);
        if (!label || discountValue == null) return c.json({ ok: false, error: 'Etiqueta y descuento son requeridos' }, 400);
        const discountError = validatePromotionDiscountValue(discountValue, discountType);
        if (discountError) return c.json({ ok: false, error: discountError }, 400);
        const [row] = await db.insert(marketplaceOperatorServicePromotions).values({
            publicProfileId: ctx.profileId,
            vertical,
            label,
            description: asString(body.description),
            discountType,
            discountValue,
            appliesTo: body.appliesTo === 'services' ? 'services' : 'all',
            serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds.map(String) : [],
            startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
            endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
            isActive: body.isActive !== false,
            position: asNumber(body.position) ?? 0,
        }).returning();
        return c.json({ ok: true, item: mapPromotionRow(row) });
    });

    app.patch('/operator-service-promotions/:id', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const [existing] = await db.select().from(marketplaceOperatorServicePromotions)
            .where(and(eq(marketplaceOperatorServicePromotions.id, id), eq(marketplaceOperatorServicePromotions.publicProfileId, ctx.profileId)));
        if (!existing) return c.json({ ok: false, error: 'Promoción no encontrada' }, 404);
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['label', 'description', 'discountType', 'discountValue', 'appliesTo', 'isActive', 'position'] as const) {
            if (!(key in body)) continue;
            if (key === 'discountValue') patch[key] = asNumber(body[key]);
            else if (key === 'position') patch[key] = asNumber(body[key]);
            else if (key === 'isActive') patch[key] = body[key] !== false;
            else if (key === 'discountType') patch[key] = body[key] === 'fixed' ? 'fixed' : 'percent';
            else if (key === 'appliesTo') patch[key] = body[key] === 'services' ? 'services' : 'all';
            else patch[key] = asString(body[key]) ?? (body[key] === null ? null : body[key]);
        }
        if ('discountValue' in body || 'discountType' in body) {
            const discountType = (patch.discountType ?? existing.discountType ?? 'percent') === 'fixed' ? 'fixed' : 'percent';
            const discountValue = 'discountValue' in patch
                ? asNumber(patch.discountValue)
                : asNumber(existing.discountValue);
            const discountError = validatePromotionDiscountValue(discountValue, discountType);
            if (discountError) return c.json({ ok: false, error: discountError }, 400);
        }
        if ('serviceIds' in body) patch.serviceIds = Array.isArray(body.serviceIds) ? body.serviceIds.map(String) : [];
        if ('startsAt' in body) patch.startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
        if ('endsAt' in body) patch.endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
        const [row] = await db.update(marketplaceOperatorServicePromotions).set(patch)
            .where(and(eq(marketplaceOperatorServicePromotions.id, id), eq(marketplaceOperatorServicePromotions.publicProfileId, ctx.profileId)))
            .returning();
        if (!row) return c.json({ ok: false, error: 'Promoción no encontrada' }, 404);
        return c.json({ ok: true, item: mapPromotionRow(row) });
    });

    app.delete('/operator-service-promotions/:id', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        if (!vertical) return c.json({ ok: false, error: 'Vertical inválida' }, 400);
        const ctx = await requireProfile(c, vertical);
        if ('error' in ctx) return ctx.error;
        const id = c.req.param('id') ?? '';
        await db.update(marketplaceOperatorServicePromotions).set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(marketplaceOperatorServicePromotions.id, id), eq(marketplaceOperatorServicePromotions.publicProfileId, ctx.profileId)));
        return c.json({ ok: true });
    });
}
