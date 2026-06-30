'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@simple/auth';
import { serenatasApi, type Profiles } from '@/lib/serenatas-api';
import { useSerenataOptional } from '@/context/serenata-context';

/** Perfiles en panel (contexto) o fetch puntual en rutas públicas (/mariachis, /{slug}). */
export function useSerenataProfiles(): {
    profiles: Profiles | null;
    profilesReady: boolean;
} {
    const ctx = useSerenataOptional();
    const { isLoggedIn, authLoading } = useAuth();
    const [profiles, setProfiles] = useState<Profiles | null>(ctx?.profiles ?? null);
    const [profilesReady, setProfilesReady] = useState(
        Boolean(ctx?.profiles) || !isLoggedIn || authLoading,
    );

    useEffect(() => {
        if (ctx?.profiles) {
            setProfiles(ctx.profiles);
            setProfilesReady(true);
            return;
        }
        if (authLoading) return;
        if (!isLoggedIn) {
            setProfiles(null);
            setProfilesReady(true);
            return;
        }

        let cancelled = false;
        setProfilesReady(false);
        void serenatasApi.profiles().then((response) => {
            if (cancelled) return;
            setProfiles(response.ok ? response.profiles : null);
            setProfilesReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, [authLoading, ctx?.profiles, isLoggedIn]);

    return { profiles, profilesReady };
}
