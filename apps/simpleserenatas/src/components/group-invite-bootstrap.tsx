'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { mutate as globalMutate } from 'swr';
import { serenatasApi } from '@/lib/serenatas-api';
import { providerGroupsSwrKey } from '@/hooks/use-provider-groups';
import { consumeGroupInviteToken, persistGroupInviteToken, readGroupInviteToken } from '@/lib/group-invite-token';

/**
 * Captura ?invite= desde el enlace de correo/WhatsApp y reclama la invitación
 * con la sesión verificada. La API agrega el perfil músico al aceptar.
 */
export function GroupInviteBootstrap() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const claimingRef = useRef(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get('invite')?.trim();
        if (token) persistGroupInviteToken(token);
    }, [searchParams]);

    useEffect(() => {
        if (!user || user.status !== 'verified') return;
        const token = readGroupInviteToken();
        if (!token || claimingRef.current) return;

        let cancelled = false;
        claimingRef.current = true;

        void (async () => {
            try {
                const claimResponse = await serenatasApi.claimGroupInvite(token);
                if (!claimResponse.ok) {
                    setInviteError(claimResponse.error || 'No pudimos aceptar la invitación. Confirma que entraste con la cuenta invitada e inténtalo de nuevo.');
                    return;
                }
                setInviteError(null);
                consumeGroupInviteToken();

                if (!cancelled) {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('invite');
                    params.delete('perfil');
                    const query = params.toString();
                    router.replace(query ? `/?${query}` : '/', { scroll: false });
                }
                void Promise.all([
                    globalMutate(`serenatas-data-${user.id}`),
                    globalMutate(providerGroupsSwrKey(user.id)),
                ]).catch((error: unknown) => {
                    console.warn('[serenatas] invite accepted but panel refresh failed', error);
                });
            } catch (error) {
                console.warn('[serenatas] could not accept group invite', error);
                setInviteError('No pudimos conectar para aceptar la invitación. Vuelve a intentarlo.');
            } finally {
                claimingRef.current = false;
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, user?.status, router, searchParams]);

    if (!inviteError) return null;

    return (
        <div
            className="fixed right-4 top-20 z-[100] max-w-sm rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg"
            role="alert"
            aria-live="assertive"
        >
            {inviteError}
        </div>
    );
}
