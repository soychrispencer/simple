'use client';

import { useMemo } from 'react';
import {
    BusinessPublicLinkPanel,
    normalizeBusinessPublicSlugStrict,
    type BusinessPublicLinkAdapter,
} from '@simple/ui/panel';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';
const SLUG_RE = /^[a-z0-9-]{3,50}$/;

function groupToLinkState(group: ProviderGroup) {
    return {
        displayName: group.name,
        slug: group.slug ?? '',
        isPublished: group.status === 'active',
    };
}

export function SerenatasPublicLinkPanel({ refresh }: { refresh: () => Promise<void> }) {
    const { group, loading, error, refresh: refreshAll } = useProviderGroupScope(refresh);

    const adapter = useMemo<BusinessPublicLinkAdapter | null>(() => {
        if (!group) return null;

        return {
            appBaseUrl: APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3005'),
            profilePathPrefix: '/',
            profileEditHref: '/panel/mi-negocio?tab=datos',
            refreshEvents: ['simple:serenatas-group-changed', 'simple:serenatas-publish-changed'],
            normalizeSlug: normalizeBusinessPublicSlugStrict,
            slugMinLength: 3,
            shareTitle: (state) => (state.displayName ? `Contrata ${state.displayName}` : 'Simple Serenatas'),
            qrDownloadName: (slug) => `serenata-${slug}`,
            emptyStateDescription: 'Completa el nombre de tu grupo abajo para generar tu link.',
            load: async () => groupToLinkState(group),
            saveSlug: async (slug) => {
                if (!SLUG_RE.test(slug)) {
                    return { ok: false, error: 'Usa entre 3 y 50 caracteres: letras minúsculas, números y guiones.' };
                }
                const response = await serenatasApi.updateProviderGroup(group.id, { slug });
                if (!response.ok || !response.item) {
                    return { ok: false, error: response.error ?? 'No se pudo guardar el enlace.' };
                }
                await refreshAll();
                window.dispatchEvent(new CustomEvent('simple:serenatas-group-changed'));
                return { ok: true, slug: response.item.slug ?? slug };
            },
        };
    }, [group, refreshAll]);

    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando link público…</p>;
    }

    if (error) {
        return (
            <p className="text-xs text-(--color-error-text)" style={{ color: 'var(--color-error-text)' }}>
                Error cargando link público: {error}
            </p>
        );
    }

    if (!adapter) {
        return (
            <p className="text-xs text-(--fg-muted)">
                No se pudo cargar el perfil del grupo. Verifica que tengas un grupo creado en tu cuenta.
            </p>
        );
    }

    return <BusinessPublicLinkPanel adapter={adapter} variant="minimal" />;
}
