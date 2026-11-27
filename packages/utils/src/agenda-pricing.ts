export const AGENDA_PRICING = {
    trialDays: 30,
    proMonthlyNetClp: 14_990,
    proPlusMonthlyNetClp: 24_990,
    proAnnualMonthlyEquivalentNetClp: 11_990,
    proAnnualTotalNetClp: 143_900,
    proPlusAnnualMonthlyEquivalentNetClp: 19_990,
    proPlusAnnualTotalNetClp: 239_900,
    proAnnualDiscountPct: 20,
    teamsMonthlyNetClp: 34_990,
    teamsAnnualMonthlyEquivalentNetClp: 27_990,
    teamsAnnualTotalNetClp: 335_900,
    teamsIncludedProfessionals: 3,
    teamsAdditionalProfessionalNetClp: 4_990,
    teamsMaxProfessionals: 20,
    teamsMonthlyWhatsappReminders: 120,
    whatsappPackSize: 100,
    whatsappPackNetClp: 3_990,
    free: {
        monthlyBookings: 30,
        activeServices: 3,
        activeLocations: 1,
        monthlyWhatsappReminders: 0,
    },
    pro: {
        monthlyWhatsappReminders: 50,
    },
    proPlus: {
        monthlyWhatsappReminders: 80,
    },
} as const;

export const AGENDA_PLAN_CATALOG = {
    free: {
        id: 'free',
        name: 'Gratis',
        availability: 'available',
        priceMonthlyNetClp: 0,
        description: 'Organiza tu agenda y recibe reservas con el plan Gratis, sin límite de tiempo.',
        features: [
            `Hasta ${AGENDA_PRICING.free.monthlyBookings} citas nuevas al mes (las canceladas también cuentan)`,
            `Hasta ${AGENDA_PRICING.free.activeServices} servicios activos y ${AGENDA_PRICING.free.activeLocations} ubicación`,
            'Perfil público, link para reservar, agenda y clientes',
            'Confirmaciones por email',
            'Recordatorios automáticos por email y manuales por WhatsApp (wa.me)',
            'Sin cobro automático ni comisión de SimpleAgenda por cita',
        ],
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        availability: 'available',
        priceMonthlyNetClp: AGENDA_PRICING.proMonthlyNetClp,
        description: 'Todo lo necesario para gestionar una agenda profesional completa, sin límites.',
        features: [
            'Citas, servicios y ubicaciones sin límites de uso',
            'Página pública personalizable + dominio propio (ej. reservas.tunegocio.cl)',
            `${AGENDA_PRICING.pro.monthlyWhatsappReminders} recordatorios automáticos por WhatsApp al mes + email ilimitado`,
            'Finanzas, Mercado Pago, packs, promociones y comprobantes PDF',
            'Estadísticas, reseñas verificadas (1–5★), referidos y reactivación de clientes',
            'Integraciones disponibles y 0% de comisión de SimpleAgenda por cita',
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
            `${AGENDA_PRICING.proPlus.monthlyWhatsappReminders} recordatorios automáticos por WhatsApp al mes`,
            'Dominio propio conectado a tu página de reservas (ej. reservas.tunegocio.cl)',
            'Lista de clientes sin una cita reciente: 30, 60 o 90 días',
            'Segmentos según última atención y próximas citas',
            'Mensajes individuales listos para WhatsApp o correo',
            'Tú eliges a quién contactar y envías cada mensaje',
        ],
    },
    business: {
        id: 'enterprise',
        name: 'Negocios',
        availability: 'available',
        priceMonthlyNetClp: 34_990,
        description: 'Para clínicas, centros y estudios con varios especialistas bajo una misma página pública de reservas.',
        features: [
            'Todo lo incluido en Pro para cada profesional del centro',
            '3 profesionales incluidos (+$4.990 + IVA/mes por adicional, hasta 20)',
            'Página pública única con selector de profesional y primer disponible',
            `${AGENDA_PRICING.teamsMonthlyWhatsappReminders} recordatorios automáticos por WhatsApp al mes + roles de recepción`,
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

export function calculateAgendaTeamsMonthlyNetClp(activeSeats: number): number {
    const extraSeats = Math.max(0, Math.floor(activeSeats) - AGENDA_PRICING.teamsIncludedProfessionals);
    return AGENDA_PRICING.teamsMonthlyNetClp + extraSeats * AGENDA_PRICING.teamsAdditionalProfessionalNetClp;
}

export function formatAgendaProAnnualTotalPrice(): string {
    return `$${AGENDA_PRICING.proAnnualTotalNetClp.toLocaleString('es-CL')} + IVA / año`;
}

export function formatAgendaTeamsMonthlyPrice(): string {
    return `$${AGENDA_PRICING.teamsMonthlyNetClp.toLocaleString('es-CL')} + IVA / mes`;
}

export function formatAgendaTeamsAnnualTotalPrice(): string {
    return `$${AGENDA_PRICING.teamsAnnualTotalNetClp.toLocaleString('es-CL')} + IVA / año`;
}

export function formatAgendaProPlusAnnualMonthlyPrice(): string {
    return `$${AGENDA_PRICING.proPlusAnnualMonthlyEquivalentNetClp.toLocaleString('es-CL')} + IVA / mes`;
}

export function formatAgendaProPlusAnnualTotalPrice(): string {
    return `$${AGENDA_PRICING.proPlusAnnualTotalNetClp.toLocaleString('es-CL')} + IVA / año`;
}
