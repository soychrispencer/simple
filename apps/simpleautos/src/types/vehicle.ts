// --- Adaptador legacy ? canónico ---
/**
 * Transforma el estado legacy del wizard a los tipos canónicos ESTADO, HISTORIAL y CONDICIONES.
 */
type LegacyBasic = {
  estado?: string | null;  // Campo actual del wizard
  condition?: string | null;  // Legacy
  state?: string | null;  // Legacy
};

type LegacyVehicle = {
  condition?: string | null;
  state?: string | null;
  condition_tags?: string[] | null;
  status_tags?: string[] | null;
  historial?: string[] | null;  // Campo actual del wizard
};

type LegacyCommercial = {
  conditions_flags?: string[] | null;
  conditions_notes?: string | null;
  condiciones?: CondicionesComerciales | null;  // Campo actual del wizard
};

interface LegacyWizardSlice {
  basic?: LegacyBasic;
  vehicle?: LegacyVehicle;
  commercial?: LegacyCommercial;
}

export function legacyToCanon({ basic, vehicle, commercial }: LegacyWizardSlice = {}): VehiculoWizard {
  // Estado: prioriza basic.estado (actual), luego basic.condition, luego vehicle.condition, luego state
  const rawEstado = (basic?.estado ?? basic?.condition ?? basic?.state ?? vehicle?.condition ?? vehicle?.state ?? null) as string | null;

  // Historial: prioriza vehicle.historial (actual), luego unifica condition_tags y status_tags
  const historialBase = vehicle?.historial ?? vehicle?.condition_tags ?? vehicle?.status_tags ?? [];
  const canonicalizeHistorialTag = (tag: string): string => {
    const t = tag.trim();
    // Mapear códigos legacy en español a códigos canónicos (inglés)
    if (t === 'un_dueno') return 'one-owner';
    if (t === 'mantencion_al_dia') return 'recent-maintenance';
    if (t === 'revision_tecnica_vigente') return 'tech-inspection';
    if (t === 'garantia_vigente') return 'warranty';
    if (t === 'factura') return 'invoice';
    if (t === 'manual_original') return 'original-manual';
    if (t === 'siniestro_leve') return 'minor-accident';
    if (t === 'siniestro_grave') return 'major-accident';
    if (t === 'otros' || t === 'other') return '';
    return t;
  };
  const historialSet = new Set(
    (historialBase || [])
      .filter(Boolean)
      .map(v => canonicalizeHistorialTag(String(v)))
      .filter(Boolean)
  );

  // Migración: 'collection' ya no es condición; pasa a tag
  const normalizedEstado = typeof rawEstado === 'string' ? rawEstado.trim().toLowerCase() : null;
  let estado = (rawEstado as any) as EstadoVehiculo | null;
  if (normalizedEstado === 'collection') {
    estado = null;
    historialSet.add('collectible');
  }

  const historial = Array.from(historialSet) as HistorialVehiculoTag[];

  // Condiciones comerciales: prioriza commercial.condiciones (actual), luego flags y notas legacy
  const condiciones: CondicionesComerciales = commercial?.condiciones ?? {
    flags: commercial?.conditions_flags?.filter(Boolean) ?? [],
    notas: commercial?.conditions_notes ?? null,
  };

  return {
    estado,
    historial,
    condiciones,
    // ...otros campos si se requiere
  };
}
// New unified vehicle typing aligned with English database values
export type ListingKind = 'sale' | 'rent' | 'auction';
export type VehicleCategory = 'car' | 'bus' | 'motorcycle' | 'truck' | 'machinery' | 'aerial' | 'nautical';
export type CarBodyStyle = 'suv' | 'sedan' | 'hatchback' | 'pickup' | 'van' | 'coupe' | 'convertible' | 'wagon' | 'minivan' | 'other';
// Primary high-level condition of the vehicle.
export type Condition =
  | 'new'
  | 'demo'
  | 'semi-new'
  | 'used'
  | 'certified'
  | 'restored'
  | 'accident'
  | 'to-repair'
  | 'parts';
