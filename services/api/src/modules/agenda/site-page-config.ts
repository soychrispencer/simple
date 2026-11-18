import {
    emptyOperatorSiteLandingConfig,
    isValidOperatorSiteAccentStorage,
    normalizeOperatorSiteAccentHex,
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteLayout,
    OPERATOR_SITE_COLOR_MODES,
    OPERATOR_SITE_LANDING_SECTIONS,
    OPERATOR_SITE_LAYOUTS,
    type OperatorSiteLandingAppearance,
    type OperatorSiteLandingConfig,
    type OperatorSiteLandingContent,
    type OperatorSiteLandingGenerationTarget,
} from '@simple/utils';
import { z } from 'zod';

export const landingBriefSchema = z.object({
    audience: z.string().trim().max(500).default(''),
    differentiators: z.string().trim().max(700).default(''),
    credentials: z.string().trim().max(500).default(''),
    tone: z.enum(['cercano', 'profesional', 'sereno', 'premium', 'dinamico']).default('profesional'),
}).strict();

export const landingContentSchema = z.object({
    heroHeadline: z.string().trim().max(90).default(''),
    heroSubheadline: z.string().trim().max(180).default(''),
    aboutTitle: z.string().trim().max(80).default(''),
    aboutText: z.string().trim().max(900).default(''),
    highlightsTitle: z.string().trim().max(80).default(''),
    highlights: z.array(z.object({
        title: z.string().trim().max(48),
        description: z.string().trim().max(150),
    }).strict()).max(3).default([]),
    seoTitle: z.string().trim().max(65).default(''),
    seoDescription: z.string().trim().max(170).default(''),
    sections: z.object({
        about: z.boolean().optional(),
        highlights: z.boolean().optional(),
        location: z.boolean().optional(),
        contact: z.boolean().optional(),
    }).strict().optional(),
    sectionOrder: z.array(z.enum(OPERATOR_SITE_LANDING_SECTIONS))
        .length(OPERATOR_SITE_LANDING_SECTIONS.length)
        .refine((order) => new Set(order).size === OPERATOR_SITE_LANDING_SECTIONS.length)
        .optional(),
}).strict();

const brandImageSchema = z.string().trim().min(1).max(500).refine((value) => (
    /^(https?:\/\/[^\s\\]+|\/(?![\/\\])[^\s\\]+)$/i.test(value)
)).nullable();

export const landingAppearanceSchema = z.object({
    layout: z.enum(OPERATOR_SITE_LAYOUTS),
    colorMode: z.enum(OPERATOR_SITE_COLOR_MODES),
    accentColor: z.string().trim().refine(isValidOperatorSiteAccentStorage)
        .transform((color) => normalizeOperatorSiteAccentHex(color) ?? color),
    avatarUrl: brandImageSchema,
    coverUrl: brandImageSchema,
}).strict();

export const landingMutationContextSchema = z.object({
    profileId: z.string().uuid().optional(),
    revision: z.string().uuid().nullable().optional(),
});

export const landingGenerationTargetSchema = z.enum(['all', 'hero', 'about', 'highlights', 'seo']).default('all');

export function mergeGeneratedLandingContent(
    current: OperatorSiteLandingContent | undefined,
    generated: OperatorSiteLandingContent,
    target: OperatorSiteLandingGenerationTarget,
): OperatorSiteLandingContent {
    if (!current || target === 'all') {
        return { ...generated, sections: current?.sections, sectionOrder: current?.sectionOrder };
    }
    switch (target) {
        case 'hero': return { ...current, heroHeadline: generated.heroHeadline, heroSubheadline: generated.heroSubheadline };
        case 'about': return { ...current, aboutTitle: generated.aboutTitle, aboutText: generated.aboutText };
        case 'highlights': return { ...current, highlightsTitle: generated.highlightsTitle, highlights: generated.highlights };
        case 'seo': return { ...current, seoTitle: generated.seoTitle, seoDescription: generated.seoDescription };
    }
}

const landingVersionSchema = z.object({
    content: landingContentSchema.nullable(),
    appearance: landingAppearanceSchema,
});

export function normalizeLandingConfig(raw: unknown): OperatorSiteLandingConfig {
    const defaults = emptyOperatorSiteLandingConfig();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
    const record = raw as Record<string, unknown>;
    if (record.version !== undefined && record.version !== 1) return defaults;
    return {
        ...defaults,
        brief: landingBriefSchema.safeParse(record.brief).data ?? defaults.brief,
        draft: landingContentSchema.nullable().safeParse(record.draft).data ?? null,
        published: landingContentSchema.nullable().safeParse(record.published).data ?? null,
        draftAppearance: landingAppearanceSchema.safeParse(record.draftAppearance).data,
        draftRevision: z.string().uuid().safeParse(record.draftRevision).data,
        previous: landingVersionSchema.safeParse(record.previous).data,
        publishedAt: z.iso.datetime().safeParse(record.publishedAt).data,
    };
}

export function getPublishedAppearance(profile: {
    operatorSiteLayout?: unknown;
    operatorSiteColorMode?: unknown;
    operatorSiteAccentColor?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
}): OperatorSiteLandingAppearance {
    const accent = profile.operatorSiteAccentColor?.trim() ?? '';
    return {
        layout: normalizeOperatorSiteLayout(profile.operatorSiteLayout),
        colorMode: normalizeOperatorSiteColorMode(profile.operatorSiteColorMode),
        accentColor: isValidOperatorSiteAccentStorage(accent) ? accent : 'teal',
        avatarUrl: profile.avatarUrl?.trim() || null,
        coverUrl: profile.coverUrl?.trim() || null,
    };
}
