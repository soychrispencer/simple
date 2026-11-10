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

    useEffect(() => {
        let cancelled = false;
        void fetchAgendaProfile().then((data) => {
            if (cancelled) return;
            setProfile(data);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    if (isPlatformLaunchActive('agenda')) return <>{children}</>;

    if (loading) return <>{children}</>;

    const trialActive = profile ? isAgendaTrialPeriod(profile) : false;
    const freeAccount = profile ? !hasAgendaFullAccess(profile) : false;
    if (!profile || (!trialActive && !freeAccount)) return <>{children}</>;

    const isProFeaturePage = AGENDA_PRO_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
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
                <Link href="/panel/mi-cuenta/suscripcion">
                    <PanelButton variant="primary" className="h-12 px-8">Ver plan Pro</PanelButton>
                </Link>
            </div>
        );
    }

    const daysRemaining = profile.planExpiresAt ? agendaTrialDaysRemaining(profile) : null;
    const bookingsUsed = profile.monthlyBookingsUsed ?? 0;
    const bookingsLimit = profile.monthlyBookingsLimit ?? AGENDA_PRICING.free.monthlyBookings;

    return (
        <>
            <div className="container-app pt-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-(--accent-border) bg-(--accent-subtle) p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-(--agenda-lime) text-(--agenda-green)">
                            <IconSparkles size={17} />
                        </span>
                        <div>
                            <p className="font-semibold text-(--fg)">
                                {trialActive
                                    ? `Tu prueba Pro termina en ${daysRemaining ?? AGENDA_PRICING.trialDays} ${daysRemaining === 1 ? 'día' : 'días'}`
                                    : 'Tu cuenta sigue en Gratis'}
                            </p>
                            <p className="mt-1 text-sm text-(--fg-secondary)">
                                {trialActive
                                    ? `Después podrás crear hasta ${bookingsLimit} citas nuevas al mes (las canceladas también cuentan), usar ${AGENDA_PRICING.free.activeServices} servicios y ${AGENDA_PRICING.free.activeLocations} ubicación. No hay cobro automático.`
                                    : `Este mes: ${bookingsUsed} de ${bookingsLimit} citas creadas. Las canceladas también cuentan; tu perfil y tus datos siguen disponibles.`}
                            </p>
                        </div>
                    </div>
                    <Link href="/panel/mi-cuenta/suscripcion" className="shrink-0">
                        <PanelButton variant="primary" className="h-10 px-5">
                            {trialActive ? 'Ver plan Pro' : 'Activar Pro'}
                        </PanelButton>
                    </Link>
                </div>
            </div>
            {children}
        </>
    );
}
