export const AGENDA_PRICING = {
    trialDays: 30,
    proMonthlyNetClp: 9_990,
    proPlusMonthlyNetClp: 14_990,
    proAnnualMonthlyEquivalentNetClp: 7_990,
    proAnnualTotalNetClp: 95_880,
    proPlusAnnualMonthlyEquivalentNetClp: 11_992,
    proPlusAnnualTotalNetClp: 143_900,
    proAnnualDiscountPct: 20,
    free: {
        monthlyBookings: 30,
        activeServices: 3,
        activeLocations: 1,
    },
} as const;

export const AGENDA_PLAN_CATALOG = {
    free: {
        id: 'free',
        name: 'Gratis',
        availability: 'available',
        priceMonthlyNetClp: 0,
        description: 'Agenda básica para empezar y seguir recibiendo reservas después de la prueba.',
        features: [
            `Hasta ${AGENDA_PRICING.free.monthlyBookings} reservas nuevas al mes`,
            `Hasta ${AGENDA_PRICING.free.activeServices} servicios activos y ${AGENDA_PRICING.free.activeLocations} ubicación`,
            'Perfil público, link de reservas, agenda y clientes',
            'Confirmaciones por email',
            'Sin cobro automático ni comisión por reserva',
        ],
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        availability: 'available',
        priceMonthlyNetClp: AGENDA_PRICING.proMonthlyNetClp,
        description: 'Todo lo necesario para gestionar una agenda profesional completa.',
        features: [
            'Reservas, servicios y ubicaciones sin límites de uso',
            'Recordatorios automáticos por email',
            'Finanzas y control de cobros',
            'Packs, promociones y agenda avanzada',
            'Estadísticas, NPS y referidos',
            'Integraciones disponibles y sin comisión por reserva',
        ],
    },
    proPlus: {
        id: 'pro_plus',
        name: 'Pro+',
        availability: 'available',
        priceMonthlyNetClp: AGENDA_PRICING.proPlusMonthlyNetClp,
        description: 'Más automatización y comunicación para profesionales en crecimiento.',
        features: [
            'Todo lo incluido en Pro',
            'Confirmaciones, recordatorios y seguimiento por WhatsApp con consumo controlado',
            'Automatizaciones avanzadas y mensajes posteriores a la cita',
            'Campañas de reactivación y seguimiento de clientes',
            'Segmentación y herramientas avanzadas de fidelización',
            'Integraciones avanzadas y soporte prioritario',
        ],
    },
    business: {
        id: 'enterprise',
        name: 'Empresa / Negocios',
        availability: 'contact',
        priceMonthlyNetClp: null,
        description: 'Operación centralizada para consultas y equipos con varios profesionales.',
        features: [
            'Varios profesionales, agendas y consultas bajo una organización',
            'Sucursales, ubicaciones y disponibilidad centralizadas',
            'Roles y permisos para administración, recepción y profesionales',
            'Agenda compartida y coordinación de equipos',
            'Reportes consolidados por profesional y sucursal',
            'Implementación, acompañamiento y soporte para el negocio',
        ],
    },
} as const;

export function formatAgendaProMonthlyPrice(): string {
    return `$${AGENDA_PRICING.proMonthlyNetClp.toLocaleString('es-CL')} + IVA / mes`;
}

export function formatAgendaProPlusMonthlyPrice(): string {
    return `$${AGENDA_PRICING.proPlusMonthlyNetClp.toLocaleString('es-CL')} + IVA / mes`;
}

export function formatAgendaProAnnualMonthlyPrice(): string {
    return `$${AGENDA_PRICING.proAnnualMonthlyEquivalentNetClp.toLocaleString('es-CL')} + IVA / mes`;
}

export function formatAgendaProAnnualTotalPrice(): string {
    return `$${AGENDA_PRICING.proAnnualTotalNetClp.toLocaleString('es-CL')} + IVA / año`;
}

export function formatAgendaProPlusAnnualMonthlyPrice(): string {
    return `$${AGENDA_PRICING.proPlusAnnualMonthlyEquivalentNetClp.toLocaleString('es-CL')} + IVA / mes`;
}

export function formatAgendaProPlusAnnualTotalPrice(): string {
    return `$${AGENDA_PRICING.proPlusAnnualTotalNetClp.toLocaleString('es-CL')} + IVA / año`;
}
