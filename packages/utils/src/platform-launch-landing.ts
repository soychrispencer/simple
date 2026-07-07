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
    heroSubtitle: 'Citas, clientes y pagos en un solo lugar. Regístrate gratis y prueba todo durante 30 días.',
    heroCta: 'Probar 30 días gratis',
    trustPrimary: '30 días gratis',
    trustSecondary: 'Sin tarjeta',
    trustTertiary: 'Cancela cuando quieras',
    sectionEyebrow: 'Empieza hoy',
    sectionTitle: 'Regístrate gratis y pruébalo 30 días',
    sectionSubtitle:
        'Configura tu agenda, comparte tu link y recibe reservas con acceso completo. Sin tarjeta para registrarte.',
    benefits: [
        { title: '30 días completos', desc: 'Acceso a agenda, clientes, pagos y recordatorios sin restricciones.' },
        { title: 'Sin tarjeta', desc: 'Regístrate gratis. Solo pagas si decides continuar después de la prueba.' },
        { title: 'Cancela cuando quieras', desc: 'Sin permanencia ni contratos. Tus datos se mantienen guardados.' },
    ],
    sectionCta: 'Crear cuenta gratis',
    sectionFootnote: 'Sin comisión por reserva. Planes, precios y cobros los ves en tu panel cuando quieras continuar.',
    finalSubtitle: 'Regístrate gratis, prueba 30 días con todo incluido y cancela cuando quieras.',
    finalCta: 'Probar 30 días gratis',
    headerCta: 'Probar gratis',
    navSectionLabel: 'Prueba gratis',
    audienceOwnerDescription: '',
    faqs: [
        { q: '¿La prueba es gratis?', a: 'Sí. Al crear tu cuenta tienes 30 días para probar todas las funciones, sin tarjeta de crédito.' },
        { q: '¿Necesito pagar para empezar?', a: 'No. El registro es gratuito y la prueba incluye acceso completo. Los planes y precios los ves en tu panel cuando quieras continuar.' },
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
