import { z } from 'zod';

export type SpecFieldType = 'number' | 'select' | 'boolean' | 'text';

export interface SpecFieldDescriptor {
  id: string;
  label: string;
  type: SpecFieldType;
  unit?: string;
  step?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
}

export interface SpecCategoryDescriptor {
  type_key: string; // car, motorcycle, etc.
  fields: SpecFieldDescriptor[];
  schema: any; // zod schema (lazy type)
}

// ============ CAR (vehicle_cars) ============
// Nota UX: "Carrocería" se completa en Paso 2 (Básico) y se usa en el título.
// En Paso 3 mostramos specs técnicos; por eso StepSpecsDynamic oculta body_type para autos.
const carFields: SpecFieldDescriptor[] = [
  { id: 'body_type', label: 'Carrocería', type: 'select', required: false, options: [
    { value: 'sedan', label: 'Sedán' },
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'suv', label: 'SUV' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'wagon', label: 'Station Wagon' },
    { value: 'coupe', label: 'Coupé' },
    { value: 'convertible', label: 'Convertible' },
    { value: 'van', label: 'Van' },
    { value: 'minivan', label: 'Minivan' },
    { value: 'motorhome', label: 'Motorhome' },
  ] },
  // Orden (Paso 3): Versión → Tren motriz → Dimensiones básicas → Historial
  { id: 'version', label: 'Versión', type: 'text', required: false, placeholder: 'Ej: XLT 2.0T AT / GT Line / Limited' },
  { id: 'fuel_type', label: 'Combustible', type: 'select', required: false, options: [
    { value: 'gasoline', label: 'Gasolina' },
    { value: 'diesel', label: 'Diésel' },
    { value: 'hybrid', label: 'Híbrido' },
    { value: 'electric', label: 'Eléctrico' },
    { value: 'cng', label: 'GNC' },
    { value: 'lpg', label: 'GLP' },
  ] },
  { id: 'transmission', label: 'Transmisión', type: 'select', required: false, options: [
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automática' },
    { value: 'cvt', label: 'CVT' },
    { value: 'dual_clutch', label: 'DCT (doble embrague)' },
    { value: 'other', label: 'Otra' },
  ] },
  { id: 'traction', label: 'Tracción', type: 'select', required: false, options: [
    { value: 'fwd', label: 'FWD' },
    { value: 'rwd', label: 'RWD' },
    { value: 'awd', label: 'AWD' },
    { value: '4x4', label: '4x4' },
  ] },
  { id: 'engine_displacement_cc', label: 'Cilindrada', type: 'number', unit: 'cc', step: 100, required: false, min: 0, max: 20000 },
  { id: 'engine_power_hp', label: 'Potencia', type: 'number', unit: 'hp', step: 5, required: false, min: 0, max: 5000 },
  { id: 'fuel_consumption_km_l', label: 'Consumo', type: 'number', unit: 'km/l', step: 0.1, required: false, min: 0, max: 200 },
  { id: 'doors', label: 'Puertas', type: 'number', required: false, min: 0, max: 10 },
  { id: 'seats', label: 'Asientos', type: 'number', required: false, min: 0, max: 200 },
  { id: 'owners_count', label: 'N° de dueño', type: 'number', required: false, min: 0, max: 50 },
];

// ============ MOTORCYCLE (vehicle_motorcycles) ============
// Columnas: displacement_cc, engine_type, cooling, transmission_type, fuel_type, power, torque, dry_weight
const motorcycleFields: SpecFieldDescriptor[] = [
  { id: 'displacement_cc', label: 'Cilindrada', type: 'number', unit: 'cc', required: false, min: 50, max: 2500 },
  { id: 'engine_type', label: 'Tipo motor', type: 'text', required: false },
  { id: 'cooling', label: 'Refrigeración', type: 'select', required: false, options: [
    { value: 'air', label: 'Aire' },
    { value: 'liquid', label: 'Líquida' },
    { value: 'oil', label: 'Aceite' },
  ] },
  { id: 'transmission_type', label: 'Transmisión', type: 'select', required: false, options: [
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automática' },
    { value: 'semi_automatic', label: 'Semi-automática' },
  ] },
  { id: 'fuel_type', label: 'Combustible', type: 'select', required: false, options: [
    { value: 'gasoline', label: 'Gasolina' },
    { value: 'diesel', label: 'Diésel' },
    { value: 'electric', label: 'Eléctrico' },
  ] },
  { id: 'power', label: 'Potencia', type: 'text', required: false },
  { id: 'torque', label: 'Torque', type: 'text', required: false },
  { id: 'dry_weight', label: 'Peso en seco (kg)', type: 'number', unit: 'kg', required: false, min: 20, max: 600 },
];

