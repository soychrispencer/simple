import { Hono } from 'hono';
import type { Context } from 'hono';

export interface AccountRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    updateProfileSchema: any;
    publicProfileWriteSchema: any;
    db: any;
    tables: {
        users: any;
        publicProfiles: any;
        publicProfileTeamMembers: any;
    };
    dbHelpers: { eq: any; and: any };
    mapUserRowToAppUser: (row: any) => any;
    usersById: Map<string, any>;
    sanitizeUser: (user: any) => any;
    buildAccountPublicProfileResponse: (user: any, vertical: any) => any;
    normalizePublicProfileSlug: (raw: string) => string;
    isValidPublicProfileSlug: (slug: string) => boolean;
    publicProfilesByVerticalSlug: Map<string, any>;
    publicProfileVerticalSlugKey: (vertical: any, slug: string) => string;
    userCanUsePublicProfile: (user: any, vertical: any) => boolean;
    getPublicProfileRecord: (userId: string, vertical: any) => any;
    PUBLIC_PROFILE_DAYS: readonly any[];
    normalizePublicProfileSocialLinks: (links: any) => any;
    normalizePublicProfileTeamSocialLinks: (links: any) => any;
    normalizeExternalUrlInput: (url: any) => any;
    toNullIfEmpty: (v: any) => any;
    upsertPublicProfileCache: (profile: any) => void;
    replacePublicProfileTeamMemberCache: (userId: string, vertical: any, members: any[]) => void;
    mapPublicProfileRow: (row: any) => any;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    randomUUID: () => string;
}

