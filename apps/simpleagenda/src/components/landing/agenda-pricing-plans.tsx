'use client';

import { useState } from 'react';
import { IconCheck } from '@tabler/icons-react';
import {
    AGENDA_PLAN_CATALOG,
    AGENDA_PRICING,
    formatAgendaProAnnualMonthlyPrice,
    formatAgendaProPlusAnnualMonthlyPrice,
} from '@simple/utils';
import { PlanCta } from './agenda-cta';

type BillingCycle = 'monthly' | 'annual';

export function AgendaPricingPlans() {
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const annual = billingCycle === 'annual';

    const plans = [
        {
            id: 'free',
            name: AGENDA_PLAN_CATALOG.free.name,
            price: '$0',
            priceDetail: '/ mes',
            annualDetail: null,
            description: 'Para empezar a recibir reservas sin costo.',
            lead: AGENDA_PLAN_CATALOG.free.features[0],
            features: AGENDA_PLAN_CATALOG.free.features.slice(1),
            action: 'gratis' as const,
        },
        {
            id: 'pro',
            name: AGENDA_PLAN_CATALOG.pro.name,
            price: annual ? `$${AGENDA_PRICING.proAnnualTotalNetClp.toLocaleString('es-CL')}` : `$${AGENDA_PLAN_CATALOG.pro.priceMonthlyNetClp.toLocaleString('es-CL')}`,
            priceDetail: annual ? '+ IVA / año' : '+ IVA / mes',
            annualDetail: annual ? `Equivale a ${formatAgendaProAnnualMonthlyPrice()}. Ahorra ${AGENDA_PRICING.proAnnualDiscountPct}% al pagar el año.` : null,
            description: 'Para profesionales que quieren una agenda completa y más tiempo para atender.',
            lead: 'Reservas, servicios y ubicaciones sin límites de uso',
            features: AGENDA_PLAN_CATALOG.pro.features.slice(1),
            action: 'pro' as const,
        },
        {
            id: 'pro-plus',
            name: AGENDA_PLAN_CATALOG.proPlus.name,
            price: annual ? `$${AGENDA_PRICING.proPlusAnnualTotalNetClp.toLocaleString('es-CL')}` : `$${AGENDA_PRICING.proPlusMonthlyNetClp.toLocaleString('es-CL')}`,
            priceDetail: annual ? '+ IVA / año' : '+ IVA / mes',
            annualDetail: annual ? `Equivale a ${formatAgendaProPlusAnnualMonthlyPrice()}. Ahorra ${AGENDA_PRICING.proAnnualDiscountPct}% al pagar el año.` : null,
            description: 'Para profesionales que quieren recuperar clientes y volver a llenar su agenda.',
            lead: AGENDA_PLAN_CATALOG.proPlus.features[0],
            features: AGENDA_PLAN_CATALOG.proPlus.features.slice(1),
            action: 'pro_plus' as const,
        },
    ];

    return (
        <>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-[var(--fg-secondary)]">Elige cómo pagar Pro y Pro+</p>
                <div className="inline-flex w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-1 sm:w-auto" role="group" aria-label="Frecuencia de pago">
                    <button
                        type="button"
                        aria-pressed={!annual}
                        onClick={() => setBillingCycle('monthly')}
                        className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition-colors sm:flex-none ${!annual ? 'bg-[var(--bg)] text-[var(--fg)] shadow-sm' : 'text-[var(--fg-secondary)]'}`}
                    >
                        Mensual
                    </button>
                    <button
                        type="button"
                        aria-pressed={annual}
                        onClick={() => setBillingCycle('annual')}
                        className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition-colors sm:flex-none ${annual ? 'bg-[var(--bg)] text-[var(--fg)] shadow-sm' : 'text-[var(--fg-secondary)]'}`}
                    >
                        Anual <span className="ml-1 text-[var(--agenda-lime)]">· Ahorra 20%</span>
                    </button>
                </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">
                {annual ? 'El total anual se cobra por adelantado y se renueva cada 12 meses. Los precios son netos + IVA.' : 'Los planes pagados se renuevan según el ciclo elegido. Los precios son netos + IVA.'}
            </p>

            <div className="mt-4 grid items-stretch gap-5 sm:mt-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {plans.map((plan) => {
                    const isPro = plan.action === 'pro';
                    return (
                        <article
                            key={plan.id}
                            className={`agenda-panel agenda-plan-card relative flex min-w-0 flex-col p-6 sm:p-7 ${isPro ? 'agenda-plan-featured' : ''}`}
                        >
                            <div className="agenda-plan-card__heading flex min-h-7 items-center justify-between gap-3">
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                {isPro ? (
                                    <span className="agenda-plan-featured__badge rounded-full px-2.5 py-1 text-[10px] font-bold">Recomendado</span>
                                ) : null}
                            </div>

                            <div className="agenda-plan-card__price mt-5">
                                <p className="flex min-h-11 flex-wrap items-baseline gap-x-2 gap-y-1 leading-tight">
                                    <span className="agenda-numeral text-4xl font-extrabold sm:text-5xl">{plan.price}</span>
                                    <span className="text-xs font-medium text-[var(--fg-secondary)]">{plan.priceDetail}</span>
                                </p>
                                {plan.annualDetail ? (
                                    <p className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">{plan.annualDetail}</p>
                                ) : null}
                            </div>

                            <p className="agenda-plan-card__description mt-3 text-sm leading-relaxed text-[var(--fg-secondary)]">
                                {plan.description}
                            </p>

                            <div className="mt-5 flex-1 border-t border-[var(--border)] pt-5">
                                <p className="agenda-plan-feature-lead mb-3 text-sm font-bold">{plan.lead}</p>
                                <ul className="mb-7 space-y-4 text-sm leading-relaxed text-[var(--fg-secondary)]">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2.5">
                                            <IconCheck
                                                size={16}
                                                className={`mt-0.5 shrink-0 ${isPro ? 'text-[var(--agenda-lime)]' : 'text-[var(--fg-muted)]'}`}
                                                stroke={2.5}
                                            />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <PlanCta
                                plan={plan.action}
                                billingCycle={billingCycle}
                                className={`agenda-button mt-auto min-h-11 w-full ${isPro ? '' : 'agenda-button--secondary'}`}
                            />
                        </article>
                    );
                })}
            </div>
        </>
    );
}
