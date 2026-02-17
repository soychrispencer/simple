import type { RegionCode } from './currency';

/**
 * Temas de las verticales del ecosistema Simple
 * Cada vertical tiene su color primario distintivo
 */

export const verticalThemes = {
  admin: {
    name: 'SimpleAdmin',
    primary: '#111111',
    domain: 'simpleadmin.local',
    tagline: 'Panel administrativo global',
    region: 'cl' as RegionCode,
  },
  autos: {
    name: 'SimpleAutos',
    primary: '#FF3600',
    domain: 'simpleautos.app',
    tagline: 'Compra, vende y arrienda vehículos',
    region: 'cl' as RegionCode,
  },
  properties: {
    name: 'SimplePropiedades',
    primary: '#3232FF',
    domain: 'simplepropiedades.app',
    tagline: 'Encuentra tu hogar ideal',
    region: 'cl' as RegionCode,
  },
  stores: {
    name: 'SimpleTiendas',
    primary: '#7A5CFF',
    domain: 'simpletiendas.app',
    tagline: 'Tu tienda online',
    region: 'cl' as RegionCode,
  },
  food: {
    name: 'SimpleFood',
    primary: '#FFB800',
    domain: 'simplefood.app',
    tagline: 'Delivery inteligente para restaurantes',
    region: 'cl' as RegionCode,
  },
} as const;

/**
 * Alias para compatibilidad con Footer y otros componentes
 * Estructura más detallada con color como propiedad separada
 */
export const VERTICALS = {
  admin: {
    name: 'SimpleAdmin',
    color: '#111111',
    domain: 'simpleadmin.local',
    tagline: 'Panel administrativo global',
    region: 'cl' as RegionCode,
  },
  autos: {
    name: 'SimpleAutos',
    color: '#FF3600',
    domain: 'simpleautos.app',
    tagline: 'Compra, vende y arrienda vehículos',
    region: 'cl' as RegionCode,
  },
  properties: {
    name: 'SimplePropiedades',
    color: '#3232FF',
    domain: 'simplepropiedades.app',
    tagline: 'Encuentra tu hogar ideal',
    region: 'cl' as RegionCode,
  },
  stores: {
    name: 'SimpleTiendas',
    color: '#7A5CFF',
    domain: 'simpletiendas.app',
    tagline: 'Tu tienda online',
    region: 'cl' as RegionCode,
  },
  food: {
    name: 'SimpleFood',
    color: '#FFB800',
    domain: 'simplefood.app',
    tagline: 'Delivery inteligente para restaurantes',
    region: 'cl' as RegionCode,
  },
} as const;

export type VerticalName = keyof typeof verticalThemes;
export type VerticalTheme = typeof verticalThemes[VerticalName];

/**
 * Obtiene el tema de una vertical
 */
export function getVerticalTheme(vertical: VerticalName): VerticalTheme {
  return verticalThemes[vertical];
}

/**
 * Obtiene el color primario de una vertical
 */
export function getPrimaryColor(vertical: VerticalName): string {
  return verticalThemes[vertical].primary;
}

export function getVerticalRegion(vertical: VerticalName): RegionCode {
  return verticalThemes[vertical].region as RegionCode;
}
