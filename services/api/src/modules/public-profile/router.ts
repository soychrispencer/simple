import { Hono } from 'hono';
import type { Context } from 'hono';
import {
    getOperatorSubtypes,
    isOperatorSubtypeOther,
    normalizeOperatorSubtype,
    requiresOperatorSubtype,
    requiresOperatorSubtypeCustom,
    operatorBrandMediaMissing,
    operatorBrandMediaPublishError,
    inferTimezoneFromStructuredLocation,
    normalizeTimezone,
    structuredLocationFromPublicProfileFields,
    businessPaymentMethodsFromRecord,
    getBusinessPaymentMethodsSaveError,
} from '@simple/utils';
import type { MarketplaceOperatorAnalytics } from './operator-analytics.js';
import { mountOperatorServicesRoutes, type OperatorServicesDeps } from './operator-services.js';
import { generateBookingPoliciesText } from '../accounts/generate-booking-policies.js';

export interface AccountRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    updateProfileSchema: any;
    publicProfileWriteSchema: any;
    publicProfilePaymentMethodsWriteSchema: any;
    publicProfileBookingTermsWriteSchema: any;
    generateBookingPoliciesSchema: any;
    db: any;
    tables: {
        users: any;
        publicProfiles: any;
        addressBook: any;
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
    ensureMarketplaceDraftProfileForUser?: (user: any, vertical: any) => Promise<void>;
    getEffectivePlanId?: (user: any, vertical: any) => string;
    PUBLIC_PROFILE_DAYS: readonly any[];
    normalizePublicProfileSocialLinks: (links: any) => any;
    normalizeExternalUrlInput: (url: any) => any;
    toNullIfEmpty: (v: any) => any;
    upsertPublicProfileCache: (profile: any) => void;
    mapPublicProfileRow: (row: any) => any;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    refreshAddressBookCacheForUser?: (userId: string) => Promise<void>;
    randomUUID: () => string;
    buildMarketplaceOperatorAnalytics?: (
        userId: string,
        vertical: ReturnType<AccountRouterDeps['parseVertical']>,
    ) => MarketplaceOperatorAnalytics;
    operatorServices?: Omit<OperatorServicesDeps, 'authUser' | 'parseVertical'>;
}

