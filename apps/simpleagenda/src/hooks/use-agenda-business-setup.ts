'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    isBusinessSetupComplete,
    type BusinessSetupStep,
    type PanelBillingAccess,
} from '@simple/ui/panel';
import { fetchAgendaBusinessSetupStatus } from '@/lib/business-setup';

export function useAgendaBusinessSetup(enabled = true) {
    const [steps, setSteps] = useState<BusinessSetupStep[]>([]);
    const [billing, setBilling] = useState<PanelBillingAccess | null>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [publicUrl, setPublicUrl] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!enabled) return;
        try {
            const status = await fetchAgendaBusinessSetupStatus();
            setSteps(status.steps);
            setBilling(status.billing);
            setIsPublished(status.isPublished);
            setPublicUrl(status.publicUrl);
            setDisplayName(status.displayName);
            setError(null);
        } catch {
            setError('No pudimos comprobar tu configuración. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        void reload();

        const onRefresh = () => {
            void reload();
        };

        window.addEventListener('focus', onRefresh);
        window.addEventListener('simple:agenda-profile-changed', onRefresh);
        window.addEventListener('simple:agenda-publish-changed', onRefresh);

        return () => {
            window.removeEventListener('focus', onRefresh);
            window.removeEventListener('simple:agenda-profile-changed', onRefresh);
            window.removeEventListener('simple:agenda-publish-changed', onRefresh);
        };
    }, [enabled, reload]);

    return {
        steps,
        billing,
        loading,
        error,
        isPublished,
        publicUrl,
        displayName,
        setupComplete: isBusinessSetupComplete(steps),
        reload,
    };
}
