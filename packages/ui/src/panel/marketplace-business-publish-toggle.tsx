'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchAccountPublicProfile,
    updateAccountPublicProfile,
    type PublicProfileVertical,
} from '@simple/utils';
import type { EditablePublicProfile } from '@simple/utils';
import { PanelBusinessPublishToggle, type PanelBusinessPublishStatus } from './panel-business-publish-toggle.js';

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

function canPublishMarketplaceProfile(
    featureEnabled: boolean,
    profile: { displayName?: string | null; slug?: string | null } | null,
): boolean {
    if (!featureEnabled || !profile) return false;
    const slug = normalizeSlug(profile.slug || profile.displayName || '');
    return Boolean(profile.displayName?.trim() && slug.length >= 3);
}

export function MarketplaceBusinessPublishToggle({ vertical }: { vertical: PublicProfileVertical }) {
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [featureEnabled, setFeatureEnabled] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [profile, setProfile] = useState<EditablePublicProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const response = await fetchAccountPublicProfile(vertical);
        if (response?.ok) {
            setFeatureEnabled(response.featureEnabled);
            setIsPublished(response.profile.isPublished);
            setProfile(response.profile);
        } else {
            setFeatureEnabled(false);
            setIsPublished(false);
            setProfile(null);
        }
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
        () => canPublishMarketplaceProfile(featureEnabled, profile),
        [featureEnabled, profile],
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
