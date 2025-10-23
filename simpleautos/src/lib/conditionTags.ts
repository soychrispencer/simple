// Fuente central de etiquetas complementarias de condición de vehículo.
// code: identificador interno estable; label: texto UI español.
// Futuro: se puede agregar categoría para agrupar visualmente.

export interface ConditionTagDef { code: string; label: string; }

export const CONDITION_TAGS: ConditionTagDef[] = [
  // Historial del vehículo (hechos verificables) – versión depurada
  { code: 'one-owner', label: 'Un dueño' },
  { code: 'recent-maintenance', label: 'Mantenciones al día' },
  { code: 'papers-ok', label: 'Papeles al día' },
  { code: 'tech-inspection', label: 'Revisión técnica al día' },
  { code: 'imported', label: 'Importado' },
  // (Excluir 'sin siniestros' porque usamos estado 'Con daño')
];

// NOTA: Se removieron etiquetas comerciales (precio_negociable, etc.) y redundancias con Estado (restaurado, colección, 0 km).
