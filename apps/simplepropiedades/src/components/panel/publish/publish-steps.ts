/** Pasos del wizard de publicación (4 pasos + pantalla final de compartir). */
export const PROPERTY_PUBLISH_STEPS = [
    { id: 'media' as const, label: 'Multimedia', helper: 'Fotos y video' },
    { id: 'basics' as const, label: 'Datos básicos', helper: 'Tipo, precio y ubicación' },
    { id: 'attributes' as const, label: 'Detalles', helper: 'Ficha completa del inmueble' },
    { id: 'publish' as const, label: 'Publicar', helper: 'Título y descripción' },
];

export type PropertyPublishStepId = (typeof PROPERTY_PUBLISH_STEPS)[number]['id'];