// ============ TRUCK (vehicle_trucks) ============
// Columnas reales: gross_weight_kg, payload_capacity_kg, axle_configuration, engine_power, fuel_type, transmission, traction, cabin_type
// Nota: axle_configuration y cabin_type se dejan como texto libre inicialmente (posibles futuras listas controladas)
const truckFields: SpecFieldDescriptor[] = [
  { id: 'gross_weight_kg', label: 'Peso bruto (kg)', type: 'number', unit: 'kg', required: false, min: 500, max: 60000 },
  { id: 'payload_capacity_kg', label: 'Carga útil (kg)', type: 'number', unit: 'kg', required: false, min: 200, max: 40000 },
  { id: 'axle_configuration', label: 'Configuración ejes', type: 'text', required: false, placeholder: 'Ej: 6x4, 4x2' },
  { id: 'engine_power', label: 'Potencia motor', type: 'text', required: false, placeholder: 'Ej: 420hp' },
  { id: 'fuel_type', label: 'Combustible', type: 'select', required: false, options: [
    { value: 'diesel', label: 'Diésel' },
    { value: 'gasoline', label: 'Gasolina' },
    { value: 'electric', label: 'Eléctrico' },
  ] },
  { id: 'transmission', label: 'Transmisión', type: 'select', required: false, options: [
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automática' },
  ] },
    { id: 'traction', label: 'Tracción', type: 'select', required: false, options: [
    { value: '4x2', label: '4x2' },
    { value: '4x4', label: '4x4' },
    { value: '6x2', label: '6x2' },
    { value: '6x4', label: '6x4' },
    { value: '8x4', label: '8x4' },
  ] },
  { id: 'cabin_type', label: 'Cabina', type: 'text', required: false, placeholder: 'Ej: Dormitorio, Simple' },
];

// ============ BUS (vehicle_buses) ============
const busFields: SpecFieldDescriptor[] = [
  { id: 'seats', label: 'Asientos', type: 'number', required: false, min: 8, max: 100 },
  { id: 'standing_capacity', label: 'Pasajeros de pie', type: 'number', required: false, min: 0, max: 120 },
  { id: 'length_m', label: 'Largo (m)', type: 'number', unit: 'm', required: false, min: 3, max: 25 },
  { id: 'engine_power', label: 'Potencia motor', type: 'text', required: false },
  { id: 'fuel_type', label: 'Combustible', type: 'select', required: false, options: [
    { value: 'diesel', label: 'Diésel' },
    { value: 'gasoline', label: 'Gasolina' },
    { value: 'electric', label: 'Eléctrico' },
  ] },
  { id: 'emission_standard', label: 'Norma emisión', type: 'text', required: false },
  { id: 'accessibility_features', label: 'Accesibilidad (lista)', type: 'text', required: false }, // se guarda como text[] en backend (split por coma)
];

// ============ MACHINERY (vehicle_machinery) ============
const machineryFields: SpecFieldDescriptor[] = [
  { id: 'category', label: 'Categoría', type: 'text', required: false },
  { id: 'operating_weight_kg', label: 'Peso operativo (kg)', type: 'number', unit: 'kg', required: false, min: 100, max: 500000 },
  { id: 'engine_power', label: 'Potencia motor', type: 'text', required: false },
  { id: 'fuel_type', label: 'Combustible', type: 'select', required: false, options: [
    { value: 'diesel', label: 'Diésel' },
    { value: 'gasoline', label: 'Gasolina' },
    { value: 'electric', label: 'Eléctrico' },
  ] },
  { id: 'lifting_capacity_kg', label: 'Capacidad izaje (kg)', type: 'number', unit: 'kg', required: false, min: 10, max: 100000 },
  { id: 'hours_used', label: 'Horas uso', type: 'number', required: false, min: 0, max: 100000 },
  { id: 'hydraulic_flow', label: 'Flujo hidráulico', type: 'text', required: false },
];

