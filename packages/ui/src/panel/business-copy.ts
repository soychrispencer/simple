import { BUSINESS_PAYMENT_METHODS_PAGE } from './finance-copy.js';

export const BUSINESS_PAGE_DEFAULTS = {
    title: 'Mi negocio',
    ariaLabel: 'Secciones de mi negocio',
} as const;

/** Mensaje transversal: Simple es herramienta de suscripción, no intermediario de pagos ni comisiones. */
export const PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE =
    'Simple es una herramienta de suscripción. Los cobros van directo a tu cuenta; no retenemos pagos ni cobramos comisión por transacción.';

/** Bloques compartidos del tab Perfil público (debajo de imágenes de marca). */
export const BUSINESS_PUBLIC_INFO_SECTION = {
    title: 'Información pública',
    description: 'Nombre público, tipo, negocio y descripción visibles en tu ficha.',
} as const;

export const OPERATOR_TYPE_FIELD = {
    label: 'Tipo',
    hint: 'Categoría con la que operas: particular, profesional o empresa.',
} as const;

export const OPERATOR_BUSINESS_FIELD = {
    label: 'Negocio',
    hint: 'Tu giro concreto: inmobiliaria, automotora, psicólogo/a, clínica, etc.',
} as const;

export const OPERATOR_BUSINESS_CUSTOM_FIELD = {
    label: 'Describe tu negocio',
    hint: 'Obligatorio si elegiste Otros.',
    placeholder: 'Ej: Perito automotriz, fonoaudióloga infantil, coworking',
} as const;

export const BUSINESS_PUBLIC_NAME_FIELD = {
    label: 'Nombre público',
} as const;

export const BUSINESS_HEADLINE_FIELD = {
    label: 'Titular',
    hint: 'Frase corta bajo tu nombre (una línea). Resume tu propuesta o especialidad.',
    placeholderMarketplaceAutos: 'Ej: Atención directa, usados seleccionados y financiamiento.',
    placeholderMarketplacePropiedades: 'Ej: Venta y arriendo con atención personalizada.',
    placeholderAgenda: 'Ej: Especialista en ansiedad y relaciones',
} as const;

export const BUSINESS_DESCRIPTION_FIELD = {
    label: 'Descripción',
    hint: 'Texto sobre ti o tu negocio: quién eres, cómo trabajas y por qué contactarte.',
    placeholderMarketplaceAutos: 'Cuenta quién eres, cómo trabajas, qué tipo de vehículos manejas y por qué un comprador debería contactarte.',
    placeholderMarketplacePropiedades: 'Cuenta quién eres, qué tipo de propiedades manejas y por qué un cliente debería contactarte.',
} as const;

export const BUSINESS_PUBLIC_CONTACT_SECTION = {
    title: 'Contacto',
    description: 'Teléfonos, correo y canales para que te contacten.',
} as const;

export const BUSINESS_PUBLIC_WHATSAPP_LINKED_HINT =
    'WhatsApp usará el mismo número que teléfono.';

export const BUSINESS_PUBLIC_LOCATION_SECTION = {
    title: 'Ubicación del negocio',
    description: 'Zona en búsquedas y tarjeta pública. La calle se configura en Direcciones; aquí defines región/comuna y si se muestra en la ficha.',
} as const;

export type BusinessTimezoneContext = 'agenda' | 'autos' | 'propiedades' | 'serenatas';

export function businessOperatingTimezoneLabel(context: BusinessTimezoneContext): string {
    switch (context) {
        case 'agenda':
            return 'Zona horaria de citas';
        case 'serenatas':
            return 'Zona horaria de serenatas';
        case 'autos':
        case 'propiedades':
            return 'Zona horaria de visitas';
        default:
            return 'Zona horaria del negocio';
    }
}

export const BUSINESS_OPERATING_TIMEZONE_HINT =
    'Se calcula según la región y comuna del negocio. Por defecto Chile (Santiago).';

export const BUSINESS_PUBLIC_PRIMARY_ADDRESS_FIELD = {
    label: 'Dirección en ficha pública',
    missingDefaultHint: 'Marca una dirección como predeterminada en',
    missingDefaultHintLink: 'Direcciones',
} as const;

