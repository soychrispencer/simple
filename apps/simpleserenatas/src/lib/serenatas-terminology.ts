/**
 * Terminología Simple Serenatas:
 * - **Dueño / Dueños**: perfil de negocio (`serenata_owners`, `profiles.owner`). Un dueño = un mariachi.
 * - **Mariachi**: marca del dueño en el marketplace (`provider_groups`).
 * - **Servicios**: paquetes que contrata el cliente (precio, duración, músicos sugeridos).
 * - **Grupos** (pestaña Mi Negocio): plantilla de músicos y equipos operativos para asignar en Solicitudes.
 */

/** Etiqueta de rol en panel (sidebar, cabecera). */
export const OWNER_ROLE_LABEL = 'Dueño';

/** Título de sección o audiencia (landing, marketing). */
export const OWNER_ROLE_LABEL_PLURAL = 'Dueños';

/** Onboarding: tarjeta de alta. */
export const OWNER_ONBOARDING_TITLE = 'Soy dueño';

/** Landing: eyebrow de bloque para dueños. */
export const OWNER_SECTION_EYEBROW = 'Para dueños de mariachi';

/** Etiqueta de campo cuando se muestra el nombre del dueño (invitaciones, detalle). */
export const OWNER_FIELD_LABEL = 'Dueño';

/** Pestaña Mi Negocio: plantilla y equipos operativos. */
export const GRUPOS_TAB_LABEL = 'Grupos';

/** @deprecated Usar `GRUPOS_TAB_LABEL`. */
export const EQUIPO_TAB_LABEL = GRUPOS_TAB_LABEL;

export const MARIACHI_LABEL = 'Mariachi';