// ============ NAUTICAL (vehicle_nautical) ============
const nauticalFields: SpecFieldDescriptor[] = [
  { id: 'nautical_type', label: 'Tipo', type: 'select', required: false, options: [
    { value: 'lancha', label: 'Lancha' },
    { value: 'velero', label: 'Velero' },
    { value: 'yate', label: 'Yate' },
    { value: 'moto_agua', label: 'Moto de agua' },
    { value: 'inflable', label: 'Inflable' },
    { value: 'otro', label: 'Otro' },
  ] },
  { id: 'length_m', label: 'Eslora (m)', type: 'number', unit: 'm', required: false, min: 1, max: 80 },
  { id: 'beam_m', label: 'Manga (m)', type: 'number', unit: 'm', required: false, min: 0.5, max: 20 },
  { id: 'engine_hours', label: 'Horas de motor', type: 'number', required: false, min: 0, max: 200000 },
  { id: 'propulsion', label: 'Propulsión', type: 'select', required: false, options: [
    { value: 'fuera_borda', label: 'Fuera de borda' },
    { value: 'dentro_borda', label: 'Dentro de borda' },
    { value: 'vela', label: 'Vela' },
    { value: 'jet', label: 'Jet' },
    { value: 'electrica', label: 'Eléctrica' },
    { value: 'otra', label: 'Otra' },
  ] },
  { id: 'hull_material', label: 'Material casco', type: 'select', required: false, options: [
    { value: 'fibra', label: 'Fibra de vidrio' },
    { value: 'aluminio', label: 'Aluminio' },
    { value: 'acero', label: 'Acero' },
    { value: 'madera', label: 'Madera' },
    { value: 'otro', label: 'Otro' },
  ] },
  { id: 'passengers', label: 'Capacidad (personas)', type: 'number', required: false, min: 1, max: 200 },
  { id: 'cabins', label: 'Cabinas', type: 'number', required: false, min: 0, max: 20 },
];

// ============ AERIAL (vehicle_aerial) ============
const aerialFields: SpecFieldDescriptor[] = [
  { id: 'aerial_type', label: 'Tipo', type: 'select', required: false, options: [
    { value: 'avion', label: 'Avión' },
    { value: 'helicoptero', label: 'Helicóptero' },
    { value: 'drone', label: 'Drone' },
    { value: 'otro', label: 'Otro' },
  ] },
  { id: 'flight_hours', label: 'Horas de vuelo', type: 'number', required: false, min: 0, max: 200000 },
  { id: 'engine_count', label: 'N° de motores', type: 'number', required: false, min: 0, max: 12 },
  { id: 'registration', label: 'Matrícula', type: 'text', required: false, placeholder: 'Ej: CC-ABC' },
  { id: 'max_takeoff_weight_kg', label: 'Peso máximo despegue (kg)', type: 'number', unit: 'kg', required: false, min: 1, max: 1000000 },
  { id: 'range_km', label: 'Autonomía (km)', type: 'number', unit: 'km', required: false, min: 1, max: 30000 },
];

// Nota: Vans/pickups se consideran variantes dentro de Autos (car).

function buildSchema(fields: SpecFieldDescriptor[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    if (f.type === 'number') {
      let s: z.ZodTypeAny = z.number({ message: 'Número inválido' }).min(f.min ?? 0, 'Valor demasiado bajo');
      if (typeof f.max === 'number') s = (s as any).max(f.max, 'Valor demasiado alto');
      if (!f.required) {
        s = (s as any).optional().nullable();
      }
      shape[f.id] = s;
    } else if (f.type === 'select') {
      let s: z.ZodTypeAny = z.string().min(1, 'Selecciona una opción');
      if (!f.required) s = s.optional();
      shape[f.id] = s;
    } else if (f.type === 'boolean') {
      let s: z.ZodTypeAny = z.boolean();
      if (!f.required) s = s.optional();
      shape[f.id] = s;
    } else if (f.type === 'text') {
      let s: z.ZodTypeAny = z.string();
      if (!f.required) s = s.optional();
      shape[f.id] = s;
    }
  }
  return z.object(shape);
}

export const specCategories: Record<string, SpecCategoryDescriptor> = {
  car: { type_key: 'car', fields: carFields, schema: buildSchema(carFields) },
  motorcycle: { type_key: 'motorcycle', fields: motorcycleFields, schema: buildSchema(motorcycleFields) },
  truck: { type_key: 'truck', fields: truckFields, schema: buildSchema(truckFields) },
  bus: { type_key: 'bus', fields: busFields, schema: buildSchema(busFields) },
  machinery: { type_key: 'machinery', fields: machineryFields, schema: buildSchema(machineryFields) },
  nautical: { type_key: 'nautical', fields: nauticalFields, schema: buildSchema(nauticalFields) },
  aerial: { type_key: 'aerial', fields: aerialFields, schema: buildSchema(aerialFields) },
};