export const BUSINESS_ADDRESSES_BLOCK = {
    title: 'Locales y direcciones',
    description:
        'Sucursales, consultorios, locales comerciales, bodegas, puntos de retiro y entrega. Se usan en tu perfil público y publicaciones.',
} as const;

export const MARKETPLACE_BUSINESS_DIRECCIONES_PAGE = {
    title: 'Direcciones',
    description: 'Guarda locales y puntos de atención con dirección completa. La predeterminada alimenta tu ficha pública.',
} as const;

export const AGENDA_BUSINESS_DIRECCIONES_PAGE = MARKETPLACE_BUSINESS_DIRECCIONES_PAGE;

export const AGENDA_BUSINESS_LOCATION_SECTION = BUSINESS_PUBLIC_LOCATION_SECTION;

export const AGENDA_BUSINESS_PRIMARY_ADDRESS_FIELD = BUSINESS_PUBLIC_PRIMARY_ADDRESS_FIELD;

export const SERENATAS_BUSINESS_DIRECCIONES_PAGE = MARKETPLACE_BUSINESS_DIRECCIONES_PAGE;

export const SERENATAS_BUSINESS_WORK_ZONES_SECTION = {
    title: 'Zonas de trabajo',
    description: 'Comunas adicionales donde ofreces serenatas, además de tu ubicación en el perfil.',
} as const;

export const AGENDA_BUSINESS_ADDRESSES_BLOCK = {
    title: 'Locales y direcciones',
    description: 'Sucursales, locales, bodegas y puntos de atención con dirección completa.',
} as const;

/** @deprecated Usar AGENDA_BUSINESS_ADDRESSES_BLOCK */
export const AGENDA_BUSINESS_CONSULTORIOS_BLOCK = AGENDA_BUSINESS_ADDRESSES_BLOCK;

export const BUSINESS_BRAND_IMAGES_SECTION = {
    title: 'Imágenes del negocio',
    description: 'Vista previa de tu ficha pública. Cambia la portada y el logo directamente en la tarjeta.',
} as const;

export const BUSINESS_BRAND_IMAGES_HINT =
    'Aceptamos JPG, PNG, WebP, HEIC y más (hasta 40 MB). Se optimizan automáticamente a WebP al subir. Sugerencia: portada 16:9 (1600×900 px) y logo cuadrado 512×512 px.';

export type BusinessProfileSaveSection = 'pagina' | 'datos' | 'horarios';

export function businessProfileSaveButtonLabel(section?: BusinessProfileSaveSection): string {
    switch (section) {
        case 'horarios':
            return 'Guardar horario';
        default:
            return 'Guardar cambios';
    }
}

export function businessProfileSaveSuccessMessage(section?: BusinessProfileSaveSection): string {
    switch (section) {
        case 'horarios':
            return 'Horario guardado.';
        default:
            return 'Cambios guardados.';
    }
}

export function businessBrandImageSavedMessage(kind: 'logo' | 'cover'): string {
    return kind === 'logo' ? 'Logo actualizado.' : 'Portada actualizada.';
}

export const MARKETPLACE_PUBLIC_PROFILE_PAGE = {
    title: 'Perfil público',
    description: 'Marca, contacto, ubicación y descripción visibles en tu ficha.',
} as const;

export const MARKETPLACE_MI_NEGOCIO_PRO_GATE = {
    title: 'Mi negocio requiere plan Pro',
    description:
        'Tu perfil público, contacto, horarios y redes están disponibles con Pro o Enterprise. Revisa los planes en Suscripción.',
    cta: 'Ver planes y suscripción',
} as const;

export const MARKETPLACE_SUBSCRIPTION_LAUNCH_NOTICE = {
    title: 'Planes próximamente',
    description:
        'Estamos en período de lanzamiento: todas las funciones de Simple están disponibles sin costo mientras incorporamos usuarios. Pronto activaremos los planes de suscripción.',
    badge: 'Lanzamiento',
} as const;

export const MARKETPLACE_BUSINESS_CONTACTO_PAGE = {
    title: 'Contacto',
    description: 'Teléfonos, correo, ubicación y redes sociales.',
} as const;

