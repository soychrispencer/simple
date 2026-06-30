'use client';

import { useMemo } from 'react';
import {
    BusinessPublicLinkPanel,
    normalizeBusinessPublicSlugStrict,
    type BusinessPublicLinkAdapter,
} from '@simple/ui/panel';
import { checkSlugAvailable, fetchAgendaProfile, saveAgendaProfile } from '@/lib/agenda-api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3004';
const SLUG_RE = /^[a-z0-9-]{3,50}$/;

export function AgendaPublicLinkPanel() {
    const adapter = useMemo<BusinessPublicLinkAdapter>(() => ({
        appBaseUrl: APP_URL,
        profilePathPrefix: '/',
        profileEditHref: '/panel/mi-negocio',
        refreshEvents: ['simple:agenda-profile-changed', 'simple:agenda-publish-changed'],
        normalizeSlug: normalizeBusinessPublicSlugStrict,
        slugMinLength: 3,
        shareTitle: (state) => (state.displayName ? `Reserva con ${state.displayName}` : 'Reserva tu cita'),
        qrDownloadName: (slug) => `reservas-${slug}`,
        emptyStateDescription: 'Completa tu nombre público abajo para generar tu link.',
        load: async () => {
            const profile = await fetchAgendaProfile();
            if (!profile) return null;
            return {
                displayName: profile.displayName,
                slug: profile.slug ?? '',
                isPublished: Boolean(profile.isPublished),
            };
        },
        checkSlugAvailable: async (slug, currentSlug) => {
            if (!SLUG_RE.test(slug)) return null;
            if (slug === currentSlug) return true;
            const result = await checkSlugAvailable(slug);
            return result.available;
        },
        saveSlug: async (slug) => {
            if (!SLUG_RE.test(slug)) {
                return { ok: false, error: 'El enlace debe tener entre 3 y 50 caracteres (solo letras, números y guiones).' };
            }
            const result = await saveAgendaProfile({ slug });
            if (!result.ok) {
                return { ok: false, error: result.error ?? 'No se pudo guardar.' };
            }
            window.dispatchEvent(new CustomEvent('simple:agenda-profile-changed'));
            return { ok: true, slug };
        },
    }), []);

    return <BusinessPublicLinkPanel adapter={adapter} variant="minimal" />;
}
