'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAgendaProfile, hasAgendaFullAccess, saveAgendaProfile, type AgendaProfile } from '@/lib/agenda-api';
import { hasOperatorBrandMedia } from '@simple/utils';
import {
    PanelBusinessPublishToggle,
    type PanelBusinessPublishStatus,
    type PanelBusinessPublishRequirement,
} from '@simple/ui/panel';

function canPublishAgendaProfile(
    profile: AgendaProfile | null,
    featureEnabled: boolean,
): boolean {
    if (!featureEnabled || !profile) return false;
    if (!hasOperatorBrandMedia({ logoUrl: profile.avatarUrl, coverUrl: profile.coverUrl })) return false;
    return Boolean(profile.displayName?.trim() && profile.slug?.trim());
}

function getAgendaPublishRequirements(
    profile: AgendaProfile | null,
    featureEnabled: boolean,
): PanelBusinessPublishRequirement[] {
    return [
        {
            id: 'plan',
            label: 'Prueba activa o plan Pro',
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
            label: 'Enlace público',
            met: Boolean(profile?.slug?.trim()),
            href: '/panel/mi-negocio',
        },
        {
            id: 'logo',
            label: 'Logo',
            met: Boolean(profile?.avatarUrl?.trim()),
            href: '/panel/mi-negocio',
        },
        {
            id: 'cover',
            label: 'Portada',
            met: Boolean(profile?.coverUrl?.trim()),
            href: '/panel/mi-negocio',
        },
    ];
}

export function AgendaBusinessPublishToggle() {
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const loaded = await fetchAgendaProfile();
        setProfile(loaded);
        setLoading(false);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const handler = () => {
            void load();
        };
        window.addEventListener('simple:agenda-profile-changed', handler);
        return () => window.removeEventListener('simple:agenda-profile-changed', handler);
    }, [load]);

    const featureEnabled = profile ? hasAgendaFullAccess(profile) : false;
    const isPublished = Boolean(profile?.isPublished);
    const canPublish = useMemo(
        () => canPublishAgendaProfile(profile, featureEnabled),
        [profile, featureEnabled],
    );
    const requirements = useMemo(
        () => getAgendaPublishRequirements(profile, featureEnabled),
        [profile, featureEnabled],
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
        const previous = profile.isPublished ?? false;
        setProfile((current) => (current ? { ...current, isPublished: next } : current));

        const response = await saveAgendaProfile({ isPublished: next } as Partial<AgendaProfile>);
        setPublishing(false);

        if (!response.ok) {
            setProfile((current) => (current ? { ...current, isPublished: previous } : current));
            setError(response.error ?? 'No pudimos actualizar la visibilidad.');
            return;
        }

        if (response.profile) {
            setProfile(response.profile);
        }

        window.dispatchEvent(new CustomEvent('simple:agenda-publish-changed', { detail: { isPublished: next } }));
    }

    return (
        <PanelBusinessPublishToggle
            checked={isPublished}
            disabled={!profile || !featureEnabled || (!isPublished && !canPublish)}
            loading={loading || publishing}
            status={status}
            onChange={(next) => void handleToggle(next)}
            error={error}
            requirements={!isPublished ? requirements : undefined}
            switchAriaLabel={
                !profile
                    ? 'Completa tu perfil público para publicar'
                    : !featureEnabled
                      ? 'Activa Pro o mantén tu prueba para publicar'
                      : isPublished
                        ? 'Pausar perfil público'
                        : 'Mostrar perfil público'
            }
        />
    );
}
