'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { AccountTeamManager } from '@simple/ui/panel';

export default function EquipoPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, openAuth, logout } = useAuth();

    return (
        <AccountTeamManager
            vertical="autos"
            invitationToken={searchParams.get('accept')?.trim() ?? ''}
            user={user ? { email: user.email } : null}
            openAuth={openAuth}
            logout={logout}
            navigate={(href) => router.push(href)}
            replaceRoute={(href) => router.replace(href)}
        />
    );
}