export function createAccountRouter(deps: AccountRouterDeps) {
    const {
        authUser,
        parseVertical,
        updateProfileSchema,
        publicProfileWriteSchema,
        publicProfilePaymentMethodsWriteSchema,
        publicProfileBookingTermsWriteSchema,
        generateBookingPoliciesSchema,
        db,
        tables: { users, publicProfiles, addressBook },
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
        ensureMarketplaceDraftProfileForUser,
        getEffectivePlanId,
        PUBLIC_PROFILE_DAYS,
        normalizePublicProfileSocialLinks,
        normalizeExternalUrlInput,
        toNullIfEmpty,
        upsertPublicProfileCache,
        mapPublicProfileRow,
        getPrimaryAccountIdForUser,
        refreshAddressBookCacheForUser,
        randomUUID,
        buildMarketplaceOperatorAnalytics: buildOperatorAnalytics,
        operatorServices,
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
        if (ensureMarketplaceDraftProfileForUser) {
            await ensureMarketplaceDraftProfileForUser(user, vertical);
        }
        return c.json(buildAccountPublicProfileResponse(user, vertical));
    });

    app.get('/public-profile/analytics', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Vertical no soportada' }, 400);
        }
        if (!buildOperatorAnalytics) {
            return c.json({ ok: false, error: 'Analytics no disponible' }, 503);
        }

        return c.json({
            ok: true,
            analytics: buildOperatorAnalytics(user.id, vertical),
        });
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
        const featureEnabled = userCanUsePublicProfile(user, vertical);

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
            if (!item.open || !item.close) {
                return c.json({ ok: false, error: 'Revisa el horario de atención antes de guardar.' }, 400);
            }
            if (item.open === item.close) {
                return c.json({ ok: false, error: 'Revisa el horario de atención antes de guardar.' }, 400);
            }
        }

        const nextSocialLinks = normalizePublicProfileSocialLinks(parsed.data.socialLinks);
        const now = new Date();
        const paidPlanId = getEffectivePlanId?.(user, vertical) ?? 'free';
        const individualSubtypes = getOperatorSubtypes(vertical, parsed.data.accountKind);
        const resolvedOperatorSubtype = normalizeOperatorSubtype(
            vertical,
            parsed.data.accountKind,
            parsed.data.operatorSubtype
                ?? (individualSubtypes.length === 1 ? individualSubtypes[0]?.id ?? null : null),
        );
        if (
            featureEnabled
            && parsed.data.isPublished
            && requiresOperatorSubtype(parsed.data.accountKind, individualSubtypes)
            && !resolvedOperatorSubtype
        ) {
            return c.json({ ok: false, error: 'Elige tu especialización para activar tu perfil público.' }, 400);
        }
        const resolvedOperatorSubtypeCustom = isOperatorSubtypeOther(resolvedOperatorSubtype)
            ? parsed.data.operatorSubtypeCustom?.trim() || null
            : null;
        if (
            featureEnabled
            && parsed.data.isPublished
            && requiresOperatorSubtypeCustom(resolvedOperatorSubtype)
            && !resolvedOperatorSubtypeCustom
        ) {
            return c.json({ ok: false, error: 'Describe tu negocio si elegiste Otros.' }, 400);
        }
        if (featureEnabled && parsed.data.isPublished) {
            const mediaMissing = operatorBrandMediaMissing({
                logoUrl: parsed.data.avatarImageUrl,
                coverUrl: parsed.data.coverImageUrl,
            });
            if (mediaMissing.length > 0) {
                return c.json({ ok: false, error: operatorBrandMediaPublishError(mediaMissing) }, 400);
            }
        }

        let primaryAddressId = parsed.data.primaryAddressId ?? null;
        if (primaryAddressId) {
            const [primaryAddress] = await db
                .select()
                .from(addressBook)
                .where(and(
                    eq(addressBook.userId, user.id),
                    eq(addressBook.id, primaryAddressId),
                    eq(addressBook.scope, 'business'),
                    eq(addressBook.vertical, vertical),
                ))
                .limit(1);
            if (!primaryAddress) {
                return c.json({ ok: false, error: 'La dirección principal seleccionada no es válida.' }, 400);
            }
            if (primaryAddress.vertical !== vertical) {
                return c.json({ ok: false, error: 'La dirección no corresponde a este negocio.' }, 400);
            }
            if (!primaryAddress.isDefault) {
                return c.json({ ok: false, error: 'Solo puedes mostrar la dirección predeterminada en tu ficha.' }, 400);
            }
            await db
                .update(addressBook)
                .set({ isPublicVisible: true, updatedAt: now })
                .where(eq(addressBook.id, primaryAddressId));
        } else {
            primaryAddressId = null;
        }

        const businessTimezone = normalizeTimezone(inferTimezoneFromStructuredLocation(
            structuredLocationFromPublicProfileFields({
                countryCode: parsed.data.countryCode,
                regionId: toNullIfEmpty(parsed.data.regionId),
                localityId: toNullIfEmpty(parsed.data.localityId),
                region: toNullIfEmpty(parsed.data.region),
                city: toNullIfEmpty(parsed.data.city),
            }),
        ));

        const rowPayload = {
            slug: normalizedSlug,
            isPublished: featureEnabled ? parsed.data.isPublished : false,
            accountKind: parsed.data.accountKind,
            operatorSubtype: resolvedOperatorSubtype,
            operatorSubtypeCustom: resolvedOperatorSubtypeCustom,
            displayName: parsed.data.displayName.trim(),
            headline: null,
            bio: toNullIfEmpty(parsed.data.bio),
            companyName: null,
            website: normalizeExternalUrlInput(parsed.data.website),
            publicEmail: toNullIfEmpty(parsed.data.publicEmail)?.toLowerCase() ?? null,
            publicPhone: toNullIfEmpty(parsed.data.publicPhone),
            publicWhatsapp: toNullIfEmpty(parsed.data.publicWhatsapp),
            primaryAddressId,
            addressLine: primaryAddressId ? null : toNullIfEmpty(parsed.data.addressLine),
            city: toNullIfEmpty(parsed.data.city),
            region: toNullIfEmpty(parsed.data.region),
            countryCode: parsed.data.countryCode,
            regionId: toNullIfEmpty(parsed.data.regionId),
            localityId: toNullIfEmpty(parsed.data.localityId),
            timezone: businessTimezone,
            coverImageUrl: normalizeExternalUrlInput(parsed.data.coverImageUrl),
            avatarImageUrl: normalizeExternalUrlInput(parsed.data.avatarImageUrl),
            socialLinks: nextSocialLinks,
            businessHours: nextBusinessHours,
            specialties: [],
            scheduleNote: toNullIfEmpty(parsed.data.scheduleNote),
            alwaysOpen: parsed.data.alwaysOpen,
            weeklyBreakStart: parsed.data.alwaysOpen ? null : toNullIfEmpty(parsed.data.weeklyBreakStart),
            weeklyBreakEnd: parsed.data.alwaysOpen ? null : toNullIfEmpty(parsed.data.weeklyBreakEnd),
            scheduleBlockedSlots: parsed.data.scheduleBlockedSlots ?? [],
            updatedAt: now,
        } as const;

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

        upsertPublicProfileCache(mapPublicProfileRow(savedRow));
        if (primaryAddressId && refreshAddressBookCacheForUser) {
            await refreshAddressBookCacheForUser(user.id);
        }

        return c.json(buildAccountPublicProfileResponse(user, vertical));
    });

    function buildPaymentMethodsResponse(record: ReturnType<typeof getPublicProfileRecord>) {
        return {
            requiresAdvancePayment: Boolean(record?.requiresAdvancePayment),
            advancePaymentInstructions: record?.advancePaymentInstructions ?? '',
            acceptsTransfer: Boolean(record?.acceptsTransfer),
            acceptsMp: Boolean(record?.acceptsMp),
            acceptsPaymentLink: Boolean(record?.acceptsPaymentLink),
            paymentLinkUrl: record?.paymentLinkUrl ?? '',
            bankTransferData: record?.bankTransferData ?? null,
            mpConnected: Boolean(record?.mpAccessToken),
        };
    }

    app.get('/public-profile/payment-methods', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Vertical no soportada' }, 400);
        }
        if (!userCanUsePublicProfile(user, vertical)) {
            return c.json({ ok: false, error: 'Tu plan no incluye perfil público.' }, 403);
        }
        if (ensureMarketplaceDraftProfileForUser) {
            await ensureMarketplaceDraftProfileForUser(user, vertical);
        }

        const record = getPublicProfileRecord(user.id, vertical);
        return c.json({
            ok: true,
            paymentMethods: buildPaymentMethodsResponse(record),
        });
    });

    app.put('/public-profile/payment-methods', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Vertical no soportada' }, 400);
        }
        if (!userCanUsePublicProfile(user, vertical)) {
            return c.json({ ok: false, error: 'Tu plan no incluye perfil público.' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = publicProfilePaymentMethodsWriteSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const paymentValidationError = getBusinessPaymentMethodsSaveError(
            businessPaymentMethodsFromRecord(parsed.data),
        );
        if (paymentValidationError) {
            return c.json({ ok: false, error: paymentValidationError }, 400);
        }

        if (ensureMarketplaceDraftProfileForUser) {
            await ensureMarketplaceDraftProfileForUser(user, vertical);
        }

        const current = getPublicProfileRecord(user.id, vertical);
        if (!current) {
            return c.json({ ok: false, error: 'No encontramos tu perfil público.' }, 404);
        }

        const now = new Date();
        const rows = await db
            .update(publicProfiles)
            .set({
                requiresAdvancePayment: parsed.data.requiresAdvancePayment,
                advancePaymentInstructions: toNullIfEmpty(parsed.data.advancePaymentInstructions),
                acceptsTransfer: parsed.data.acceptsTransfer,
                acceptsMp: parsed.data.acceptsMp,
                acceptsPaymentLink: parsed.data.acceptsPaymentLink,
                paymentLinkUrl: normalizeExternalUrlInput(parsed.data.paymentLinkUrl),
                bankTransferData: parsed.data.acceptsTransfer ? parsed.data.bankTransferData : null,
                updatedAt: now,
            })
            .where(eq(publicProfiles.id, current.id))
            .returning();

        const savedRow = rows[0];
        if (!savedRow) {
            return c.json({ ok: false, error: 'No pudimos guardar tus medios de pago.' }, 500);
        }

        const saved = mapPublicProfileRow(savedRow);
        upsertPublicProfileCache(saved);

        return c.json({
            ok: true,
            paymentMethods: buildPaymentMethodsResponse(saved),
        });
    });

    app.get('/public-profile/booking-terms', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Vertical no soportada' }, 400);
        }
        if (!userCanUsePublicProfile(user, vertical)) {
            return c.json({ ok: false, error: 'Tu plan no incluye perfil público.' }, 403);
        }
        if (ensureMarketplaceDraftProfileForUser) {
            await ensureMarketplaceDraftProfileForUser(user, vertical);
        }

        const record = getPublicProfileRecord(user.id, vertical);
        return c.json({
            ok: true,
            bookingTermsText: record?.bookingTermsText ?? null,
        });
    });

    app.put('/public-profile/booking-terms', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (vertical !== 'autos' && vertical !== 'propiedades') {
            return c.json({ ok: false, error: 'Vertical no soportada' }, 400);
        }
        if (!userCanUsePublicProfile(user, vertical)) {
            return c.json({ ok: false, error: 'Tu plan no incluye perfil público.' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = publicProfileBookingTermsWriteSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        if (ensureMarketplaceDraftProfileForUser) {
            await ensureMarketplaceDraftProfileForUser(user, vertical);
        }

        const current = getPublicProfileRecord(user.id, vertical);
        if (!current) {
            return c.json({ ok: false, error: 'No encontramos tu perfil público.' }, 404);
        }

        const normalized = parsed.data.bookingTermsText?.trim() || null;
        const rows = await db
            .update(publicProfiles)
            .set({ bookingTermsText: normalized, updatedAt: new Date() })
            .where(eq(publicProfiles.id, current.id))
            .returning();

        const savedRow = rows[0];
        if (!savedRow) {
            return c.json({ ok: false, error: 'No pudimos guardar las políticas.' }, 500);
        }

        upsertPublicProfileCache(mapPublicProfileRow(savedRow));
        return c.json({ ok: true, bookingTermsText: savedRow.bookingTermsText ?? null });
    });

    app.post('/generate-booking-policies', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = generateBookingPoliciesSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const result = await generateBookingPoliciesText(parsed.data);
        if (!result.ok) {
            return c.json({ ok: false, error: result.error }, 500);
        }
        return c.json({ ok: true, text: result.text });
    });

    if (operatorServices) {
        mountOperatorServicesRoutes(app, {
            authUser,
            parseVertical,
            ...operatorServices,
        });
    }

    return app;
}