export const MARKETPLACE_BUSINESS_REDES_PAGE = {
    title: 'Redes sociales',
    description: 'Tus perfiles en redes.',
} as const;

export const BUSINESS_SCHEDULE_PAGE = {
    title: 'Horario',
    description: 'Días, horas de atención y bloqueos en tu calendario público.',
} as const;

export const MARKETPLACE_BUSINESS_HORARIOS_PAGE = {
    title: BUSINESS_SCHEDULE_PAGE.title,
    description: BUSINESS_SCHEDULE_PAGE.description,
} as const;

export const MARKETPLACE_BUSINESS_SERVICIOS_PAGE = {
    title: 'Servicios',
    description: 'Administra y edita tu catálogo. Para crear uno nuevo, usa Publicar.',
} as const;

export const MARKETPLACE_BUSINESS_PRODUCTOS_PAGE = {
    title: 'Productos',
    description: 'Administra y edita tu catálogo. Para crear uno nuevo, usa Publicar.',
} as const;

export const MARKETPLACE_PUBLIC_SERVICES_PAGE_COPY = {
    autos: {
        eyebrow: 'Servicios',
        title: 'Encuentra servicios cerca de ti',
        description: 'Lavado, mantención, detailing y más — ofrecidos por negocios verificados en Simple.',
        searchPlaceholder: 'Lavado, taller, detailing…',
    },
    propiedades: {
        eyebrow: 'Servicios',
        title: 'Encuentra servicios para tu propiedad',
        description: 'Aseo, mantención, mudanzas, tasaciones y más — ofrecidos por negocios verificados en Simple.',
        searchPlaceholder: 'Aseo, mudanza, tasación…',
    },
} as const satisfies Record<'autos' | 'propiedades', {
    eyebrow: string;
    title: string;
    description: string;
    searchPlaceholder: string;
}>;

export const MARKETPLACE_PUBLIC_SERVICES_CATEGORY_HINT =
    'El filtro de categoría aplica solo a servicios.';

export const MARKETPLACE_PUBLIC_PRODUCTS_PAGE_COPY = {
    autos: {
        eyebrow: 'Productos',
        title: 'Accesorios y productos automotrices',
        description: 'Cubre zócalos, protectores, stickers y más — de tiendas y talleres en Simple.',
        searchPlaceholder: 'Zócalos, stickers, protectores…',
    },
    propiedades: {
        eyebrow: 'Productos',
        title: 'Productos para tu hogar',
        description: 'Artículos y suministros ofrecidos por negocios verificados en Simple.',
        searchPlaceholder: 'Herramientas, decoración…',
    },
} as const satisfies Record<'autos' | 'propiedades', {
    eyebrow: string;
    title: string;
    description: string;
    searchPlaceholder: string;
}>;

export const MARKETPLACE_PUBLIC_PRODUCTS_CATEGORY_HINT =
    'Filtra por tipo de producto.';

/** Mensaje cuando un perfil público no tiene productos activos. */
export const PUBLIC_PROFILE_PRODUCTS_EMPTY_MESSAGE =
    'Este perfil aún no publica productos en su tienda.';

export const BUSINESS_CATALOG_EDITOR_PRODUCTS_SECTION = {
    title: 'Productos del negocio',
    description: 'Catálogo visible en tu perfil público y en la sección Productos.',
} as const;

/** Mensaje cuando un perfil público no tiene catálogo de servicios activo. */
export const PUBLIC_PROFILE_CATALOG_EMPTY_MESSAGE =
    'Este perfil aún no publica servicios, packs ni promociones.';

/** Encabezado interno opcional cuando el shell no lleva acciones propias del catálogo. */
export const BUSINESS_CATALOG_EDITOR_SECTION = {
    title: 'Servicios del negocio',
    description: 'Catálogo visible en tu perfil público y en la pestaña Servicios.',
} as const;

export const BUSINESS_SCHEDULE_EMPTY = {
    title: 'Sin horarios configurados',
    description: 'Agrega un día o carga el horario típico para empezar.',
} as const;

export const BUSINESS_BLOCKED_DAYS_SECTION = {
    title: 'Días bloqueados',
    description: 'Vacaciones, feriados o días libres sin atención.',
} as const;

