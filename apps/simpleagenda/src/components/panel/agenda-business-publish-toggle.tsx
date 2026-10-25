'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchAgendaAvailability,
    fetchAgendaProfile,
    fetchAgendaServices,
    hasAgendaFullAccess,
    saveAgendaProfile,
    type AgendaProfile,
} from '@/lib/agenda-api';
import {
    PanelBusinessPublishToggle,
    type PanelBusinessPublishStatus,
    type PanelBusinessPublishRequirement,
} from '@simple/ui/panel';

function canPublishAgendaProfile(
    profile: AgendaProfile | null,
    featureEnabled: boolean,
    hasService: boolean,
    hasAvailability: boolean,
): boolean {
    if (!featureEnabled || !profile) return false;
    return Boolean(
        profile.displayName?.trim()
        && profile.profession?.trim()
        && profile.slug?.trim()
        && hasService
        && hasAvailability,
    );
}

function getAgendaPublishRequirements(
    profile: AgendaProfile | null,
    featureEnabled: boolean,
    hasService: boolean,
    hasAvailability: boolean,
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
            href: '/panel/mi-negocio#agenda-public-profile',
        },
        {
            id: 'profession',
            label: 'Tu actividad',
            met: Boolean(profile?.profession?.trim()),
            href: '/panel/mi-negocio#agenda-public-profile',
        },
        {
            id: 'slug',
            label: 'Enlace público',
            met: Boolean(profile?.slug?.trim()),
            href: '/panel/mi-negocio/apariencia#agenda-public-link',
        },
        {
            id: 'service',
            label: 'Crea un servicio',
            met: hasService,
            href: '/panel/mis-servicios#agenda-first-service',
        },
        {
            id: 'availability',
            label: 'Define tu horario',
            met: hasAvailability,
            href: '/panel/mi-negocio/horarios#agenda-availability',
        },
    ];
}

export function AgendaBusinessPublishToggle() {
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [hasService, setHasService] = useState(false);
    const [hasAvailability, setHasAvailability] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [loaded, services, availability] = await Promise.all([
                fetchAgendaProfile(),
                fetchAgendaServices(),
                fetchAgendaAvailability(),
            ]);
            setProfile(loaded);
            setHasService(services.some((service) => service.isActive !== false));
            setHasAvailability(Boolean(availability.alwaysOpen) || availability.rules.some(
                (rule) => rule.isActive && Boolean(rule.startTime) && Boolean(rule.endTime),
            ));
        } catch {
            setProfile(null);
            setHasService(false);
            setHasAvailability(false);
            setLoadError('No pudimos revisar los requisitos. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const handler = () => {
            void load();
        };
        window.addEventListener('simple:agenda-profile-changed', handler);
        window.addEventListener('simple:agenda-setup-changed', handler);
        return () => {
            window.removeEventListener('simple:agenda-profile-changed', handler);
            window.removeEventListener('simple:agenda-setup-changed', handler);
        };
    }, [load]);

    const featureEnabled = profile ? hasAgendaFullAccess(profile) : false;
    const isPublished = Boolean(profile?.isPublished);
    const canPublish = useMemo(
        () => canPublishAgendaProfile(profile, featureEnabled, hasService, hasAvailability),
        [profile, featureEnabled, hasService, hasAvailability],
    );
    const requirements = useMemo(
        () => getAgendaPublishRequirements(profile, featureEnabled, hasService, hasAvailability),
        [profile, featureEnabled, hasService, hasAvailability],
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
        <div id="agenda-publish-control" className="scroll-mt-24">
            <PanelBusinessPublishToggle
                checked={isPublished}
                disabled={!profile || !featureEnabled || (!isPublished && !canPublish)}
                loading={loading || publishing}
                status={status}
                onChange={(next) => void handleToggle(next)}
                error={error ?? loadError}
                requirements={!isPublished ? requirements : undefined}
                switchAriaLabel={
                    !profile
                        ? 'Completa tu perfil público para publicar'
                        : !featureEnabled
                          ? 'Activa Pro o mantén tu prueba para publicar'
                          : !canPublish && !isPublished
                            ? 'Completa el perfil, un servicio y tu horario para publicar'
                            : isPublished
                              ? 'Pausar perfil público'
                              : 'Mostrar perfil público'
                }
            />
        </div>
    );
}
