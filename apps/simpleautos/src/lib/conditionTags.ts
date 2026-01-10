// Fuente central de etiquetas complementarias de condición de vehículo.
// code: identificador interno estable; label: texto UI español.
// Futuro: se puede agregar categoría para agrupar visualmente.

export interface ConditionTagDef { code: string; label: string; }

export const CONDITION_TAGS: ConditionTagDef[] = [
  // Historial del vehículo (hechos verificables) — versión depurada
  { code: 'one-owner', label: 'Un dueño' },
  { code: 'recent-maintenance', label: 'Mantenciones al día' },
  { code: 'papers-ok', label: 'Papeles al día' },
  { code: 'tech-inspection', label: 'Revisión técnica al día' },
  { code: 'warranty', label: 'Garantía vigente' },
  { code: 'invoice', label: 'Factura' },
  { code: 'original-manual', label: 'Manual original' },
  { code: 'no-accidents', label: 'Sin siniestros (declarado)' },
  { code: 'minor-accident', label: 'Siniestro leve (declarado)' },
  { code: 'major-accident', label: 'Siniestro grave (declarado)' },
  { code: 'original-paint', label: 'Pintura original (declarado)' },
  { code: 'imported', label: 'Importado' },
  { code: 'collectible', label: 'Colección' },
  { code: 'luxury', label: 'Lujo' },
  { code: 'premium', label: 'Premium' },
  // Nota: '(declarado)' indica que es autorreportado, no verificado por sistema.
];

// NOTA: Se removieron etiquetas comerciales (precio_negociable, etc.) y redundancias con Estado (restaurado, 0 km).


