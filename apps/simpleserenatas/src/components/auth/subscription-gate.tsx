'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { isPlatformLaunchActive } from '@simple/utils';
import { serenatasApi, type SerenataMePlan } from '@/lib/serenatas-api';
import Link from 'next/link';

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const [plan, setPlan] = useState<SerenataMePlan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void serenatasApi.mePlan().then((response) => {
            if (cancelled) return;
            if (response.ok) setPlan(response);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    if (isPlatformLaunchActive('serenatas')) return <>{children}</>;

    // No bloquear si está cargando o si no es una ruta de panel (aunque este gate suele estar dentro del panel)
    if (loading) return <>{children}</>;

    // El bloqueo solo aplica si subscriptionRequired es true
    const isBlocked = plan?.subscriptionRequired === true;

    // No bloquear si ya está en la pestaña de suscripción para que pueda pagar
    const isSubscriptionPage = pathname.includes('account_tab=subscription');

    if (isBlocked && !isSubscriptionPage) {
        return (
            <div className="container-app flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <IconLock size={40} />
                </div>
                <h2 className="mb-3 text-2xl font-bold text-fg">Prueba de 30 días finalizada</h2>
                <p className="mx-auto mb-8 max-w-md text-fg-muted">
                    Tu periodo de prueba ha terminado. Activa Pro para seguir gestionando tu mariachi, recibir solicitudes y aparecer en el catálogo.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/panel/mi-cuenta?account_tab=subscription">
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
