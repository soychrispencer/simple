const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LEGACY_TYPE_KEYS: Record<string, string> = {
  '1': 'auto',
  '2': 'pickup',
  '3': 'moto',
  '4': 'van',
  '5': 'maquinaria',
  '6': 'camion',
  '7': 'bus',
  '8': 'suv',
  '9': 'otro',
  auto: 'auto',
  automobil: 'auto',
  automovil: 'auto',
  car: 'auto',
  cars: 'auto',
  suv: 'suv',
  jeep: 'suv',
  crossover: 'suv',
  camioneta: 'pickup',
  pickup: 'pickup',
  truck: 'camion',
  camion: 'camion',
  moto: 'moto',
  motocicleta: 'moto',
  motorcycle: 'moto',
  van: 'van',
  minivan: 'van',
  bus: 'bus',
  autobus: 'bus',
  omnibus: 'bus',
  maquinaria: 'maquinaria',
  machinery: 'maquinaria',
  excavadora: 'maquinaria',
  tractor: 'maquinaria',
  other: 'otro',
  otro: 'otro',
};

export function isUuid(value?: string | null): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

export function normalizeVehicleTypeSlug(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || isUuid(trimmed)) return undefined;
  return LEGACY_TYPE_KEYS[trimmed] || trimmed;
}

