import { AGENDA_PRICING, formatAgendaProMonthlyPrice } from './agenda-pricing.js';
import { isPlatformLaunchActive } from './marketplace-launch.js';

export type OperatorLandingBenefit = {
    title: string;
    desc: string;
};

export type OperatorLandingCopy = {
    heroSubtitle: string;
    heroCta: string;
    trustPrimary: string;
    trustSecondary: string;
    trustTertiary: string;
    sectionEyebrow: string;
    sectionTitle: string;
    sectionSubtitle: string;
    benefits: readonly OperatorLandingBenefit[];
    sectionCta: string;
    sectionFootnote: string;
    finalSubtitle: string;
    finalCta: string;
    headerCta: string;
    navSectionLabel: string;
    audienceOwnerDescription: string;
    faqs: readonly { q: string; a: string }[];
};

const AGENDA_TRIAL: OperatorLandingCopy = {
    heroSubtitle: `Citas, clientes y pagos en un solo lugar. Crea tu cuenta gratis y prueba Pro durante ${AGENDA_PRICING.trialDays} días. Después sigues en Gratis o activas Pro por ${formatAgendaProMonthlyPrice()}. Sin tarjeta ni cobro automático.`,
    heroCta: 'Crear cuenta gratis',
    trustPrimary: `Prueba Pro ${AGENDA_PRICING.trialDays} días`,
    trustSecondary: 'Sin tarjeta',
    trustTertiary: 'Después eliges: Gratis o Pro',
    sectionEyebrow: 'Empieza gratis',
    sectionTitle: `Crea tu cuenta gratis y prueba Pro por ${AGENDA_PRICING.trialDays} días`,
    sectionSubtitle:
        `Al registrarte tienes acceso completo a Pro. Al terminar, sigues en Gratis o eliges Pro por ${formatAgendaProMonthlyPrice()}. No se realiza ningún cobro automático.`,
    benefits: [
        { title: `${AGENDA_PRICING.trialDays} días de Pro`, desc: 'Prueba la agenda, los clientes, los pagos y los recordatorios con acceso completo.' },
        { title: 'Sin tarjeta ni cobro automático', desc: 'No te pedimos tarjeta y la prueba termina sin ningún cargo.' },
        { title: 'Después sigues en Gratis', desc: `Conservas tus datos y puedes recibir ${AGENDA_PRICING.free.monthlyBookings} reservas creadas al mes (las canceladas también cuentan), con ${AGENDA_PRICING.free.activeServices} servicios y ${AGENDA_PRICING.free.activeLocations} ubicación.` },
    ],
    sectionCta: 'Crear cuenta gratis',
    sectionFootnote: `Pro cuesta ${formatAgendaProMonthlyPrice()}, solo si decides activarlo. Sin comisión de SimpleAgenda; el proveedor de pago puede cobrar sus propias tarifas.`,
    finalSubtitle: `Crea tu cuenta gratis y prueba Pro durante ${AGENDA_PRICING.trialDays} días. Después puedes seguir en Gratis o activar Pro por ${formatAgendaProMonthlyPrice()}. Sin cobro automático.`,
    finalCta: 'Crear cuenta gratis',
    headerCta: 'Crear cuenta gratis',
    navSectionLabel: 'Planes y precios',
    audienceOwnerDescription: '',
    faqs: [
        { q: '¿Cómo funciona la prueba?', a: `Al registrarte se activa Pro por ${AGENDA_PRICING.trialDays} días, sin tarjeta. Al terminar, sigues en Gratis y no se genera ningún cobro. Si quieres, puedes activar Pro por ${formatAgendaProMonthlyPrice()}.` },
        { q: '¿Qué incluye Gratis?', a: `Hasta ${AGENDA_PRICING.free.monthlyBookings} reservas creadas al mes (las canceladas también cuentan), ${AGENDA_PRICING.free.activeServices} servicios activos, ${AGENDA_PRICING.free.activeLocations} ubicación, perfil público, confirmaciones y recordatorios automáticos por email.` },
        { q: '¿Cuánto cuesta Pro?', a: `${formatAgendaProMonthlyPrice()}. Se activa solo si decides contratarlo.` },
        { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Sin permanencia. Si activas un plan después, puedes cancelarlo en cualquier momento desde tu panel.' },
        { q: '¿Mis clientes necesitan crear una cuenta?', a: 'No. Tus clientes reservan directamente desde tu perfil público sin necesidad de registrarse.' },
        { q: '¿Qué métodos de pago acepta?', a: 'Puedes configurar MercadoPago, transferencia bancaria o un link de pago personalizado para que tus clientes paguen por adelantado.' },
        { q: '¿Funciona para consultas presenciales y online?', a: 'Sí. Puedes configurar servicios presenciales, online o ambos. Cada servicio puede tener duración y precio diferente.' },
    ],
};

const AGENDA_LAUNCH: OperatorLandingCopy = {
    heroSubtitle:
        'Citas, clientes y pagos en un solo lugar. Regístrate gratis y usa todas las funciones sin costo durante el lanzamiento.',
    heroCta: 'Empezar gratis',
    trustPrimary: 'Acceso completo',
    trustSecondary: 'Sin tarjeta',
    trustTertiary: 'Período de lanzamiento',
    sectionEyebrow: 'Lanzamiento',
    sectionTitle: 'Regístrate gratis y empieza hoy',
    sectionSubtitle:
        'Configura tu agenda, comparte tu link y recibe reservas con acceso completo. Sin tarjeta para registrarte.',
    benefits: [
        { title: 'Todo incluido', desc: 'Agenda, clientes, pagos y recordatorios sin restricciones.' },
        { title: 'Sin tarjeta', desc: 'Crea tu cuenta gratis. Los planes de suscripción llegarán pronto.' },
        { title: 'Sin permanencia', desc: 'Usa la plataforma mientras dure el lanzamiento. Te avisamos antes de activar cobros.' },
    ],
    sectionCta: 'Crear cuenta gratis',
    sectionFootnote: 'Sin comisión por reserva. Los planes pagos se activarán más adelante.',
    finalSubtitle: 'Regístrate gratis y organiza tu consulta con acceso completo durante el lanzamiento.',
    finalCta: 'Empezar gratis',
    headerCta: 'Empezar gratis',
    navSectionLabel: 'Empezar gratis',
    audienceOwnerDescription: '',
    faqs: [
        { q: '¿Es gratis empezar?', a: 'Sí. Durante el lanzamiento puedes usar todas las funciones sin costo y sin tarjeta de crédito.' },
        { q: '¿Necesito pagar para empezar?', a: 'No. El registro es gratuito y el acceso es completo mientras dure el período de lanzamiento.' },
        { q: '¿Cuándo habrá planes pagos?', a: 'Te avisaremos con anticipación antes de activar suscripciones. Por ahora puedes usar todo sin límites.' },
        { q: '¿Mis clientes necesitan crear una cuenta?', a: 'No. Tus clientes reservan directamente desde tu perfil público sin necesidad de registrarse.' },
        { q: '¿Qué métodos de pago acepta?', a: 'Puedes configurar MercadoPago, transferencia bancaria o un link de pago personalizado para que tus clientes paguen por adelantado.' },
        { q: '¿Funciona para consultas presenciales y online?', a: 'Sí. Puedes configurar servicios presenciales, online o ambos. Cada servicio puede tener duración y precio diferente.' },
    ],
};

const SERENATAS_TRIAL: OperatorLandingCopy = {
    heroSubtitle: '',
    heroCta: 'Probar 30 días gratis',
    trustPrimary: '',
    trustSecondary: '',
    trustTertiary: '',
    sectionEyebrow: 'Para dueños de mariachi',
    sectionTitle: 'Regístrate gratis y pruébalo 30 días',
    sectionSubtitle:
        'Publica tu grupo, recibe solicitudes y opera tu negocio con acceso completo. Sin tarjeta para empezar.',
    benefits: [
        { title: '30 días completos', desc: 'Configura tu grupo, servicios, agenda y solicitudes sin límites.' },
        { title: 'Sin tarjeta', desc: 'Regístrate gratis. Solo pagas si decides continuar después de la prueba.' },
        { title: 'Cancela cuando quieras', desc: 'Sin permanencia. Tus datos y configuración se mantienen guardados.' },
    ],
    sectionCta: 'Probar 30 días gratis',
    sectionFootnote: 'Sin comisión por serenata. Planes, precios y cobros los ves en Mi cuenta → Suscripción.',
    finalSubtitle: '',
    finalCta: 'Probar 30 días gratis',
    headerCta: 'Probar gratis',
    navSectionLabel: 'Probar gratis',
    audienceOwnerDescription: 'Crea tu cuenta de dueño, configura tu perfil y prueba el panel completo durante 30 días.',
    faqs: [],
};

const SERENATAS_LAUNCH: OperatorLandingCopy = {
    heroSubtitle: '',
    heroCta: 'Empezar gratis',
    trustPrimary: '',
    trustSecondary: '',
    trustTertiary: '',
    sectionEyebrow: 'Lanzamiento',
    sectionTitle: 'Regístrate gratis y empieza hoy',
    sectionSubtitle:
        'Publica tu grupo, recibe solicitudes y opera tu negocio con acceso completo. Sin tarjeta para empezar.',
    benefits: [
        { title: 'Todo incluido', desc: 'Configura tu grupo, servicios, agenda y solicitudes sin límites.' },
        { title: 'Sin tarjeta', desc: 'Crea tu cuenta gratis. Los planes de suscripción llegarán pronto.' },
        { title: 'Sin permanencia', desc: 'Usa la plataforma mientras dure el lanzamiento. Te avisamos antes de activar cobros.' },
    ],
    sectionCta: 'Empezar gratis',
    sectionFootnote: 'Sin comisión por serenata. Los planes pagos se activarán más adelante.',
    finalSubtitle: '',
    finalCta: 'Empezar gratis',
    headerCta: 'Empezar gratis',
    navSectionLabel: 'Empezar gratis',
    audienceOwnerDescription:
        'Crea tu cuenta de dueño, configura tu perfil y opera con acceso completo durante el lanzamiento.',
    faqs: [],
};

export function resolveOperatorLandingCopy(vertical: 'agenda' | 'serenatas'): OperatorLandingCopy {
    const launch = isPlatformLaunchActive(vertical);
    if (vertical === 'agenda') return launch ? AGENDA_LAUNCH : AGENDA_TRIAL;
    return launch ? SERENATAS_LAUNCH : SERENATAS_TRIAL;
}
