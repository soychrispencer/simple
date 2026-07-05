import { z } from 'zod';
import { geoPointSchema, listingLocationSchema } from '../modules/listings/location.js';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const registerSchema = z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    phone: z.string().trim().max(20).nullable().optional(),
    password: z.string().min(8).max(120),
    termsAccepted: z.boolean().optional(),
    captchaToken: z.string().trim().max(4096).nullable().optional(),
});

export const updateProfileSchema = z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(20).nullable().optional().default(null),
});

const publicProfileAccountKindSchema = z.enum(['individual', 'independent', 'company']);
const publicProfileDayIdSchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
const publicProfileSocialLinksSchema = z.object({
    instagram: z.string().trim().max(120).nullable().optional().default(null),
    facebook: z.string().trim().max(120).nullable().optional().default(null),
    linkedin: z.string().trim().max(120).nullable().optional().default(null),
    youtube: z.string().trim().max(120).nullable().optional().default(null),
    tiktok: z.string().trim().max(120).nullable().optional().default(null),
    x: z.string().trim().max(120).nullable().optional().default(null),
});
const publicProfileBusinessHourSchema = z.object({
    day: publicProfileDayIdSchema,
    open: z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional().default(null),
    close: z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional().default(null),
    closed: z.boolean().default(false),
});

export const publicProfileWriteSchema = z.object({
    slug: z.string().trim().min(3).max(80),
    isPublished: z.boolean().default(false),
    accountKind: publicProfileAccountKindSchema.default('individual'),
    operatorSubtype: z.string().trim().max(40).nullable().optional().default(null),
    operatorSubtypeCustom: z.string().trim().max(160).nullable().optional().default(null),
    displayName: z.string().trim().min(2).max(160),
    headline: z.string().trim().max(180).nullable().optional().default(null),
    bio: z.string().trim().max(2400).nullable().optional().default(null),
    companyName: z.string().trim().max(160).nullable().optional().default(null),
    website: z.string().trim().max(500).nullable().optional().default(null),
    publicEmail: z.string().trim().email().max(255).nullable().optional().default(null),
    publicPhone: z.string().trim().max(40).nullable().optional().default(null),
    publicWhatsapp: z.string().trim().max(40).nullable().optional().default(null),
    addressLine: z.string().trim().max(255).nullable().optional().default(null),
    primaryAddressId: z.string().uuid().nullable().optional().default(null),
    city: z.string().trim().max(120).nullable().optional().default(null),
    region: z.string().trim().max(120).nullable().optional().default(null),
    countryCode: z.string().trim().min(2).max(3).default('CL'),
    regionId: z.string().trim().max(50).nullable().optional().default(null),
    localityId: z.string().trim().max(50).nullable().optional().default(null),
    coverImageUrl: z.string().trim().max(500).nullable().optional().default(null),
    avatarImageUrl: z.string().trim().max(500).nullable().optional().default(null),
    socialLinks: publicProfileSocialLinksSchema.default({
        instagram: null,
        facebook: null,
        linkedin: null,
        youtube: null,
        tiktok: null,
        x: null,
    }),
    businessHours: z.array(publicProfileBusinessHourSchema).length(7),
    specialties: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
    scheduleNote: z.string().trim().max(255).nullable().optional().default(null),
    alwaysOpen: z.boolean().default(false),
    weeklyBreakStart: z.string().trim().max(5).nullable().optional().default(null),
    weeklyBreakEnd: z.string().trim().max(5).nullable().optional().default(null),
    scheduleBlockedSlots: z.array(z.object({
        id: z.string().min(1),
        startsAt: z.string().min(1),
        endsAt: z.string().min(1),
        reason: z.string().trim().max(255).nullable().optional().default(null),
    })).max(50).default([]),
});

const bankTransferDataWriteSchema = z.object({
    bank: z.string().trim().min(1).max(80),
    accountType: z.string().trim().min(1).max(40),
    accountNumber: z.string().trim().min(1).max(40),
    holderName: z.string().trim().min(1).max(120),
    holderRut: z.string().trim().max(20).default(''),
    holderEmail: z.string().trim().max(120).default(''),
    alias: z.string().trim().max(80).optional(),
}).nullable();

