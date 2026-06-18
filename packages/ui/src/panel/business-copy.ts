import { BUSINESS_PAYMENT_METHODS_PAGE } from './finance-copy.js';

export const BUSINESS_PAGE_DEFAULTS = {
    title: 'Mi negocio',
    ariaLabel: 'Secciones de mi negocio',
} as const;

/** Mensaje transversal: Simple es herramienta de suscripción, no intermediario de pagos ni comisiones. */
export const PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE =
    'Simple es una herramienta de suscripción. Los cobros van directo a tu cuenta; no retenemos pagos ni cobramos comisión por transacción.';

export const MARKETPLACE_PUBLIC_PROFILE_PAGE = {
    title: 'Perfil público',
    description: 'Marca, enlace y descripción.',
} as const;

export const MARKETPLACE_BUSINESS_CONTACTO_PAGE = {
    title: 'Contacto',
    description: 'Correo, teléfonos y ubicación.',
} as const;

export const MARKETPLACE_BUSINESS_REDES_PAGE = {
    title: 'Redes sociales',
    description: 'Tus perfiles en redes.',
} as const;

export const MARKETPLACE_BUSINESS_HORARIOS_PAGE = {
    title: 'Horario de atención',
    description: 'Cuándo atiendes.',
} as const;

export const MARKETPLACE_BUSINESS_EQUIPO_PAGE = {
    title: 'Equipo visible',
    description: 'Quién aparece en tu ficha.',
} as const;

export const AGENDA_BUSINESS_PERFIL_PAGE = {
    title: 'Perfil público',
    description: 'Datos visibles en tu página y el directorio.',
} as const;

/** @deprecated Usar AGENDA_BUSINESS_PERFIL_PAGE */
export const AGENDA_BUSINESS_PAGINA_PAGE = AGENDA_BUSINESS_PERFIL_PAGE;

/** @deprecated Usar AGENDA_BUSINESS_PERFIL_PAGE */
export const AGENDA_BUSINESS_DATOS_PAGE = AGENDA_BUSINESS_PERFIL_PAGE;

export const AGENDA_BUSINESS_SERVICIOS_PAGE = {
    title: 'Servicios y sesiones',
    description: 'Consultas, precios y modalidad.',
} as const;

export const AGENDA_BUSINESS_DISPONIBILIDAD_PAGE = {
    title: 'Disponibilidad',
    description: 'Horarios y bloqueos.',
} as const;

export const AGENDA_BUSINESS_COBROS_PAGE = BUSINESS_PAYMENT_METHODS_PAGE;

export const AGENDA_BUSINESS_CONFIGURACIONES_PAGE = {
    title: 'Configuraciones',
    description: 'Reservas, ubicación y reglas de agenda.',
} as const;

export const AGENDA_BUSINESS_PACKS_PAGE = {
    title: 'Packs y bonos',
    description: 'Sesiones en pack con precio especial.',
} as const;

export const AGENDA_BUSINESS_PROMOCIONES_PAGE = {
    title: 'Promociones',
    description: 'Descuentos y cupones.',
} as const;

export const AGENDA_BUSINESS_GRUPALES_PAGE = {
    title: 'Sesiones grupales',
    description: 'Talleres y grupos con cupo.',
} as const;

export const AGENDA_BUSINESS_DOMINIO_PAGE = {
    title: 'Dominio personalizado',
    description: 'Tu dominio para reservas.',
} as const;

export const SERENATAS_BUSINESS_DATOS_PAGE = {
    title: 'Perfil público',
    description: 'Marca y datos de tu mariachi.',
} as const;

export const SERENATAS_BUSINESS_SERVICIOS_PAGE = {
    title: 'Servicios',
    description: 'Paquetes y precios.',
} as const;

export const SERENATAS_BUSINESS_DISPONIBILIDAD_PAGE = {
    title: 'Disponibilidad',
    description: 'Horarios y bloqueos.',
} as const;

export const SERENATAS_BUSINESS_REPERTORIO_PAGE = {
    title: 'Repertorio',
    description: 'Canciones disponibles.',
} as const;

export const SERENATAS_BUSINESS_GRUPOS_PAGE = {
    title: 'Grupos',
    description: 'Músicos y roles.',
} as const;

export const SERENATAS_BUSINESS_CONFIGURACIONES_PAGE = {
    title: 'Configuraciones',
    description: 'Reservas y preferencias.',
} as const;

export type SerenatasBusinessTabKey =
    | 'datos'
    | 'servicios'
    | 'disponibilidad'
    | 'medios-pago'
    | 'repertorio'
    | 'grupos'
    | 'configuraciones';

const SERENATAS_BUSINESS_PAGE_BY_TAB = {
    datos: SERENATAS_BUSINESS_DATOS_PAGE,
    servicios: SERENATAS_BUSINESS_SERVICIOS_PAGE,
    disponibilidad: SERENATAS_BUSINESS_DISPONIBILIDAD_PAGE,
    'medios-pago': BUSINESS_PAYMENT_METHODS_PAGE,
    repertorio: SERENATAS_BUSINESS_REPERTORIO_PAGE,
    grupos: SERENATAS_BUSINESS_GRUPOS_PAGE,
    configuraciones: SERENATAS_BUSINESS_CONFIGURACIONES_PAGE,
} as const satisfies Record<SerenatasBusinessTabKey, { title: string; description: string }>;

export function resolveSerenatasBusinessPageCopy(tab: SerenatasBusinessTabKey) {
    return SERENATAS_BUSINESS_PAGE_BY_TAB[tab];
}