export const BUSINESS_BLOCKED_DAYS_EMPTY = {
    title: 'Sin bloqueos activos',
    description: 'Todos tus horarios de la semana están disponibles.',
} as const;

export const BUSINESS_SCHEDULE_ALWAYS_OPEN_LABEL = '24/7' as const;

export const BUSINESS_WEEKLY_BREAK_SECTION = {
    title: 'Colación o pausa',
    description: 'Bloquea automáticamente este horario cada semana en los días que tengas abiertos. No se aceptan reservas en ese tramo.',
    disabledHint: 'Activa al menos un día de la semana para configurar la colación.',
} as const;

export const BUSINESS_SCHEDULE_NOTE_FIELD = {
    label: 'Nota adicional',
    placeholder: 'Ej: Atendemos por agenda previa los sábados.',
} as const;

export const BUSINESS_BOOKING_RULES_SECTION = {
    title: 'Reglas de reserva',
    description: 'Ventana de reserva, plazos de cancelación y opciones para tus clientes.',
} as const;

export const BUSINESS_BOOKING_WINDOW_FIELD = {
    label: 'Ventana de reserva (días)',
    hint: 'Cuántos días hacia adelante pueden reservar.',
} as const;

export const BUSINESS_BOOKING_CANCELLATION_FIELD = {
    label: 'Aviso de cancelación (horas)',
    hint: 'Mínimo de horas antes del evento para que el cliente pueda cancelar.',
} as const;

export const BUSINESS_BOOKING_RESPONSE_SLA_FIELD = {
    label: 'Tiempo de respuesta (horas)',
    hint: 'Plazo máximo para responder solicitudes pagadas del marketplace.',
} as const;

export const BUSINESS_BOOKING_RECURRENT_FIELD = {
    title: 'Permitir reservas recurrentes',
    description: 'Tus clientes podrán agendar varias sesiones desde tu perfil público.',
} as const;

export const BUSINESS_BOOKING_POLICIES_SECTION = {
    title: 'Políticas y condiciones',
    description: (clientLabel: string) => `El ${clientLabel} deberá leerlas y aceptarlas antes de reservar o contratar.`,
} as const;

export const BUSINESS_BOOKING_POLICIES_FIELD = {
    label: 'Texto de políticas',
    hint: 'Puedes generarlas con IA y luego editarlas a tu gusto.',
    placeholder: (clientLabel: string) => `Escribe aquí tus políticas y condiciones para tus ${clientLabel}s…`,
} as const;

export const BUSINESS_OPERATIONAL_ALERTS_SECTION = {
    title: 'Avisos operativos',
    description: 'Alertas cuando llegan solicitudes del marketplace o debes actuar en serenatas pendientes.',
} as const;

export const BUSINESS_OPERATIONAL_ALERTS_BROWSER_SUBSECTION = {
    title: 'En este navegador',
    description: 'Sonido y notificaciones del sistema mientras usas el panel. Se aplican al instante en este dispositivo.',
} as const;

export const BUSINESS_OPERATIONAL_ALERTS_EMAIL_SUBSECTION = {
    title: 'Por correo electrónico',
    description: 'Correos a tu cuenta cuando no estés en el panel. Usa Guardar cambios para aplicarlos.',
} as const;

export const BUSINESS_CONFIGURACIONES_PAGE = {
    title: 'Configuraciones',
    description: 'Preferencias operativas de tu negocio.',
} as const;

export const MARKETPLACE_BUSINESS_CONFIGURACIONES_PAGE = {
    title: 'Configuraciones',
    description: 'Medios de pago y políticas que verán tus clientes al contactarte.',
} as const;

export const AGENDA_BUSINESS_PERFIL_PAGE = {
    title: 'Perfil público',
    description: 'Datos visibles en tu página y el directorio.',
} as const;

export const AGENDA_BUSINESS_CONTACTO_PAGE = {
    title: 'Contacto',
    description: 'Teléfonos, correo, ubicación y redes sociales.',
} as const;

/** @deprecated Usar AGENDA_BUSINESS_PERFIL_PAGE */
export const AGENDA_BUSINESS_PAGINA_PAGE = AGENDA_BUSINESS_PERFIL_PAGE;

