import type { InstagramTemplateView } from './templates.js';
import type { ListingData } from './templates.js';
import { generateSmartTemplates } from './templates.js';

export type InstagramPublishTone = 'professional' | 'casual' | 'excited' | 'luxury' | 'urgent';
export type InstagramPublishAudience = 'young' | 'professional' | 'investors' | 'families' | 'general';
export type InstagramTemplateId = 'essential-watermark' | 'professional-centered' | 'signature-complete';

export type InstagramPublishStyle = {
    templateId: InstagramTemplateId;
    layoutVariant: 'square' | 'portrait';
    tone: InstagramPublishTone;
    targetAudience: InstagramPublishAudience;
    useAI: boolean;
};

export const DEFAULT_INSTAGRAM_PUBLISH_STYLE: InstagramPublishStyle = {
    templateId: 'essential-watermark',
    layoutVariant: 'portrait',
    tone: 'professional',
    targetAudience: 'general',
    useAI: true,
};

const TEMPLATE_IDS = new Set<InstagramTemplateId>([
    'essential-watermark',
    'professional-centered',
    'signature-complete',
]);

export function parseInstagramPublishStyle(raw: unknown): InstagramPublishStyle | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const templateId = typeof record.templateId === 'string' ? record.templateId : '';
    if (!TEMPLATE_IDS.has(templateId as InstagramTemplateId)) return null;

    const layoutVariant = record.layoutVariant === 'square' ? 'square' : 'portrait';
    const tone = typeof record.tone === 'string' ? record.tone : 'professional';
    const targetAudience = typeof record.targetAudience === 'string' ? record.targetAudience : 'general';
    const useAI = record.useAI !== false;

    return {
        templateId: templateId as InstagramTemplateId,
        layoutVariant,
        tone: tone as InstagramPublishTone,
        targetAudience: targetAudience as InstagramPublishAudience,
        useAI,
    };
}

export function resolveInstagramPublishStyle(raw: unknown): InstagramPublishStyle {
    return parseInstagramPublishStyle(raw) ?? DEFAULT_INSTAGRAM_PUBLISH_STYLE;
}

export function resolvePublishTemplateForListing(
    style: InstagramPublishStyle,
    listing: ListingData,
): InstagramTemplateView {
    const templates = generateSmartTemplates(listing);
    const selected = [templates.recommendedTemplate, ...templates.alternatives]
        .find((template) => template.id === style.templateId)
        ?? templates.recommendedTemplate;

    if (selected.layoutVariant !== style.layoutVariant) {
        return { ...selected, layoutVariant: style.layoutVariant };
    }
    return selected;
}
