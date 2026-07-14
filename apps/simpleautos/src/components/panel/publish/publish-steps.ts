/** Pasos del wizard de publicación Autos (4 pasos + pantalla final). */
export const AUTOS_PUBLISH_STEPS = [
    { key: '1', label: 'Multimedia', helper: 'Fotos y video' },
    { key: '2', label: 'Datos básicos', helper: 'Tipo, datos y precio' },
    { key: '3', label: 'Detalles', helper: 'Ficha completa' },
    { key: '4', label: 'Publicar', helper: 'Revisión y publicación' },
] as const;

export type AutosPublishStepKey = (typeof AUTOS_PUBLISH_STEPS)[number]['key'];
