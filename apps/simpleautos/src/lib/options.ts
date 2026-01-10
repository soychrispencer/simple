// ?? ARCHIVO TEMPORAL - NO USAR EN PRODUCCIÓN ??
// Este archivo contiene datos hardcodeados que deben ser reemplazados
// con consultas dinámicas a la base de datos.
//
// TODO: Migrar todas estas constantes a tablas de base de datos:
// - regiones ? tabla 'regions'
// - comunasPorRegion ? tabla 'communes' con relación a regions
// - tiposVehiculo ? tabla 'vehicle_types'
// - tiposLista ? tabla 'listing_types'
// - estados ? tabla 'vehicle_conditions'
//
// Una vez migrado, eliminar este archivo completamente.

export const regiones = [
  { id: '1', nombre: 'Región Metropolitana', value: 'rm', label: 'Región Metropolitana' },
  { id: '2', nombre: 'Valparaíso', value: 'valpo', label: 'Valparaíso' },
  { id: '3', nombre: 'Biobío', value: 'biobio', label: 'Biobío' },
  // Add more regions as needed
];

export const comunasPorRegion: Record<string, Array<{ id: string; nombre: string; value: string; label: string }>> = {
  '1': [
    { id: '1', nombre: 'Santiago', value: 'santiago', label: 'Santiago' },
    { id: '2', nombre: 'Providencia', value: 'providencia', label: 'Providencia' },
    // Add more communes as needed
  ],
  // Add more regions as needed
};

export const tiposVehiculo = [
  { id: '1', nombre: 'Automóvil', value: 'auto', label: 'Automóvil' },
  { id: '2', nombre: 'Camioneta', value: 'camioneta', label: 'Camioneta' },
  { id: '3', nombre: 'Motocicleta', value: 'moto', label: 'Motocicleta' },
  // Add more vehicle types as needed
];

export const tiposLista = [
  { id: 'venta', nombre: 'Venta', value: 'venta', label: 'Venta' },
  { id: 'arriendo', nombre: 'Arriendo', value: 'arriendo', label: 'Arriendo' },
];

export const estados = [
  { id: 'nuevo', nombre: 'Nuevo', value: 'nuevo', label: 'Nuevo' },
  { id: 'usado', nombre: 'Usado', value: 'usado', label: 'Usado' },
];

