'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { track } from '@/lib/analytics';

export type AgendaCtaLocation = 'hero' | 'cierre' | 'demo' | 'sticky' | 'plan_pro' | 'plan_gratis';

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

    const startPlan = (plan: 'pro' | 'pro_plus' | 'gratis', billingCycle: 'monthly' | 'annual' = 'monthly') => {
        track('landing_cta_click', { location: `plan_${plan}`, loggedIn: isLoggedIn });

        if (isLoggedIn) {
            router.push(plan === 'gratis'
                ? '/panel'
                : `/panel/mi-cuenta/suscripcion?plan=${plan}&billingCycle=${billingCycle}`);
            return;
        }

        openAuth('register');
    };

    return {
        isLoggedIn,
        label: isLoggedIn ? 'Abrir mi agenda' : 'Regístrate gratis',
        start,
        startPlan,
    };
}
