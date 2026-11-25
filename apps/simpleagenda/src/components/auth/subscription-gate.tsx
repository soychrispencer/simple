'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { AGENDA_PRICING, isPlatformLaunchActive } from '@simple/utils';
import { agendaTrialDaysRemaining, fetchAgendaProfile, hasAgendaFullAccess, isAgendaTrialPeriod, type AgendaProfile } from '@/lib/agenda-api';
import Link from 'next/link';

const AGENDA_PRO_ROUTES = [
    '/panel/analytics',
    '/panel/crecimiento/referidos',
    '/panel/mi-cuenta/referidos',
    '/panel/mi-negocio/packs',
    '/panel/mi-negocio/promociones',
    '/panel/mis-servicios/packs',
    '/panel/mis-servicios/promociones',
];

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const isProFeaturePage = AGENDA_PRO_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        void (async () => {
            try {
                const data = await fetchAgendaProfile();
                if (cancelled) return;
                setProfile(data);
            } catch {
                if (cancelled) return;
                setProfile(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isProFeaturePage]);

    if (isPlatformLaunchActive('agenda')) return <>{children}</>;

    if (loading) return <>{children}</>;

    const trialActive = profile ? isAgendaTrialPeriod(profile) : false;
    const freeAccount = profile ? !hasAgendaFullAccess(profile) : false;
    if (!profile || (!trialActive && !freeAccount)) return <>{children}</>;

    if (freeAccount && isProFeaturePage) {
        return (
            <div className="container-app flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
                <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-(--accent-subtle) text-(--accent)">
                    <IconSparkles size={30} />
                </div>
                <h2 className="mb-3 text-2xl font-bold text-fg">Esta función está incluida en Pro</h2>
                <p className="mx-auto mb-7 max-w-md text-fg-muted">
                    Tu cuenta y tus datos siguen disponibles en Gratis. Activa Pro para usar estadísticas, packs, promociones, NPS y referidos.
                </p>
                <Link href="/panel/mi-negocio/plan">
                    <PanelButton variant="primary" className="h-12 px-8">Ver plan Pro</PanelButton>
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
