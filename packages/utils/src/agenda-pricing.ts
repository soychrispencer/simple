export const AGENDA_PRICING = {
    trialDays: 30,
    proMonthlyNetClp: 14_990,
    proPlusMonthlyNetClp: 24_990,
    proAnnualMonthlyEquivalentNetClp: 11_990,
    proAnnualTotalNetClp: 143_900,
    proPlusAnnualMonthlyEquivalentNetClp: 19_990,
    proPlusAnnualTotalNetClp: 239_900,
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
            `Hasta ${AGENDA_PRICING.free.monthlyBookings} reservas creadas al mes (incluye canceladas)`,
            `Hasta ${AGENDA_PRICING.free.activeServices} servicios activos y ${AGENDA_PRICING.free.activeLocations} ubicación`,
            'Perfil público, link de reservas, agenda y clientes',
            'Confirmaciones por email',
            'Recordatorios automáticos por email',
            'Sin cobro automático ni comisión de SimpleAgenda por reserva',
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
            'Integraciones disponibles y 0% de comisión de SimpleAgenda por reserva',
        ],
    },
    proPlus: {
        id: 'pro_plus',
        name: 'Pro+',
        availability: 'available',
        priceMonthlyNetClp: AGENDA_PRICING.proPlusMonthlyNetClp,
        description: 'Herramientas para retomar el contacto con clientes que dejaron de agendar.',
        features: [
            'Todo lo incluido en Pro',
            'Lista de clientes sin una cita reciente: 30, 60 o 90 días',
            'Segmentos según última atención y próximas reservas',
            'Mensajes individuales listos para WhatsApp o correo',
            'Tú eliges a quién contactar y envías cada mensaje',
        ],
    },
    business: {
        id: 'enterprise',
        name: 'Empresa / Negocios',
        availability: 'contact',
        priceMonthlyNetClp: null,
        description: 'Cuéntanos cómo trabaja tu equipo y te enviaremos una propuesta según tus necesidades y el alcance que podamos implementar.',
        features: [
            'Cotización para negocios con varios profesionales o sucursales',
            'Revisión de agendas, flujos y necesidades del equipo',
            'Propuesta con alcance, plazos y precio definidos',
            'Acompañamiento de puesta en marcha, según el proyecto',
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
