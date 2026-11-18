import type { OperatorSiteColorMode, OperatorSiteLayout } from './operator-site-theme.js';

export type OperatorSiteLandingTone = 'cercano' | 'profesional' | 'sereno' | 'premium' | 'dinamico';
export const OPERATOR_SITE_LANDING_SECTIONS = ['about', 'highlights', 'location', 'contact'] as const;
export type OperatorSiteLandingSection = (typeof OPERATOR_SITE_LANDING_SECTIONS)[number];
export type OperatorSiteLandingGenerationTarget = 'all' | 'hero' | 'about' | 'highlights' | 'seo';

export type OperatorSiteLandingBrief = {
    audience: string;
    differentiators: string;
    credentials: string;
    tone: OperatorSiteLandingTone;
};

export type OperatorSiteLandingHighlight = {
    title: string;
    description: string;
};

export type OperatorSiteLandingContent = {
    heroHeadline: string;
    heroSubheadline: string;
    aboutTitle: string;
    aboutText: string;
    highlightsTitle: string;
    highlights: OperatorSiteLandingHighlight[];
    seoTitle: string;
    seoDescription: string;
    sections?: Partial<Record<OperatorSiteLandingSection, boolean>>;
    sectionOrder?: OperatorSiteLandingSection[];
};

export type OperatorSiteLandingAppearance = {
    layout: OperatorSiteLayout;
    colorMode: OperatorSiteColorMode;
    accentColor: string;
    avatarUrl: string | null;
    coverUrl: string | null;
};

export type OperatorSiteLandingVersion = {
    content: OperatorSiteLandingContent | null;
    appearance: OperatorSiteLandingAppearance;
};

export type OperatorSiteLandingConfig = {
    version: 1;
    brief: OperatorSiteLandingBrief;
    draft: OperatorSiteLandingContent | null;
    published: OperatorSiteLandingContent | null;
    draftAppearance?: OperatorSiteLandingAppearance;
    draftRevision?: string;
    previous?: OperatorSiteLandingVersion;
    publishedAt?: string;
};

export const DEFAULT_OPERATOR_SITE_LANDING_BRIEF: OperatorSiteLandingBrief = {
    audience: '',
    differentiators: '',
    credentials: '',
    tone: 'profesional',
};

export function emptyOperatorSiteLandingConfig(): OperatorSiteLandingConfig {
    return {
        version: 1,
        brief: { ...DEFAULT_OPERATOR_SITE_LANDING_BRIEF },
        draft: null,
        published: null,
    };
}
