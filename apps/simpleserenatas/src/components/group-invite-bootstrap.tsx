'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { mutate as globalMutate } from 'swr';
import { serenatasApi } from '@/lib/serenatas-api';
import { consumeGroupInviteToken, persistGroupInviteToken, readGroupInviteToken } from '@/lib/group-invite-token';
import { persistSignupProfile } from '@/lib/signup-profile';

/**
 * Captura ?invite= desde el enlace de correo/WhatsApp y reclama la invitación
 * cuando el músico ya tiene perfil y sesión verificada.
 */
export function GroupInviteBootstrap() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const claimingRef = useRef(false);

    useEffect(() => {
        const token = searchParams.get('invite')?.trim();
        if (token) persistGroupInviteToken(token);
        const perfil = searchParams.get('perfil')?.trim().toLowerCase();
        if (perfil === 'musician') persistSignupProfile('musician');
    }, [searchParams]);

    useEffect(() => {
        if (!user || user.status !== 'verified') return;
        const token = readGroupInviteToken();
        if (!token || claimingRef.current) return;

        let cancelled = false;

        void (async () => {
            const profilesResponse = await serenatasApi.profiles();
            if (cancelled || !profilesResponse.ok || !profilesResponse.profiles.musician) return;

            claimingRef.current = true;
            const claimResponse = await serenatasApi.claimGroupInvite(token);
            consumeGroupInviteToken();

            if (!cancelled && claimResponse.ok) {
                await globalMutate((key) => typeof key === 'string' && key.startsWith('serenatas-data-'));
            }

            if (!cancelled) {
                const params = new URLSearchParams(searchParams.toString());
                if (params.has('invite') || params.has('perfil')) {
                    params.delete('invite');
                    params.delete('perfil');
                    const query = params.toString();
                    router.replace(query ? `/?${query}` : '/', { scroll: false });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, user?.status, router, searchParams]);

    return null;
}