export const publicProfileBookingTermsWriteSchema = z.object({
    bookingTermsText: z.string().trim().max(12000).nullable().optional().default(null),
});

export const generateBookingPoliciesSchema = z.object({
    vertical: z.enum(['agenda', 'serenatas', 'autos', 'propiedades']).optional(),
    profession: z.string().trim().max(120).optional(),
    displayName: z.string().trim().max(160).optional(),
    businessName: z.string().trim().max(160).optional(),
    clientLabel: z.string().trim().max(40).optional(),
    cancellationHours: z.number().int().min(0).max(168).optional(),
    bookingWindowDays: z.number().int().min(1).max(365).optional(),
    existingText: z.string().trim().max(12000).optional(),
});

export const publicProfilePaymentMethodsWriteSchema = z.object({
    requiresAdvancePayment: z.boolean().default(false),
    advancePaymentInstructions: z.string().trim().max(2000).nullable().optional().default(null),
    acceptsTransfer: z.boolean().default(false),
    acceptsMp: z.boolean().default(false),
    acceptsPaymentLink: z.boolean().default(false),
    paymentLinkUrl: z.string().trim().max(500).nullable().optional().default(null),
    bankTransferData: bankTransferDataWriteSchema.optional().default(null),
});

export const passwordResetRequestSchema = z.object({
    email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
    token: z.string().min(32).max(256),
    password: z.string().min(8).max(120),
});

export const passwordChangeSchema = z
    .object({
        currentPassword: z.string().min(1).max(120).optional(),
        newPassword: z.string().min(8).max(120),
        confirmPassword: z.string().min(8).max(120),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Las contraseñas no coinciden.',
        path: ['confirmPassword'],
    });

export const savedRecordSchema = z.object({
    id: z.string().min(1),
});

export const followToggleSchema = z.object({
    followeeUserId: z.string().min(1),
    vertical: z.enum(['autos', 'propiedades']),
});

const boostVerticalSchema = z.enum(['autos', 'propiedades', 'agenda']);
const subscriptionVerticalSchema = z.enum(['autos', 'propiedades', 'agenda', 'serenatas']);
const boostPlanIdSchema = z.enum(['boost_starter', 'boost_pro', 'boost_max']);
const boostSectionSchema = z.enum(['sale', 'rent', 'auction', 'project']);
export const portalKeySchema = z.enum(['yapo', 'chileautos', 'mercadolibre', 'facebook']);
const adFormatSchema = z.enum(['hero', 'card', 'inline']);
const adDurationDaysSchema = z.union([z.literal(7), z.literal(15), z.literal(30)]);
const adDestinationTypeSchema = z.enum(['none', 'custom_url', 'listing', 'profile']);
const adOverlayAlignSchema = z.enum(['left', 'center', 'right']);
const adPlacementSectionSchema = z.enum(['home', 'ventas', 'arriendos', 'subastas', 'proyectos']);
const paidSubscriptionPlanIdSchema = z.enum(['pro', 'enterprise']);
const listingStatusSchema = z.enum(['draft', 'active', 'paused', 'sold', 'archived']);
const listingManageStatusSchema = z.enum(['draft', 'active', 'paused', 'sold', 'archived']);
const addressBookKindSchema = z.enum([
    'personal',
    'shipping',
    'billing',
    'office',
    'clinic',
    'store',
    'branch',
    'company',
    'warehouse',
    'pickup',
    'delivery',
    'other',
]);
const addressBookScopeSchema = z.enum(['personal', 'business']);

export const updateListingStatusSchema = z.object({
    status: listingManageStatusSchema,
});

export const listingDraftWriteSchema = z.object({
    draft: z.unknown(),
});

