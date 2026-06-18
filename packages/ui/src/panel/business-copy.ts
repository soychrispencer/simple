import { BUSINESS_PAYMENT_METHODS_PAGE } from './finance-copy.js';

export const BUSINESS_PAGE_DEFAULTS = {
    title: 'Mi negocio',
    ariaLabel: 'Secciones de mi negocio',
} as const;

/** Mensaje transversal: Simple es herramienta de suscripción, no intermediario de pagos ni comisiones. */
export const PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE =
    'Simple es una herramienta de suscripción. Los cobros van directo a tu cuenta; no retenemos pagos ni cobramos comisión por transacción.';

export const MARKETPLACE_PUBLIC_PROFILE_PAGE = {
    title: 'Página pública',
    description:
        'Tu ficha en el marketplace: contacto, redes, horario e inventario visibles para quien te busque. Sin comisiones por venta ni contacto.',
} as const;

export const AGENDA_BUSINESS_PAGINA_PAGE = {
    title: 'Página pública',
    description:
        'Identidad, contacto y redes que verán tus pacientes en tu perfil y en el directorio de profesionales. Los pagos los recibes tú, sin intermediación.',
} as const;

/** @deprecated Usar AGENDA_BUSINESS_PAGINA_PAGE */
export const AGENDA_BUSINESS_DATOS_PAGE = AGENDA_BUSINESS_PAGINA_PAGE;

export const AGENDA_BUSINESS_SERVICIOS_PAGE = {
    title: 'Servicios y sesiones',
    description: 'Define consultas, precios y modalidad. Tus pacientes reservan directo desde tu página pública.',
} as const;

export const AGENDA_BUSINESS_DISPONIBILIDAD_PAGE = {
    title: 'Disponibilidad',
    description: 'Horarios de atención y bloqueos. Se usan al agendar en tu perfil público.',
} as const;

export const AGENDA_BUSINESS_COBROS_PAGE = BUSINESS_PAYMENT_METHODS_PAGE;

export const AGENDA_BUSINESS_CONFIGURACIONES_PAGE = {
    title: 'Configuraciones',
    description:
        'Reservas en línea, ubicación en el marketplace, reglas de agenda y publicación de tu página.',
} as const;

export const AGENDA_BUSINESS_PACKS_PAGE = {
    title: 'Packs y bonos',
    description: 'Vende varias sesiones juntas con un precio especial. Los pacientes agendan cuando quieran usarlas.',
} as const;

export const AGENDA_BUSINESS_PROMOCIONES_PAGE = {
    title: 'Promociones',
    description: 'Crea descuentos por tiempo limitado o cupones para compartir con tus pacientes.',
} as const;

export const AGENDA_BUSINESS_GRUPALES_PAGE = {
    title: 'Sesiones grupales',
    description: 'Talleres y grupos con cupo limitado. Un solo horario, varios participantes.',
} as const;

export const AGENDA_BUSINESS_DOMINIO_PAGE = {
    title: 'Dominio personalizado',
    description: 'Usa tu propio dominio para la página de reservas.',
} as const;
