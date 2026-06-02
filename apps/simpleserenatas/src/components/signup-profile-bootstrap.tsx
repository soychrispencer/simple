'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@simple/auth';
import { serenatasApi } from '@/lib/serenatas-api';
import { clearLegacyAppModeStorage } from '@/lib/app-mode';
import {
    clearSignupProfile,
    resolveSignupProfileForBootstrap,
} from '@/lib/signup-profile';

/** Compatibilidad: si llega una invitación con `perfil=musician`, crea el perfil músico tras verificar. */
export function SignupProfileBootstrap() {
    const { user, refreshSession } = useAuth();
    const ranRef = useRef(false);

    useEffect(() => {
        if (!user) return;
        if (user.status !== 'verified') return;

        const signupProfile = resolveSignupProfileForBootstrap();
        if (signupProfile !== 'musician') {
            if (signupProfile) clearSignupProfile();
            return;
        }
        if (ranRef.current) return;

        let cancelled = false;

        void (async () => {
            ranRef.current = true;
            let success = false;
            try {
                const response = await serenatasApi.profiles();
                if (!response.ok || cancelled) return;

                if (signupProfile === 'musician' && !response.profiles.musician) {
                    const created = await serenatasApi.saveMusicianProfile({ hasInstrument: false, hasMariachiAttire: false, workZones: [] });
                    if (!created.ok) return;
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