// Normalización de alias provenientes de la tabla vehicle_types (slugs variados)
const aliasMap: Record<string,string> = {
  auto: 'car', autos: 'car', coche: 'car', 'vehiculo-liviano': 'car', 'vehiculo_liviano':'car',
  suv: 'car',
  pickup: 'car',
  van: 'car',
  minivan: 'car',
  vans: 'car', furgon: 'car', furgón: 'car', furgoneta: 'car',

  // Motos
  moto: 'motorcycle', motos: 'motorcycle', motorbike: 'motorcycle',

  // Camiones
  camion: 'truck', 'camión': 'truck', camiones: 'truck',
  truck: 'truck', trucks: 'truck',

  industrial: 'machinery',
  machinery: 'machinery',
  maquinaria: 'machinery',

  nautico: 'nautical', 'náutico': 'nautical', nautica: 'nautical', 'náutica': 'nautical',
  boat: 'nautical', lancha: 'nautical', velero: 'nautical', yate: 'nautical', jetski: 'nautical',

  aereo: 'aerial', 'aéreo': 'aerial', aerea: 'aerial', 'aérea': 'aerial',
  avion: 'aerial', 'avión': 'aerial', helicoptero: 'aerial', 'helicóptero': 'aerial', drone: 'aerial', dron: 'aerial'
};

export function resolveSpecKey(raw: string): string {
  const k = raw.toLowerCase();
  if (aliasMap[k]) return aliasMap[k];
  return k;
}

export function getSpecCategory(type_key: string | null | undefined): SpecCategoryDescriptor | null {
  if (!type_key) return null;
  const resolved = resolveSpecKey(type_key);
  return specCategories[resolved] || null;
}

// ================= VALIDACIONES CROSS-FIELD ADICIONALES =================
// En lugar de meter reglas complejas dentro del schema base (que sólo valida tipos/rangos unitarios)
// exponemos un helper que puede usarse en el paso antes de submit o en validación incremental.
// Retorna { ok, errors } similar a validateStepData.
export interface CrossFieldValidationResult {
  ok: boolean;
  errors: Record<string,string>;
}

