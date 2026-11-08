'use client';

import { useAgendaSignup, type AgendaCtaLocation } from './use-agenda-signup';

type AgendaCtaProps = {
    location: AgendaCtaLocation;
    className?: string;
};

/** Botón de registro de la portada; isla de cliente con el texto según sesión. */
export function AgendaCta({ location, className }: AgendaCtaProps) {
    const { label, start } = useAgendaSignup();

    return (
        <button type="button" onClick={() => start(location)} className={className}>
            {label}
        </button>
    );
}

type PlanCtaProps = {
    plan: 'pro' | 'pro_plus' | 'gratis';
    billingCycle?: 'monthly' | 'annual';
    className?: string;
};

/** Botón de cada plan; el texto y el destino dependen de la sesión. */
export function PlanCta({ plan, billingCycle = 'monthly', className }: PlanCtaProps) {
    const { isLoggedIn, label, startPlan } = useAgendaSignup();
    const text = plan === 'pro'
        ? `Contratar Pro${billingCycle === 'annual' ? ' anual' : ''}`
        : plan === 'pro_plus'
            ? `Contratar Pro+${billingCycle === 'annual' ? ' anual' : ''}`
            : label;

    return (
        <button type="button" onClick={() => startPlan(plan, billingCycle)} className={className}>
            {text}
        </button>
    );
}
