import { describe, expect, it } from 'vitest';
import { getPublishedAppearance, landingAppearanceSchema, landingContentSchema, mergeGeneratedLandingContent, normalizeLandingConfig } from './site-page-config.js';

describe('agenda page draft configuration', () => {
    it('keeps the published page when a stored draft contains invalid data', () => {
        const published = landingContentSchema.parse({ heroHeadline: 'Mi página publicada' });
        const config = normalizeLandingConfig({
            version: 1,
            draft: { heroHeadline: 42 },
            draftAppearance: { layout: 'unknown' },
            published,
        });

        expect(config.draft).toBeNull();
        expect(config.draftAppearance).toBeUndefined();
        expect(config.published).toEqual(published);
    });

    it('saves partial manual text and keeps the other fields when regenerating a single block', () => {
        const draft = landingContentSchema.parse({
            heroHeadline: '',
            aboutText: 'Una presentación escrita a mano.',
            sections: { location: false },
        });
        const generated = landingContentSchema.parse({
            heroHeadline: 'Un nuevo titular',
            aboutText: 'Propuesta para la presentación.',
        });

        expect(mergeGeneratedLandingContent(draft, generated, 'hero')).toEqual({
            ...draft,
            heroHeadline: generated.heroHeadline,
        });
    });

    it('preserves the stored design and images for a legacy page without a draft design', () => {
        expect(getPublishedAppearance({
            operatorSiteLayout: 'studio',
            operatorSiteColorMode: 'dark',
            operatorSiteAccentColor: 'violet',
            avatarUrl: '/uploads/brand/logo.png',
        })).toEqual({
            layout: 'studio',
            colorMode: 'dark',
            accentColor: 'violet',
            avatarUrl: '/uploads/brand/logo.png',
            coverUrl: null,
        });
    });

    it('normalizes custom colors and accepts only web or local paths for brand images', () => {
        const appearance = {
            layout: 'portfolio',
            colorMode: 'light',
            accentColor: '#abc',
            avatarUrl: '/uploads/brand/logo.png',
            coverUrl: null,
        };

        expect(landingAppearanceSchema.parse(appearance).accentColor).toBe('#AABBCC');
        expect(landingAppearanceSchema.safeParse({ ...appearance, coverUrl: 'javascript:alert(1)' }).success).toBe(false);
    });
});
