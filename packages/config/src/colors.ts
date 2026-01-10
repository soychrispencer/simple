/**
 * Colores compartidos entre todas las verticales
 * Solo el color primario cambia por vertical
 */

export const sharedColors = {
  // Light mode core neutrals (inspiración Uber/Apple)
  lightbg: '#F8F8F8',      // Fondo neutro cálido
  lightcard: '#FFFFFF',    // Tarjetas y overlays
  lighttext: '#0C0C0C',    // Texto principal
  lightmuted: '#5B5B5B',   // Texto secundario
  lightborder: '#D8D6D2',  // Bordes suaves

  // Dark mode neutrals
  darkbg: '#0F0F10',       // Fondo casi negro
  darkcard: '#161616',     // Superficie elevada
  darktext: '#F4F4F5',     // Texto principal en dark
  darkmuted: '#9E9EA4',    // Texto secundario en dark
  darkborder: '#2A2A2F',   // Bordes en dark

  // Sistema
  accent: '#0F9D92',       // Acento institucional (feedback, links)
} as const;

export type SharedColorKey = keyof typeof sharedColors;

/**
 * Colores semánticos comunes
 */
export const semanticColors = {
  success: '#0F9D58',
  error: '#D92D20',
  warning: '#FFB020',
  info: '#0094FF',
  neutral: '#5B5B5B',
} as const;

/**
 * Obtiene un color compartido
 */
export function getSharedColor(colorKey: SharedColorKey): string {
  return sharedColors[colorKey];
}
