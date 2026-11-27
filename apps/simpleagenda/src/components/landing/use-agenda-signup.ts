'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';
import {
    formatAgendaProAnnualTotalPrice,
    formatAgendaProMonthlyPrice,
    formatAgendaTeamsAnnualTotalPrice,
    formatAgendaTeamsMonthlyPrice,
} from '@simple/utils';
import { track } from '@/lib/analytics';

export type AgendaCtaLocation = 'hero' | 'cierre' | 'demo' | 'sticky';

const paidPlans = {
    pro: { label: 'Pro', monthly: formatAgendaProMonthlyPrice, annual: formatAgendaProAnnualTotalPrice },
    enterprise: { label: 'Negocios', monthly: formatAgendaTeamsMonthlyPrice, annual: formatAgendaTeamsAnnualTotalPrice },
};

/**
 * Estado y acciones de los CTA de la portada.
 * Es la única parte de la página que necesita sesión: el resto se renderiza en
 * el servidor y solo estas islas se hidratan.
 */
export function useAgendaSignup() {
    const { isLoggedIn, openAuth } = useAuth();
    const router = useRouter();

    const start = (location: AgendaCtaLocation) => {
        track('landing_cta_click', { location, loggedIn: isLoggedIn });

        if (isLoggedIn) {
            router.push('/panel');
            return;
        }

        openAuth('register');
    };

    const startPlan = (plan: 'pro' | 'enterprise' | 'gratis', billingCycle: 'monthly' | 'annual' = 'monthly') => {
        track('landing_cta_click', { location: `plan_${plan}`, loggedIn: isLoggedIn, billingCycle: plan === 'gratis' ? undefined : billingCycle });

        if (plan === 'gratis') {
            if (isLoggedIn) router.push('/panel');
            else openAuth('register');
            return;
        }

        const returnTo = `/panel/mi-negocio/plan?plan=${plan}&billingCycle=${billingCycle}`;
        if (isLoggedIn) {
            router.push(returnTo);
            return;
        }

        const choice = paidPlans[plan];
        openAuth('register', {
            returnTo,
            contextLabel: `${choice.label} ${billingCycle === 'annual' ? 'anual' : 'mensual'} · ${choice[billingCycle]()}`,
        });
    };

    return {
        label: isLoggedIn ? 'Abrir mi agenda' : 'Crear mi agenda gratis',
        start,
        startPlan,
    };
}
