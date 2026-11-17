export type OperatorSiteLandingTone = 'cercano' | 'profesional' | 'sereno' | 'premium' | 'dinamico';

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
};

export type OperatorSiteLandingConfig = {
    version: 1;
    brief: OperatorSiteLandingBrief;
    draft: OperatorSiteLandingContent | null;
    published: OperatorSiteLandingContent | null;
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
