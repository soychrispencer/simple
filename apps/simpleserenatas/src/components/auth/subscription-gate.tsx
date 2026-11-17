'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { isPlatformLaunchActive } from '@simple/utils';
import { serenatasApi, type SerenataMePlan } from '@/lib/serenatas-api';
import Link from 'next/link';
import { useSerenata } from '@/context/serenata-context';

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const searchParams = useSearchParams();
    const { activeRole, authLoading, user } = useSerenata();
    const [plan, setPlan] = useState<SerenataMePlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadedPlanKey, setLoadedPlanKey] = useState<string | null>(null);
    const billingProfileType = activeRole === 'owner'
        ? 'provider'
        : activeRole === 'musician'
            ? 'musician'
            : null;
    const currentPlanKey = user?.id && billingProfileType
        ? `${user.id}:${billingProfileType}`
        : null;

    useEffect(() => {
        if (authLoading) {
            setPlan(null);
            setLoadedPlanKey(null);
            setLoading(true);
            return;
        }
        if (!billingProfileType || !currentPlanKey) {
            setPlan(null);
            setLoadedPlanKey(null);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setPlan(null);
        setLoadedPlanKey(null);
        setLoading(true);
        void serenatasApi.mePlan(billingProfileType).then((response) => {
            if (cancelled) return;
            setPlan(response.ok ? response : null);
            setLoadedPlanKey(currentPlanKey);
            setLoading(false);
        }).catch(() => {
            if (cancelled) return;
            setPlan(null);
            setLoadedPlanKey(currentPlanKey);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [authLoading, billingProfileType, currentPlanKey]);

    if (isPlatformLaunchActive('serenatas')) return <>{children}</>;

    // No bloquear si está cargando o si no es una ruta de panel (aunque este gate suele estar dentro del panel)
    if (authLoading || loading || !billingProfileType || loadedPlanKey !== currentPlanKey) return <>{children}</>;

    // El bloqueo solo aplica si subscriptionRequired es true
    const isBlocked = plan?.subscriptionRequired === true;

    // No bloquear si ya está en la pestaña de suscripción para que pueda pagar
    const isSubscriptionPage = pathname.includes('/panel/mi-cuenta')
        && searchParams.get('account_tab') === 'subscription';

    if (isBlocked && !isSubscriptionPage) {
        return (
            <div className="container-app flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <IconLock size={40} />
                </div>
                <h2 className="mb-3 text-2xl font-bold text-fg">Tu periodo de prueba terminó</h2>
                <p className="mx-auto mb-8 max-w-md text-fg-muted">
                    Activa Pro para continuar usando SimpleSerenatas con tu perfil de {activeRole === 'owner' ? 'proveedor' : 'músico'}. Puedes cambiar de perfil en el selector superior.
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
