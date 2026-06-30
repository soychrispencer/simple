'use client';

import { useMemo } from 'react';
import type { PublicProfileVertical } from '@simple/utils';
import {
    checkPublicProfileSlugAvailability,
    fetchAccountPublicProfile,
    updateAccountPublicProfile,
} from '@simple/utils';
import {
    BusinessPublicLinkPanel,
    normalizeBusinessPublicSlug,
    type BusinessPublicLinkAdapter,
} from './business-public-link-panel.js';

export type PanelMarketplacePublicLinkPanelProps = {
    vertical: PublicProfileVertical;
    appBaseUrl: string;
    profilePathPrefix?: string;
    variant?: 'default' | 'minimal';
};

export function PanelMarketplacePublicLinkPanel({
    vertical,
    appBaseUrl,
    profilePathPrefix = '/perfil/',
    variant = 'default',
}: PanelMarketplacePublicLinkPanelProps) {
    const adapter = useMemo<BusinessPublicLinkAdapter>(() => ({
        appBaseUrl,
        profilePathPrefix,
        profileEditHref: '/panel/mi-negocio',
        refreshEvents: ['simple:marketplace-profile-changed', 'simple:marketplace-publish-changed'],
        normalizeSlug: normalizeBusinessPublicSlug,
        emptyStateDescription: 'Completa tu nombre público abajo para generar tu link.',
        load: async () => {
            const response = await fetchAccountPublicProfile(vertical);
            if (!response?.ok) return null;
            const profile = response.profile;
            return {
                displayName: profile.displayName,
                slug: profile.slug ? normalizeBusinessPublicSlug(profile.slug) : '',
                isPublished: profile.isPublished,
            };
        },
        checkSlugAvailable: async (slug, currentSlug) => {
            if (slug === currentSlug) return true;
            const result = await checkPublicProfileSlugAvailability(vertical, slug);
            return result.available ?? false;
        },
        saveSlug: async (slug) => {
            const response = await fetchAccountPublicProfile(vertical);
            if (!response?.ok) return { ok: false, error: 'No pudimos cargar tu perfil.' };
            const { id: _id, userId: _userId, vertical: _vertical, publicUrl: _publicUrl, ...payload } = response.profile;
            const saved = await updateAccountPublicProfile(vertical, { ...payload, slug });
            if (!saved.ok) {
                return { ok: false, error: saved.error ?? 'No se pudo guardar.' };
            }
            window.dispatchEvent(new CustomEvent('simple:marketplace-profile-changed', { detail: { vertical } }));
            return { ok: true, slug: saved.profile.slug ? normalizeBusinessPublicSlug(saved.profile.slug) : slug };
        },
    }), [vertical, appBaseUrl, profilePathPrefix]);

    return <BusinessPublicLinkPanel adapter={adapter} variant={variant} />;
}
