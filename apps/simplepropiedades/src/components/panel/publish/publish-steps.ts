/** Pasos del wizard de publicación (3 pasos + pantalla final de compartir). */
export const PROPERTY_PUBLISH_STEPS = [
    { id: 'media' as const, label: 'Multimedia', helper: 'Fotos y video' },
    { id: 'basics' as const, label: 'Datos básicos', helper: 'Tipo, precio y ubicación' },
    { id: 'details' as const, label: 'Publicar', helper: 'Texto y confirmación' },
];

export type PropertyPublishStepId = (typeof PROPERTY_PUBLISH_STEPS)[number]['id'];
