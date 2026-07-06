/** Pasos del wizard de publicación Autos (3 pasos + pantalla final). */
export const AUTOS_PUBLISH_STEPS = [
    { key: '1', label: 'Multimedia', helper: 'Fotos y video' },
    { key: '2', label: 'Datos básicos', helper: 'Tipo, precio y ubicación' },
    { key: '3', label: 'Publicar', helper: 'Texto y confirmación' },
] as const;

export type AutosPublishStepKey = (typeof AUTOS_PUBLISH_STEPS)[number]['key'];
