'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@simple/auth';
import { serenatasApi } from '@/lib/serenatas-api';
import { clearLegacyAppModeStorage } from '@/lib/app-mode';
import { applyOwnerSignupDrafts } from '@/lib/owner-signup-bootstrap';
import { clearSignupProfile, resolveSignupProfileForBootstrap } from '@/lib/signup-profile';

/**
 * Tras el registro, crea solo el perfil elegido (cliente, músico o dueño de grupo).
 * Cada cuenta queda con un solo tipo de perfil (cliente, músico o dueño).
 */
export function SignupProfileBootstrap() {
    const { user, refreshSession } = useAuth();
    const ranRef = useRef(false);

    useEffect(() => {
        if (!user) return;
        if (user.status !== 'verified') return;

        const signupProfile = resolveSignupProfileForBootstrap();
        if (!signupProfile) return;
        if (ranRef.current) return;

        let cancelled = false;

        void (async () => {
            ranRef.current = true;
            let success = false;
            try {
                const response = await serenatasApi.profiles();
                if (!response.ok || cancelled) return;

                if (signupProfile === 'client' && !response.profiles.client) {
                    if (response.profiles.owner || response.profiles.musician) {
                        clearSignupProfile();
                        return;
                    }
                    const created = await serenatasApi.saveClientProfile({});
                    if (!created.ok) return;
                } else if (signupProfile === 'musician' && !response.profiles.musician) {
                    const created = await serenatasApi.saveMusicianProfile({ hasInstrument: false, hasMariachiAttire: false, workZones: [] });
                    if (!created.ok) return;
                } else if (signupProfile === 'owner') {
                    if (response.profiles.client && !response.profiles.owner) {
                        clearSignupProfile();
                        return;
                    }
                    if (!response.profiles.owner) {
                        const created = await serenatasApi.registerOwner();
                        if (!created.ok) return;
                    }
                    await applyOwnerSignupDrafts({ refreshSession });
                }

                clearLegacyAppModeStorage();
                success = true;
            } finally {
                if (cancelled) {
                    // El efecto fue desmontado; no actualizamos storage ni refs.
                } else if (success) {
                    clearSignupProfile();
                } else {
                    ranRef.current = false;
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, user?.status, refreshSession]);

    return null;
}