export type TransmissionType = 'manual' | 'automatic' | 'cvt' | 'dual_clutch' | 'other';
export type FuelKind = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'cng' | 'lpg' | 'hydrogen' | 'other';
export type Drivetrain = 'fwd' | 'rwd' | 'awd' | '4x4' | 'other';
export type Visibility = 'featured' | 'normal' | 'hidden';
export type RentPricePeriod = 'daily' | 'weekly' | 'monthly';

export interface VehicleBase {
  id: string;
  owner_id: string;
  type_id: string; // FK vehicle_types.id (uuid)
  title: string;
  description?: string | null;
  listing_type: ListingKind;
  /** Alias legado para compatibilidad en componentes antiguos */
  listing_kind?: ListingKind;
  price: number | null;
  year: number | null;
  mileage: number | null;
  /** Alias legado: kilometraje en km */
  mileage_km?: number | null;
  brand_id?: string | null;
  model_id?: string | null;
  // Canonical condition (macro). Persist temporalmente en extra_specs.condition.
  condition?: Condition | null;
  /**
   * @deprecated Usar `condition`. Este campo se mantiene mientras se limpian referencias antiguas.
   */
  state?: Condition | null;
  color?: string | null;
  region_id?: number | null;
  commune_id?: number | null;
  image_urls: string[];
  /** Alias legacy utilizado por la UI. populate con SELECT ... image_paths:image_urls */
  image_paths: string[];
  video_url?: string | null;
  document_urls?: string[] | null;
  allow_financing: boolean;
  allow_exchange: boolean;
  featured: boolean;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  expires_at?: string | null;
  extra_specs?: Record<string, any> | null; // flexible JSON fallback
  // --- Campos legados/derivados para compatibilidad ---
  type_key?: VehicleCategory | null;
  commune_name?: string | null;
  region_name?: string | null;
  type_label?: string | null;
  financing_available?: boolean;
  exchange_considered?: boolean;
  main_image?: string | null;
  equipment?: string[] | null;
  documentation?: string[] | null;
  company_id?: string | null;
  version?: string | null;
  // Rental support
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: RentPricePeriod | null;
  rent_security_deposit?: number | null;
}

export interface CarSpecs {
  vehicle_id: string;
  body_style?: CarBodyStyle | null;
  doors?: number | null;
  seats?: number | null;
  engine_displacement_cc?: number | null;
  engine_power_hp?: number | null;
  engine_torque_nm?: number | null;
  fuel_type?: FuelKind | null;
  transmission?: TransmissionType | null;
  drivetrain?: Drivetrain | null;
  acceleration_0_100?: number | null; // seconds
  top_speed_kph?: number | null;
  combined_consumption_l_100km?: number | null;
  co2_emissions_g_km?: number | null;
}

// Helper union for future expansions
export type VehicleWithSubtype = VehicleBase & { car?: CarSpecs };

// Legacy compatibility (deprecated): keep old Vehicle alias pointing to new base
export type Vehicle = VehicleBase;

// --- Canónicos para refactorización ---
// Condición del vehículo (usar español para consistencia con DB)
export type EstadoVehiculo =
  | 'nuevo'
  | 'demo'
  | 'seminuevo'
  | 'usado'
  | 'restored'
  | 'accident'
  | 'to-repair'
  | 'parts';

export type HistorialVehiculoTag =
  | 'one-owner'
  | 'recent-maintenance'
  | 'papers-ok'
  | 'tech-inspection'
  | 'warranty'
  | 'invoice'
  | 'original-manual'
  | 'no-accidents'
  | 'minor-accident'
  | 'major-accident'
  | 'original-paint'
  | 'imported'
  | 'collectible'
  | 'luxury'
  | 'premium'
  // Legacy codes aceptados para backwards compatibility
  | 'mantencion_al_dia'
  | 'un_dueno'
  | 'siniestro_leve'
  | 'siniestro_grave'
  | 'garantia_vigente'
  | 'revision_tecnica_vigente'
  | 'factura'
  | 'manual_original'
  ;

export interface CondicionesComerciales {
  flags: string[]; // Ej: ['factura', 'garantia_vigente']
  notas: string | null;
}

export interface VehiculoWizard {
  estado: EstadoVehiculo | null;
  historial: HistorialVehiculoTag[];
  condiciones: CondicionesComerciales;
  // ...otros campos del wizard
}


