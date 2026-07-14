/** Nav principal: ledger de ingresos del negocio (Agenda, Serenatas). */
export const FINANCE_NAV_LABEL = 'Finanzas' as const;

export const AGENDA_FINANCE_PAGE = {
    title: FINANCE_NAV_LABEL,
    description: 'Registra y controla los pagos de tus sesiones y clientes.',
} as const;

export const SERENATAS_FINANCE_PAGE = {
    title: FINANCE_NAV_LABEL,
    description: 'Resumen de ingresos, movimientos y pagos a músicos de tu mariachi.',
} as const;

/** Mi cuenta > Suscripción: facturación del plan Simple (no ingresos del negocio). */
export const SUBSCRIPTION_BILLING_HISTORY = {
    title: 'Historial de facturación',
    description: 'Órdenes de tu suscripción a Simple.',
} as const;

/** Mi negocio: cómo el dueño cobra a sus clientes. */
export const BUSINESS_PAYMENT_METHODS_PAGE = {
    title: 'Medios de pago',
    description: 'Cómo cobras a tus clientes.',
} as const;