export const addressBookWriteSchema = z.object({
    kind: addressBookKindSchema.default('personal'),
    scope: addressBookScopeSchema.default('personal'),
    label: z.string().trim().min(1).max(80),
    countryCode: z.string().trim().min(2).max(3).default('CL'),
    regionId: z.string().trim().nullable().default(null),
    regionName: z.string().trim().nullable().default(null),
    communeId: z.string().trim().nullable().default(null),
    communeName: z.string().trim().nullable().default(null),
    neighborhood: z.string().trim().nullable().default(null),
    addressLine1: z.string().trim().nullable().default(null),
    addressLine2: z.string().trim().nullable().default(null),
    postalCode: z.string().trim().nullable().default(null),
    arrivalInstructions: z.string().trim().nullable().default(null),
    isDefault: z.boolean().default(false),
    isPublicVisible: z.boolean().optional().default(false),
    geoPoint: geoPointSchema.optional(),
    vertical: z.enum(['autos', 'propiedades', 'serenatas']).nullable().optional(),
}).superRefine((data, ctx) => {
    if (data.scope === 'business' && !data.vertical) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'La vertical es obligatoria para direcciones de negocio.',
            path: ['vertical'],
        });
    }
    if (data.scope === 'personal' && data.vertical) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Las direcciones personales no llevan vertical.',
            path: ['vertical'],
        });
    }
});

export const createBoostOrderSchema = z.object({
    vertical: boostVerticalSchema,
    listingId: z.string().min(1),
    planId: boostPlanIdSchema,
    startAt: z.number().int().positive().optional(),
    section: boostSectionSchema.optional(),
    useFreeBoost: z.boolean().optional(),
});

export const updateBoostOrderSchema = z.object({
    status: z.enum(['active', 'paused', 'ended']),
});

export const createListingSchema = z.object({
    vertical: boostVerticalSchema,
    listingType: boostSectionSchema,
    title: z.string().min(3).max(220),
    description: z.string().max(6000),
    priceLabel: z.string().min(1).max(100),
    location: z.string().max(120).optional(),
    locationData: listingLocationSchema.optional(),
    href: z.string().max(240).optional(),
    status: listingStatusSchema.optional(),
    rawData: z.unknown().optional(),
});

export const updateListingSchema = z.object({
    listingType: boostSectionSchema,
    title: z.string().min(3).max(220),
    description: z.string().max(6000),
    priceLabel: z.string().min(1).max(100),
    location: z.string().max(120).optional(),
    locationData: listingLocationSchema.optional(),
    href: z.string().max(240).optional(),
    status: listingStatusSchema.optional(),
    rawData: z.unknown().optional(),
});

export const publishListingPortalSchema = z.object({
    portal: portalKeySchema,
});

const instagramVerticalSchema = z.enum(['autos', 'propiedades']);

export const instagramSettingsSchema = z.object({
    vertical: instagramVerticalSchema,
    autoPublishEnabled: z.boolean(),
    captionTemplate: z.string().trim().max(2200).nullable().optional(),
});

export const instagramPublishSchema = z.object({
    vertical: instagramVerticalSchema,
    listingId: z.string().trim().min(1),
    captionOverride: z.string().trim().max(2200).nullable().optional(),
    mediaFormat: z.enum(['auto', 'carousel', 'reel']).optional(),
});

