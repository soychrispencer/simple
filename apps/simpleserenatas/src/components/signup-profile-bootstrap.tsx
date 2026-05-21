'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@simple/auth';
import { serenatasApi } from '@/lib/serenatas-api';
import { persistAppMode, type AppMode } from '@/lib/app-mode';
import { applyOwnerSignupDrafts } from '@/lib/owner-signup-bootstrap';
import { clearSignupProfile, resolveSignupProfileForBootstrap } from '@/lib/signup-profile';

/**
 * Tras el registro, crea solo el perfil elegido (cliente, músico o dueño de grupo).
 * El modo de la app queda en client | work según esa elección.
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
                    const created = await serenatasApi.saveClientProfile({});
                    if (!created.ok) return;
                } else if (signupProfile === 'musician' && !response.profiles.musician) {
                    const created = await serenatasApi.saveMusicianProfile({ hasInstrument: false, hasMariachiAttire: false, workZones: [] });
                    if (!created.ok) return;
                } else if (signupProfile === 'owner') {
                    if (!response.profiles.owner) {
                        const created = await serenatasApi.registerOwner();
                        if (!created.ok) return;
                    }
                    await applyOwnerSignupDrafts({ refreshSession });
                }

                const mode: AppMode = signupProfile === 'client' ? 'client' : 'work';
                persistAppMode(mode);
                success = true;
            } finally {
                if (cancelled) return;
                if (success) {
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
