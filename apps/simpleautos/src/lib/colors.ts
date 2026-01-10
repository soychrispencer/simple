// Lista centralizada de colores de vehículos.
// Estructura: label (lo que ve el usuario), value (valor almacenado en DB).
// Incluye opción 'Otro' para colores no listados.

export interface VehicleColorOption {
  label: string;
  value: string;
  synonyms?: string[]; // futuro: búsqueda flexible
}

// Orden prioriza colores más comunes arriba.
export const VEHICLE_COLORS: VehicleColorOption[] = [
  { label: 'Blanco', value: 'Blanco' },
  { label: 'Negro', value: 'Negro' },
  { label: 'Gris', value: 'Gris' },
  { label: 'Plata', value: 'Plata' },
  { label: 'Azul', value: 'Azul' },
  { label: 'Rojo', value: 'Rojo' },
  { label: 'Verde', value: 'Verde' },
  { label: 'Amarillo', value: 'Amarillo' },
  { label: 'Naranja', value: 'Naranja' },
  { label: 'Burdeo', value: 'Burdeo', synonyms: ['Vino'] },
  { label: 'Vino', value: 'Vino' },
  { label: 'Beige', value: 'Beige' },
  { label: 'Café', value: 'Café', synonyms: ['Marrón'] },
  { label: 'Bronce', value: 'Bronce' },
  { label: 'Dorado', value: 'Dorado' },
  { label: 'Morado', value: 'Morado', synonyms: ['Púrpura'] },
  { label: 'Fucsia', value: 'Fucsia' },
  { label: 'Turquesa', value: 'Turquesa' },
  { label: 'Celeste', value: 'Celeste' },
  { label: 'Azul Marino', value: 'Azul Marino' },
  { label: 'Verde Oliva', value: 'Verde Oliva' },
  { label: 'Verde Lima', value: 'Verde Lima' },
  { label: 'Grafito', value: 'Grafito' },
  { label: 'Titanio', value: 'Titanio' },
  { label: 'Champagne', value: 'Champagne' },
  { label: 'Perlado', value: 'Perlado' },
  { label: 'Mate Negro', value: 'Mate Negro' },
  { label: 'Mate Gris', value: 'Mate Gris' },
  { label: 'Camuflaje', value: 'Camuflaje' },
  { label: 'Bicolor', value: 'Bicolor' },
  // Nuevos colores ampliados
  { label: 'Antracita', value: 'Antracita' },
  { label: 'Carbono', value: 'Carbono' },
  { label: 'Arena', value: 'Arena' },
  { label: 'Marfil', value: 'Marfil' },
  { label: 'Crema', value: 'Crema' },
  { label: 'Azul Eléctrico', value: 'Azul Eléctrico' },
  { label: 'Granate', value: 'Granate' },
  { label: 'Rubí', value: 'Rubí' },
  { label: 'Esmeralda', value: 'Esmeralda' },
  { label: 'Zafiro', value: 'Zafiro' },
  { label: 'Coral', value: 'Coral' },
  { label: 'Rosado', value: 'Rosado' },
  { label: 'Magenta', value: 'Magenta' },
  { label: 'Cian', value: 'Cian' },
  { label: 'Peltre', value: 'Peltre' },
  { label: 'Hielo', value: 'Hielo' },
  { label: 'Sin especificar', value: 'generic' },
];

export function getColorOptions(withPlaceholder = true) {
  const base = VEHICLE_COLORS.map(c => ({ label: c.label, value: c.value }));
  return withPlaceholder ? [{ label: 'Color', value: '' }, ...base] : base;
}

// Mapa aproximado de colores a hexcodes (visualización)
export const VEHICLE_COLOR_HEX: Record<string, string> = {
  'Blanco': '#ffffff',
  'Negro': '#000000',
  'Gris': '#808080',
  'Plata': '#C0C0C0',
  'Azul': '#1E3A8A',
  'Azul Marino': '#0B2545',
  'Celeste': '#6EC1E4',
  'Rojo': '#B91C1C',
  'Burdeo': '#5A0F16',
  'Vino': '#6D0F25',
  'Verde': '#065F46',
  'Verde Oliva': '#556B2F',
  'Verde Lima': '#32CD32',
  'Amarillo': '#EAB308',
  'Naranja': '#EA580C',
  'Beige': '#D9C9A3',
  'Café': '#6B4423',
  'Bronce': '#CD7F32',
  'Dorado': '#D4AF37',
  'Morado': '#6D28D9',
  'Fucsia': '#D946EF',
  'Turquesa': '#14B8A6',
  'Grafito': '#3E3E3E',
  'Titanio': '#8E8E8E',
  'Champagne': '#F7E7CE',
  'Perlado': '#F8F7F2',
  'Mate Negro': '#111111',
  'Mate Gris': '#4B5563',
  'Camuflaje': '#556B2F',
  'Bicolor': '#999999',
  'Antracita': '#2F2F2F',
  'Carbono': '#1C1C1C',
  'Arena': '#D5C6A1',
  'Marfil': '#FFF1D6',
  'Crema': '#F5E7C6',
  'Azul Eléctrico': '#0057FF',
  'Granate': '#800000',
  'Rubí': '#9B111E',
  'Esmeralda': '#028A0F',
  'Zafiro': '#0F52BA',
  'Coral': '#FF7F50',
  'Rosado': '#FFC0CB',
  'Magenta': '#FF00FF',
  'Cian': '#00FFFF',
  'Peltre': '#708090',
  'Hielo': '#F2F6FA',
  'generic': '#999999'
};

export function getColorHex(value: string | null | undefined): string | null {
  if (!value) return null;
  return VEHICLE_COLOR_HEX[value] || null;
}