/** @deprecated Usar AGENDA_BUSINESS_PERFIL_PAGE */
export const AGENDA_BUSINESS_DATOS_PAGE = AGENDA_BUSINESS_PERFIL_PAGE;

export const AGENDA_BUSINESS_SERVICIOS_PAGE = {
    title: 'Servicios',
    description: 'Catálogo de sesiones, packs y promociones de tu negocio.',
} as const;

export const AGENDA_BUSINESS_HORARIOS_PAGE = {
    title: BUSINESS_SCHEDULE_PAGE.title,
    description: BUSINESS_SCHEDULE_PAGE.description,
} as const;

/** @deprecated Usar AGENDA_BUSINESS_HORARIOS_PAGE */
export const AGENDA_BUSINESS_DISPONIBILIDAD_PAGE = AGENDA_BUSINESS_HORARIOS_PAGE;

export const AGENDA_BUSINESS_COBROS_PAGE = BUSINESS_PAYMENT_METHODS_PAGE;

export const AGENDA_BUSINESS_CONFIGURACIONES_PAGE = {
    title: 'Configuraciones',
    description: 'Medios de pago, reglas de reserva, políticas y avisos operativos.',
} as const;

export const AGENDA_BUSINESS_PACKS_PAGE = {
    title: 'Packs y bonos',
    description: 'Sesiones en pack con precio especial.',
} as const;

export const AGENDA_BUSINESS_PROMOCIONES_PAGE = {
    title: 'Promociones',
    description: 'Descuentos y cupones.',
} as const;

export const AGENDA_BUSINESS_DOMINIO_PAGE = {
    title: 'Dominio personalizado',
    description: 'Tu dominio para reservas.',
} as const;

export const AGENDA_BUSINESS_APARIENCIA_PAGE = {
    title: 'Apariencia',
    description: 'Estilo visual de tu página pública y modo claro/oscuro.',
} as const;

export const SERENATAS_BUSINESS_DATOS_PAGE = {
    title: 'Perfil público',
    description: 'Marca y datos de tu mariachi.',
} as const;

export const SERENATAS_BUSINESS_SERVICIOS_PAGE = {
    title: 'Servicios',
    description: 'Servicios, packs y promociones visibles en tu ficha y en el marketplace.',
} as const;

export const SERENATAS_BUSINESS_HORARIOS_PAGE = {
    title: BUSINESS_SCHEDULE_PAGE.title,
    description: BUSINESS_SCHEDULE_PAGE.description,
} as const;

/** @deprecated Usar SERENATAS_BUSINESS_HORARIOS_PAGE */
export const SERENATAS_BUSINESS_DISPONIBILIDAD_PAGE = SERENATAS_BUSINESS_HORARIOS_PAGE;

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
    description: 'Medios de pago, respuesta a solicitudes, políticas y avisos operativos.',
} as const;

export const SERENATAS_BUSINESS_APARIENCIA_PAGE = {
    title: 'Apariencia',
    description: 'Personaliza el diseño y colores de tu página pública.',
} as const;

export type SerenatasBusinessTabKey =
    | 'datos'
    | 'apariencia'
    | 'direcciones'
    | 'horarios'
    | 'servicios'
    | 'repertorio'
    | 'grupos'
    | 'configuraciones';

const SERENATAS_BUSINESS_PAGE_BY_TAB = {
    datos: SERENATAS_BUSINESS_DATOS_PAGE,
    apariencia: SERENATAS_BUSINESS_APARIENCIA_PAGE,
    direcciones: SERENATAS_BUSINESS_DIRECCIONES_PAGE,
    horarios: SERENATAS_BUSINESS_HORARIOS_PAGE,
    servicios: SERENATAS_BUSINESS_SERVICIOS_PAGE,
    repertorio: SERENATAS_BUSINESS_REPERTORIO_PAGE,
    grupos: SERENATAS_BUSINESS_GRUPOS_PAGE,
    configuraciones: SERENATAS_BUSINESS_CONFIGURACIONES_PAGE,
} as const satisfies Record<SerenatasBusinessTabKey, { title: string; description: string }>;

export function resolveSerenatasBusinessPageCopy(tab: SerenatasBusinessTabKey) {
    return SERENATAS_BUSINESS_PAGE_BY_TAB[tab];
}