export const instagramEnhancedPublishSchema = z.object({
    vertical: instagramVerticalSchema,
    listingId: z.string().trim().min(1),
    captionOverride: z.string().trim().max(2200).nullable().optional(),
    templateId: z.string().trim().max(120).nullable().optional(),
    layoutVariant: z.enum(['square', 'portrait']).nullable().optional(),
    mediaFormat: z.enum(['auto', 'carousel', 'reel']).optional(),
    options: z.object({
        useAI: z.boolean().optional(),
        enableABTesting: z.boolean().optional(),
        schedulePost: z.boolean().optional(),
        useTemplates: z.boolean().optional(),
        optimizeContent: z.boolean().optional(),
        preferredTime: z.coerce.date().optional(),
        tone: z.enum(['professional', 'casual', 'excited', 'luxury', 'urgent']).optional(),
        targetAudience: z.enum(['young', 'professional', 'investors', 'families', 'general']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    }).optional(),
});

export const socialPublishTargetSchema = z.enum([
    'instagram_carousel',
    'instagram_reel',
    'facebook',
    'tiktok',
    'youtube',
    'all',
]);

export const socialPublishSchema = z.object({
    vertical: instagramVerticalSchema,
    listingId: z.string().trim().min(1),
    captionOverride: z.string().trim().max(2200).nullable().optional(),
    publishAll: z.boolean().optional(),
    targets: z.array(socialPublishTargetSchema).optional(),
});

export const generateListingReelSchema = z.object({
    vertical: z.enum(['autos', 'propiedades']).default('autos'),
    replaceExisting: z.boolean().optional(),
});

export const adCampaignCreateSchema = z.object({
    vertical: boostVerticalSchema,
    name: z.string().trim().min(1).max(120),
    format: adFormatSchema,
    destinationType: adDestinationTypeSchema,
    destinationUrl: z.string().trim().max(2000).nullable().optional().default(null),
    listingHref: z.string().trim().max(500).nullable().optional().default(null),
    profileSlug: z.string().trim().max(255).nullable().optional().default(null),
    desktopImageDataUrl: z.string().trim().min(10),
    mobileImageDataUrl: z.string().trim().nullable().optional().default(null),
    overlayEnabled: z.boolean(),
    overlayTitle: z.string().trim().max(160).nullable().optional().default(null),
    overlaySubtitle: z.string().trim().max(300).nullable().optional().default(null),
    overlayCta: z.string().trim().max(80).nullable().optional().default(null),
    overlayAlign: adOverlayAlignSchema,
    placementSection: adPlacementSectionSchema.nullable().optional().default(null),
    startAt: z.string().datetime(),
    durationDays: adDurationDaysSchema,
});

export const adCampaignUpdateSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('content'),
        name: z.string().trim().min(1).max(120),
        destinationType: adDestinationTypeSchema,
        destinationUrl: z.string().trim().max(2000).nullable().optional().default(null),
        listingHref: z.string().trim().max(500).nullable().optional().default(null),
        profileSlug: z.string().trim().max(255).nullable().optional().default(null),
        desktopImageDataUrl: z.string().trim().min(10),
        mobileImageDataUrl: z.string().trim().nullable().optional().default(null),
        overlayEnabled: z.boolean(),
        overlayTitle: z.string().trim().max(160).nullable().optional().default(null),
        overlaySubtitle: z.string().trim().max(300).nullable().optional().default(null),
        overlayCta: z.string().trim().max(80).nullable().optional().default(null),
        overlayAlign: adOverlayAlignSchema,
    }),
    z.object({
        action: z.literal('lifecycle'),
        status: z.enum(['paused', 'scheduled', 'active']),
    }),
]);

export const createCheckoutSchema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('boost'),
        vertical: boostVerticalSchema,
        returnUrl: z.string().url(),
        boost: z.object({
            listingId: z.string().min(1),
            section: boostSectionSchema.optional(),
            planId: boostPlanIdSchema,
        }),
    }),
    z.object({
        kind: z.literal('advertising'),
        vertical: boostVerticalSchema,
        returnUrl: z.string().url(),
        advertising: z.object({
            campaignId: z.string().trim().min(1),
        }),
    }),
    z.object({
        kind: z.literal('subscription'),
        vertical: subscriptionVerticalSchema,
        returnUrl: z.string().url(),
        planId: paidSubscriptionPlanIdSchema.optional(),
        subscription: z.object({
            planId: paidSubscriptionPlanIdSchema,
        }).optional(),
    }).refine((d) => d.planId != null || d.subscription?.planId != null, {
        message: 'planId is required',
    }),
    z.object({
        kind: z.literal('serenata_booking'),
        vertical: z.literal('serenatas'),
        returnUrl: z.string().url(),
        serenata: z.object({
            serenataId: z.string().uuid(),
        }),
    }),
]);

export const confirmCheckoutSchema = z.object({
    orderId: z.string().min(1),
    paymentId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
    sessionId: z.string().min(1).optional(),
});

export const emailVerificationRequestSchema = z.object({
    email: z.string().email().optional(),
});

export const emailVerificationConfirmSchema = z.object({
    token: z.string().trim().min(1),
});

export const emailChangeRequestSchema = z.object({
    newEmail: z.string().trim().email().max(255),
});

export const messageEntryCreateSchema = z.object({
    body: z.string().trim().min(1).max(4000),
});

export const messageFolderSchema = z.enum(['inbox', 'archived', 'spam']);

export const messageThreadUpdateSchema = z.object({
    action: z.enum(['read', 'archive', 'unarchive', 'spam', 'unspam']),
});