export function createAccountRouter(deps: AccountRouterDeps) {
    const {
        authUser,
        parseVertical,
        updateProfileSchema,
        publicProfileWriteSchema,
        db,
        tables: { users, publicProfiles, publicProfileTeamMembers },
        dbHelpers: { eq, and },
        mapUserRowToAppUser,
        usersById,
        sanitizeUser,
        buildAccountPublicProfileResponse,
        normalizePublicProfileSlug,
        isValidPublicProfileSlug,
        publicProfilesByVerticalSlug,
        publicProfileVerticalSlugKey,
        userCanUsePublicProfile,
        getPublicProfileRecord,
        PUBLIC_PROFILE_DAYS,
        normalizePublicProfileSocialLinks,
        normalizePublicProfileTeamSocialLinks,
        normalizeExternalUrlInput,
        toNullIfEmpty,
        upsertPublicProfileCache,
        replacePublicProfileTeamMemberCache,
        mapPublicProfileRow,
        getPrimaryAccountIdForUser,
        randomUUID,
    } = deps;

    const app = new Hono();

    app.patch('/profile', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = updateProfileSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const normalizedPhone = parsed.data.phone && parsed.data.phone.trim() ? parsed.data.phone.trim() : null;
        const rows = await db
            .update(users)
            .set({
                name: parsed.data.name.trim(),
                phone: normalizedPhone,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id))
            .returning();

        if (rows.length === 0) {
            return c.json({ ok: false, error: 'No encontramos tu cuenta.' }, 404);
        }

        const updatedUser = mapUserRowToAppUser(rows[0]);
        usersById.set(updatedUser.id, updatedUser);
        return c.json({ ok: true, user: sanitizeUser(updatedUser) });
    });

    app.get('/public-profile', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        return c.json(buildAccountPublicProfileResponse(user, vertical));
    });

    app.get('/public-profile/slug-check', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const candidate = normalizePublicProfileSlug(String(c.req.query('slug') ?? ''));
        if (!isValidPublicProfileSlug(candidate)) {
            return c.json({ ok: false, error: 'Slug inválido' }, 400);
        }

        const existing = publicProfilesByVerticalSlug.get(publicProfileVerticalSlugKey(vertical, candidate));
        return c.json({
            ok: true,
            slug: candidate,
            available: !existing || existing.userId === user.id,
        });
    });

    app.patch('/public-profile', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (!userCanUsePublicProfile(user, vertical)) {
            return c.json({ ok: false, error: 'El perfil público está disponible solo para suscripciones de pago.' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = publicProfileWriteSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const current = getPublicProfileRecord(user.id, vertical);
        const normalizedSlug = normalizePublicProfileSlug(parsed.data.slug || parsed.data.displayName);
        if (!isValidPublicProfileSlug(normalizedSlug)) {
            return c.json({ ok: false, error: 'Usa un slug válido de 3 a 80 caracteres.' }, 400);
        }

        const existingBySlug = publicProfilesByVerticalSlug.get(publicProfileVerticalSlugKey(vertical, normalizedSlug));
        if (existingBySlug && existingBySlug.userId !== user.id) {
            return c.json({ ok: false, error: 'Ese enlace público ya está en uso.' }, 409);
        }

        const nextBusinessHours = parsed.data.alwaysOpen
            ? PUBLIC_PROFILE_DAYS.map((day: any) => ({ day, open: '00:00', close: '23:59', closed: false }))
            : parsed.data.businessHours.map((item: any) => ({
                day: item.day,
                open: item.closed ? null : item.open,
                close: item.closed ? null : item.close,
                closed: item.closed,
            }));

        for (const item of nextBusinessHours) {
            if (item.closed) continue;
            if (!item.open || !item.close || item.open >= item.close) {
                return c.json({ ok: false, error: 'Revisa el horario de atención antes de guardar.' }, 400);
            }
        }

        const nextSocialLinks = normalizePublicProfileSocialLinks(parsed.data.socialLinks);
        const now = new Date();
        const rowPayload = {
            slug: normalizedSlug,
            isPublished: parsed.data.isPublished,
            accountKind: parsed.data.accountKind,
            leadRoutingMode: parsed.data.leadRoutingMode,
            leadRoutingCursor: current?.leadRoutingCursor ?? 0,
            displayName: parsed.data.displayName.trim(),
            headline: toNullIfEmpty(parsed.data.headline),
            bio: toNullIfEmpty(parsed.data.bio),
            companyName: parsed.data.accountKind === 'company'
                ? (toNullIfEmpty(parsed.data.companyName) ?? parsed.data.displayName.trim())
                : toNullIfEmpty(parsed.data.companyName),
            website: normalizeExternalUrlInput(parsed.data.website),
            publicEmail: toNullIfEmpty(parsed.data.publicEmail)?.toLowerCase() ?? null,
            publicPhone: toNullIfEmpty(parsed.data.publicPhone),
            publicWhatsapp: toNullIfEmpty(parsed.data.publicWhatsapp),
            addressLine: toNullIfEmpty(parsed.data.addressLine),
            city: toNullIfEmpty(parsed.data.city),
            region: toNullIfEmpty(parsed.data.region),
            coverImageUrl: normalizeExternalUrlInput(parsed.data.coverImageUrl),
            avatarImageUrl: normalizeExternalUrlInput(parsed.data.avatarImageUrl),
            socialLinks: nextSocialLinks,
            businessHours: nextBusinessHours,
            specialties: parsed.data.specialties.map((item: string) => item.trim()).filter(Boolean),
            scheduleNote: toNullIfEmpty(parsed.data.scheduleNote),
            alwaysOpen: parsed.data.alwaysOpen,
            updatedAt: now,
        } as const;

        const nextTeamRows = parsed.data.teamMembers.map((member: any, index: number) => ({
            id: member.id ?? randomUUID(),
            userId: user.id,
            vertical,
            name: member.name.trim(),
            roleTitle: toNullIfEmpty(member.roleTitle),
            bio: toNullIfEmpty(member.bio),
            email: toNullIfEmpty(member.email)?.toLowerCase() ?? null,
            phone: toNullIfEmpty(member.phone),
            whatsapp: toNullIfEmpty(member.whatsapp),
            avatarImageUrl: normalizeExternalUrlInput(member.avatarImageUrl),
            socialLinks: normalizePublicProfileTeamSocialLinks(member.socialLinks),
            specialties: member.specialties.map((item: string) => item.trim()).filter(Boolean),
            isLeadContact: member.isLeadContact,
            receivesLeads: member.receivesLeads,
            isPublished: member.isPublished,
            position: index,
            createdAt: now,
            updatedAt: now,
        }));

        let savedRow: any = null;
        if (current) {
            const rows = await db
                .update(publicProfiles)
                .set(rowPayload)
                .where(eq(publicProfiles.id, current.id))
                .returning();
            savedRow = rows[0] ?? null;
            publicProfilesByVerticalSlug.delete(publicProfileVerticalSlugKey(current.vertical, current.slug));
        } else {
            const rows = await db
                .insert(publicProfiles)
                .values({
                    accountId: await getPrimaryAccountIdForUser(user.id),
                    userId: user.id,
                    vertical,
                    createdAt: now,
                    ...rowPayload,
                })
                .returning();
            savedRow = rows[0] ?? null;
        }

        if (!savedRow) {
            return c.json({ ok: false, error: 'No pudimos guardar tu perfil público.' }, 500);
        }

        await db.delete(publicProfileTeamMembers).where(and(
            eq(publicProfileTeamMembers.userId, user.id),
            eq(publicProfileTeamMembers.vertical, vertical)
        ));
        if (nextTeamRows.length > 0) {
            await db.insert(publicProfileTeamMembers).values(nextTeamRows);
        }

        upsertPublicProfileCache(mapPublicProfileRow(savedRow));
        replacePublicProfileTeamMemberCache(
            user.id,
            vertical,
            nextTeamRows.map((item: any) => ({
                id: item.id,
                userId: item.userId,
                vertical: item.vertical,
                name: item.name,
                roleTitle: item.roleTitle,
                bio: item.bio,
                email: item.email,
                phone: item.phone,
                whatsapp: item.whatsapp,
                avatarImageUrl: item.avatarImageUrl,
                socialLinks: item.socialLinks,
                specialties: item.specialties,
                isLeadContact: item.isLeadContact,
                receivesLeads: item.receivesLeads,
                isPublished: item.isPublished,
                position: item.position,
                createdAt: item.createdAt.getTime(),
                updatedAt: item.updatedAt.getTime(),
            }))
        );

        return c.json(buildAccountPublicProfileResponse(user, vertical));
    });

    return app;
}
