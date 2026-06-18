'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAgendaProfile, saveAgendaProfile, type AgendaProfile } from '@/lib/agenda-api';
import { PanelBusinessPublishToggle, type PanelBusinessPublishStatus } from '@simple/ui/panel';

function canPublishAgendaProfile(profile: AgendaProfile | null): boolean {
    if (!profile) return false;
    return Boolean(profile.displayName?.trim() && profile.slug?.trim());
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

    const isPublished = Boolean(profile?.isPublished);
    const canPublish = useMemo(() => canPublishAgendaProfile(profile), [profile]);

    const status: PanelBusinessPublishStatus = !profile?.displayName?.trim()
        ? 'draft'
        : isPublished
          ? 'public'
          : canPublish
            ? 'paused'
            : 'incomplete';

    async function handleToggle(next: boolean) {
        if (!profile) return;
        if (next && !canPublish) return;

        setError(null);
        setPublishing(true);
        const previous = profile.isPublished;
        setProfile((current) => (current ? { ...current, isPublished: next } : current));

        const response = await saveAgendaProfile({ isPublished: next } as Partial<AgendaProfile>);
        setPublishing(false);

        if (!response.ok) {
            setProfile((current) => (current ? { ...current, isPublished: previous } : current));
            setError(response.error ?? 'No pudimos actualizar la visibilidad.');
            return;
        }

        window.dispatchEvent(new CustomEvent('simple:agenda-publish-changed', { detail: { isPublished: next } }));
    }

    return (
        <PanelBusinessPublishToggle
            checked={isPublished}
            disabled={!profile || (!isPublished && !canPublish)}
            loading={loading || publishing}
            status={status}
            onChange={(next) => void handleToggle(next)}
            error={error}
            switchAriaLabel={
                !profile
                    ? 'Completa tu perfil público para publicar'
                    : isPublished
                      ? 'Pausar perfil público'
                      : 'Mostrar perfil público'
            }
        />
    );
}
