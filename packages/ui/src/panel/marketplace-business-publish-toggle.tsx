'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchAccountBusinessLegal,
    fetchAccountPublicProfile,
    updateAccountPublicProfile,
    type AccountBusinessLegal,
    type PublicProfileVertical,
} from '@simple/utils';
import type { EditablePublicProfile } from '@simple/utils';
import {
    getOperatorSubtypes,
    hasOperatorBrandMedia,
    requiresOperatorSubtype,
    requiresOperatorSubtypeCustom,
    type OperatorTier,
} from '@simple/utils';
import {
    PanelBusinessPublishToggle,
    type PanelBusinessPublishStatus,
} from './panel-business-publish-toggle.js';
import {
    type PanelBusinessPublishRequirement,
} from './panel-business-publish-requirements.js';

function normalizeSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '')
        .slice(0, 80);
}

type MarketplacePublishProfile = {
    displayName?: string | null;
    slug?: string | null;
    accountKind?: string | null;
    operatorSubtype?: string | null;
    operatorSubtypeCustom?: string | null;
    coverImageUrl?: string | null;
    avatarImageUrl?: string | null;
};

function profileHasRequiredSubtype(
    vertical: PublicProfileVertical,
    profile: MarketplacePublishProfile | null,
): boolean {
    if (!profile) return false;
    const tier = (profile.accountKind ?? 'individual') as OperatorTier;
    const subtypes = getOperatorSubtypes(vertical, tier);
    if (!requiresOperatorSubtype(tier, subtypes)) return true;
    if (!profile.operatorSubtype?.trim()) return false;
    if (requiresOperatorSubtypeCustom(profile.operatorSubtype)) {
        return Boolean(profile.operatorSubtypeCustom?.trim());
    }
    return true;
}

function canPublishMarketplaceProfile(
    vertical: PublicProfileVertical,
    featureEnabled: boolean,
    profile: MarketplacePublishProfile | null,
    businessLegal: AccountBusinessLegal | null,
): boolean {
    if (!featureEnabled || !profile) return false;
    const slug = normalizeSlug(profile.slug || profile.displayName || '');
    if (!profile.displayName?.trim() || slug.length < 3) return false;
    if (!profileHasRequiredSubtype(vertical, profile)) return false;
    if (!hasOperatorBrandMedia({
        logoUrl: profile.avatarImageUrl,
        coverUrl: profile.coverImageUrl,
    })) return false;
    if (profile.accountKind === 'company') {
        return Boolean(
            businessLegal?.businessLegalName?.trim() && businessLegal?.businessTaxId?.trim(),
        );
    }
    return true;
}

function getMarketplacePublishRequirements(
    vertical: PublicProfileVertical,
    featureEnabled: boolean,
    profile: MarketplacePublishProfile | null,
    businessLegal: AccountBusinessLegal | null,
): PanelBusinessPublishRequirement[] {
    const slug = normalizeSlug(profile?.slug || profile?.displayName || '');
    const isCompany = profile?.accountKind === 'company';
    const tier = (profile?.accountKind ?? 'individual') as OperatorTier;
    const subtypes = getOperatorSubtypes(vertical, tier);
    const needsSubtype = requiresOperatorSubtype(tier, subtypes);
    const subtypeComplete = profileHasRequiredSubtype(vertical, profile);
    const legalComplete = Boolean(
        businessLegal?.businessLegalName?.trim() && businessLegal?.businessTaxId?.trim(),
    );
    return [
        {
            id: 'plan',
            label: 'Suscripción activa',
            met: featureEnabled,
            href: '/panel/mi-cuenta/suscripcion',
        },
        {
            id: 'name',
            label: 'Nombre público',
            met: Boolean(profile?.displayName?.trim()),
            href: '/panel/mi-negocio',
        },
        {
            id: 'slug',
            label: 'Enlace público (mín. 3 caracteres)',
            met: slug.length >= 3,
            href: '/panel/mi-negocio',
        },
        {
            id: 'logo',
            label: 'Logo',
            met: Boolean(profile?.avatarImageUrl?.trim()),
            href: '/panel/mi-negocio',
        },
        {
            id: 'cover',
            label: 'Portada',
            met: Boolean(profile?.coverImageUrl?.trim()),
            href: '/panel/mi-negocio',
        },
        ...(needsSubtype ? [{
            id: 'subtype',
            label: 'Negocio (giro)',
            met: subtypeComplete,
            href: '/panel/mi-negocio',
        }] : []),
        ...(isCompany ? [{
            id: 'legal',
            label: 'Datos de facturación en Suscripción',
            met: legalComplete,
            href: '/panel/mi-cuenta/suscripcion?billing=1',
        }] : []),
    ];
}

