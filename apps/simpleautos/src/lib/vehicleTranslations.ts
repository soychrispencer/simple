// Bidirectional mappings between legacy Spanish values (UI) and new English enum keys
// NOTE: UI puede seguir mostrando español; conversión centralizada aquí.

export type BiMap = {
  toEnglish: Record<string, string>;
  toSpanish: Record<string, string>;
};

function createBiMap(pairs: [string, string][]): BiMap {
  const toEnglish: Record<string, string> = {};
  const toSpanish: Record<string, string> = {};
  for (const [es, en] of pairs) {
    toEnglish[es] = en;
    toSpanish[en] = es;
  }
  return { toEnglish, toSpanish };
}

// listing_kind (venta, arriendo, subasta)
export const listingKindMap = createBiMap([
  ["venta", "sale"],
  ["arriendo", "rent"],
  ["subasta", "auction"],
  ["todos", "all"],
]);

// condition (macro condición). Incluimos conjunto ampliado.
export const conditionMap = createBiMap([
  ["nuevo", "new"],
  ["demo", "demo"],
  ["semi-nuevo", "certified"], // Seminuevo = certificado en DB
  ["seminuevo", "certified"], // Variante sin gui�n
  ["usado", "used"],
  ["certificado", "certified"],
  ["restaurado", "restored"],
  ["siniestrado", "accident"],
  ["para-reparar", "to-repair"],
  ["para-repuestos", "parts"],
]);

// transmission (manual, automatica)
export const transmissionMap = createBiMap([
  ["manual", "manual"],
  ["automatica", "automatic"],
]);

// fuel_type (gasolina, diesel, electrico, hibrido, gas_lp, gas_natural)
export const fuelTypeMap = createBiMap([
  ["gasolina", "gasoline"],
  ["diesel", "diesel"],
  ["electrico", "electric"],
  ["hibrido", "hybrid"],
  ["gas_lp", "lpg"],
  ["gas_natural", "cng"],
]);

// drivetrain (4x2, 4x4, awd, rwd, fwd)
export const drivetrainMap = createBiMap([
  ["4x2", "4x2"],
  ["4x4", "4x4"],
  ["awd", "awd"],
  ["rwd", "rwd"],
  ["fwd", "fwd"],
]);

// visibility (normal, destacado, oculto). Incluimos alias legacy.
export const visibilityMap = createBiMap([
  ["publica", "normal"],
  ["publico", "normal"],
  ["normal", "normal"],
  ["destacada", "featured"],
  ["destacado", "featured"],
  ["borrador", "hidden"],
  ["oculto", "hidden"],
]);

// vehicle type key (auto, camioneta, suv, moto, camion, maquinaria, bus) -> currently only car subtype implemented
export const vehicleTypeKeyMap = createBiMap([
  ["auto", "car"],
  ["camioneta", "pickup"],
  ["suv", "suv"],
  ["moto", "motorcycle"],
  ["camion", "truck"],
  ["maquinaria", "machinery"],
  ["bus", "bus"],
]);

export function toEnglish(map: BiMap, value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return map.toEnglish[value] ?? value;
}

export function toSpanish(map: BiMap, value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return map.toSpanish[value] ?? value;
}

// Capitalizar primera letra
export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Traducir y capitalizar
export function translateAndCapitalize(map: BiMap, value: string | null | undefined): string {
  if (!value) return '-';
  const translated = toSpanish(map, value) ?? value;
  return capitalize(translated);
}

// Bulk helpers for objects containing known enum fields
export function normalizeVehicleInput<T extends Record<string, any>>(obj: T) {
  // Preferimos condition como campo can�nico; legacy state se mantiene s�lo si existe.
  const condition = obj.condition || (obj.state ? toEnglish(conditionMap, obj.state) : undefined);
  const normalized = {
    ...obj,
    listing_kind: toEnglish(listingKindMap, obj.listing_kind) ?? obj.listing_kind,
    condition: condition ? toEnglish(conditionMap, condition) : condition,
    transmission: toEnglish(transmissionMap, obj.transmission) ?? obj.transmission,
    fuel_type: toEnglish(fuelTypeMap, obj.fuel_type) ?? obj.fuel_type,
    drivetrain: toEnglish(drivetrainMap, obj.drivetrain) ?? obj.drivetrain,
    visibility: toEnglish(visibilityMap, obj.visibility) ?? obj.visibility,
    type_key: toEnglish(vehicleTypeKeyMap, obj.type_key) ?? obj.type_key,
  } as T & { condition?: string };
  return normalized as T;
}

export function localizeVehicleOutput<T extends Record<string, any>>(obj: T) {
  return {
    ...obj,
    listing_kind: toSpanish(listingKindMap, obj.listing_kind) ?? obj.listing_kind,
    condition: toSpanish(conditionMap, (obj as any).condition) ?? (obj as any).condition,
    transmission: toSpanish(transmissionMap, obj.transmission) ?? obj.transmission,
    fuel_type: toSpanish(fuelTypeMap, obj.fuel_type) ?? obj.fuel_type,
    drivetrain: toSpanish(drivetrainMap, obj.drivetrain) ?? obj.drivetrain,
    visibility: toSpanish(visibilityMap, obj.visibility) ?? obj.visibility,
    type_key: toSpanish(vehicleTypeKeyMap, obj.type_key) ?? obj.type_key,
  } as T;
}


