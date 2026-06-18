'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { fetchAgendaProfile, hasAgendaFullAccess, type AgendaProfile } from '@/lib/agenda-api';
import Link from 'next/link';

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void fetchAgendaProfile().then((data) => {
            if (cancelled) return;
            setProfile(data);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    if (loading) return <>{children}</>;

    const isBlocked = profile ? !hasAgendaFullAccess(profile) : false;

    // Permitir acceso a la página de suscripción
    const isSubscriptionPage = pathname.includes('/panel/mi-cuenta/suscripcion');

    if (isBlocked && !isSubscriptionPage) {
        return (
            <div className="container-app flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <IconLock size={40} />
                </div>
                <h2 className="mb-3 text-2xl font-bold text-fg">Acceso restringido</h2>
                <p className="mx-auto mb-8 max-w-md text-fg-muted">
                    Tu periodo de prueba de 30 días ha finalizado. Activa Pro para seguir gestionando tu agenda.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/panel/mi-cuenta/suscripcion">
                        <PanelButton variant="primary" className="h-12 px-8">
                            Activar Pro
                        </PanelButton>
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