export function MarketplaceBusinessPublishToggle({ vertical }: { vertical: PublicProfileVertical }) {
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [featureEnabled, setFeatureEnabled] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [profile, setProfile] = useState<EditablePublicProfile | null>(null);
    const [businessLegal, setBusinessLegal] = useState<AccountBusinessLegal | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const [response, legal] = await Promise.all([
            fetchAccountPublicProfile(vertical),
            fetchAccountBusinessLegal(),
        ]);
        if (response?.ok) {
            setFeatureEnabled(response.featureEnabled);
            setIsPublished(response.profile.isPublished);
            setProfile(response.profile);
        } else {
            setFeatureEnabled(false);
            setIsPublished(false);
            setProfile(null);
        }
        setBusinessLegal(legal);
        setLoading(false);
    }, [vertical]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const onProfileChanged = (event: Event) => {
            const detail = (event as CustomEvent<{ vertical: PublicProfileVertical }>).detail;
            if (!detail || detail.vertical !== vertical) return;
            void load();
        };
        window.addEventListener('simple:marketplace-profile-changed', onProfileChanged);
        return () => window.removeEventListener('simple:marketplace-profile-changed', onProfileChanged);
    }, [load, vertical]);

    const canPublish = useMemo(
        () => canPublishMarketplaceProfile(vertical, featureEnabled, profile, businessLegal),
        [vertical, featureEnabled, profile, businessLegal],
    );

    const requirements = useMemo(
        () => getMarketplacePublishRequirements(vertical, featureEnabled, profile, businessLegal),
        [vertical, featureEnabled, profile, businessLegal],
    );

    const status: PanelBusinessPublishStatus = !featureEnabled
        ? 'locked'
        : !profile?.displayName?.trim()
          ? 'draft'
          : isPublished
            ? 'public'
            : canPublish
              ? 'paused'
              : 'incomplete';

    async function handleToggle(next: boolean) {
        if (!profile || !featureEnabled) return;
        if (next && !canPublish) return;

        setError(null);
        setPublishing(true);
        const previous = isPublished;
        setIsPublished(next);

        const { id: _id, userId: _userId, vertical: _vertical, publicUrl: _publicUrl, ...payload } = profile;
        const response = await updateAccountPublicProfile(vertical, {
            ...payload,
            isPublished: next,
            slug: normalizeSlug(payload.slug || payload.displayName),
        });

        setPublishing(false);
        if (!response.ok) {
            setIsPublished(previous);
            setError(('error' in response ? response.error : null) ?? 'No pudimos actualizar la visibilidad.');
            return;
        }

        setFeatureEnabled(response.featureEnabled);
        setIsPublished(response.profile.isPublished);
        setProfile(response.profile);
        window.dispatchEvent(
            new CustomEvent('simple:marketplace-publish-changed', {
                detail: {
                    vertical,
                    isPublished: response.profile.isPublished,
                    publicUrl: response.profile.publicUrl,
                },
            }),
        );
    }

    return (
        <PanelBusinessPublishToggle
            checked={isPublished}
            disabled={!featureEnabled || !profile || (!isPublished && !canPublish)}
            loading={loading || publishing}
            status={status}
            onChange={(next) => void handleToggle(next)}
            error={error}
            requirements={!isPublished ? requirements : undefined}
            switchAriaLabel={
                !featureEnabled
                    ? 'Perfil público disponible con suscripción de pago'
                    : !profile
                      ? 'Completa tu perfil público para publicar'
                      : isPublished
                        ? 'Pausar perfil público'
                        : 'Mostrar perfil público'
            }
        />
    );
}