export function validateSpecsWithRules(typeKeyRaw: string | null | undefined, specs: Record<string, any>): CrossFieldValidationResult {
  if (!typeKeyRaw) return { ok: true, errors: {} };
  const typeKey = resolveSpecKey(typeKeyRaw);
  const errors: Record<string,string> = {};

  // Normalizaciones ligeras (no mutamos original para evitar efectos secundarios)
  const s = specs || {};

  // Reglas comunes
  for (const k of Object.keys(s)) {
    if (s[k] === '') {
      // Cadena vacía cuenta como ausencia -> dejar que la capa superior la filtre si quiere.
      continue;
    }
  }

  // Helper numérico seguro
  const num = (v:any): number | null => (typeof v === 'number' && !isNaN(v) ? v : null);

  switch (typeKey) {
    case 'truck': {
      const gross = num(s.gross_weight_kg);
      const payload = num(s.payload_capacity_kg);
      if (gross && payload && payload > gross) {
        errors.payload_capacity_kg = 'La carga útil no puede exceder el peso bruto';
      }
      // Validar formato axle_configuration (ej: "6x4") si existe
      if (s.axle_configuration && typeof s.axle_configuration === 'string' && !/^\d+x\d+$/i.test(s.axle_configuration.trim())) {
        errors.axle_configuration = 'Formato esperado ej: 6x4';
      }
      break;
    }
    case 'bus': {
      const seats = num(s.seats) || 0;
      const standing = num(s.standing_capacity) || 0;
      if (seats + standing > 250) {
        errors.standing_capacity = 'Suma asientos + de pie demasiado alta (>250)';
      }
      break;
    }
    case 'machinery': {
      const op = num(s.operating_weight_kg);
      const lift = num(s.lifting_capacity_kg);
      if (op && lift && lift > op * 0.9) {
        errors.lifting_capacity_kg = 'Capacidad de izaje supera el 90% del peso operativo';
      }
      break;
    }
    case 'motorcycle': {
      const cc = num(s.displacement_cc);
      if (cc && (cc < 50 || cc > 2500)) {
        errors.displacement_cc = 'Cilindrada fuera de rango razonable (50-2500)';
      }
      break;
    }
    case 'car': {
      const owners = num(s.owners_count);
      if (owners && owners > 50) {
        errors.owners_count = 'Número de dueños no parece válido';
      }
      // Validar formato de consumo: número (entero o decimal) + espacio opcional + (km/l | km/L | KM/L)
      if (typeof s.fuel_consumption === 'string' && s.fuel_consumption.trim().length > 0) {
        const fc = s.fuel_consumption.trim();
        const pattern = /^\d{1,3}(\.\d{1,2})?\s?km\/l$/i; // Ej: 14 km/l, 7.5km/l
        if (!pattern.test(fc)) {
          errors.fuel_consumption = 'Formato sugerido: 14 km/l';
        }
      }
      break;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

// Validaciones avanzadas que cruzan campos fuera de specs (precio, kilometraje, etc.)
// Se invocan típicamente justo antes del submit final (StepReview)
export function validateAdvancedVehicle(ctx: { basic: any; commercial?: any; specs: Record<string,any>; listing_type: string | null | undefined }): CrossFieldValidationResult {
  const errors: Record<string,string> = {};
  if (!ctx) return { ok: true, errors };
  const { basic = {}, commercial = {}, specs = {}, listing_type } = ctx;
  // Precio ahora proviene de commercial.price; fallback a basic.price sólo por compatibilidad legacy
  let extractedPrice: any = commercial.price;
  if (extractedPrice == null) extractedPrice = (basic as any).price;
  const price = typeof extractedPrice === 'number' ? extractedPrice : Number(extractedPrice);
  const year = typeof basic.year === 'number' ? basic.year : Number(basic.year);
  const mileage = typeof basic.mileage === 'number' ? basic.mileage : Number(basic.mileage);
  const currentYear = new Date().getFullYear();

  if (listing_type === 'sale' || listing_type === 'auction') {
    if (!(price > 0)) errors.price = 'Precio debe ser mayor a 0';
  }
  if (Number.isFinite(year)) {
    if (year < 1900 || year > currentYear + 1) errors.year = 'Año fuera de rango válido';
  }
  if (Number.isFinite(mileage)) {
    if (mileage < 0) errors.mileage = 'Kilometraje no puede ser negativo';
    if (mileage > 2000000) errors.mileage = 'Kilometraje fuera de rango razonable (>2M)';
  }
  // Patrón potencia: aceptar números + (hp|HP|kW) con o sin espacio
  const powerLike = (v:any) => typeof v === 'string' && v.trim().length > 0;
  const powerPattern = /^\d{1,4}(\s)?(hp|HP|Hp|kW|KW|kw)$/;
  const powerFields = ['power','engine_power'];
  for (const pf of powerFields) {
    if (powerLike(specs[pf]) && !powerPattern.test(String(specs[pf]).trim())) {
      errors[pf] = 'Formato potencia sugerido: 150hp o 110kW';
    }
  }
  // Coherencia truck ya cubierta en validateSpecsWithRules; aquí ejemplo adicional genérico:
  if (specs.payload_capacity_kg && specs.gross_weight_kg && specs.payload_capacity_kg > specs.gross_weight_kg) {
    errors.payload_capacity_kg = 'Carga útil > peso bruto';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/*
Persistencia recomendada (Supabase):
Opción A (rápida / flexible): columna JSONB `extra_specs` en tabla `vehicles`.
  - Al guardar: patch('vehicle', { specs }) se envía como extra_specs.

  if (listing_type === 'rent') {
    const period = commercial.rent_price_period;
    const rentValue = period ? (commercial as any)[`rent_${period}_price`] : null;
    if (!period) errors.rent_price_period = 'Selecciona periodo de arriendo';
    if (!(rentValue > 0)) errors.rent_price = 'Define precio de arriendo';
  }

  if (listing_type === 'auction') {
    if (!(commercial.auction_start_price > 0)) errors.auction_start_price = 'Precio base requerido';
    if (!commercial.auction_start_at) errors.auction_start_at = 'Inicio de subasta requerido';
    if (!commercial.auction_end_at) errors.auction_end_at = 'Término de subasta requerido';
  }
  - Ventaja: no requiere migraciones múltiples por tipo.
  - Desventaja: queries específicas (ej: filtrar por transmisión) requieren ->> operator y no índices GIN por campo salvo crear expresiones.

Opción B (normalizada híbrida): mantener `extra_specs` y crear tablas especializadas a demanda (ej: vehicle_car_specs) sólo para tipos con alto volumen de filtros.

Migración inicial sugerida:
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS extra_specs JSONB DEFAULT '{}'::jsonb;
  CREATE INDEX IF NOT EXISTS idx_vehicles_extra_specs ON vehicles USING GIN (extra_specs);

Luego, para índices específicos (ej: combustible):
  CREATE INDEX IF NOT EXISTS idx_vehicles_extra_specs_fuel ON vehicles ((extra_specs->>'fuel_type'));

*/


