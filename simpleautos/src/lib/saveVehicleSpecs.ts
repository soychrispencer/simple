import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { resolveSpecKey } from '@/components/vehicle-wizard/specDescriptors';

// Campos permitidos por tabla especializada
const TABLE_FIELD_MAP: Record<string, { table: string; cols: string[] }> = {
  car: { table: 'vehicle_cars', cols: ['doors','body_type','drivetrain','transmission','fuel_type','engine','version','owners_count','power','fuel_consumption','warranty'] },
  motorcycle: { table: 'vehicle_motorcycles', cols: ['displacement_cc','engine_type','cooling','transmission_type','fuel_type','power','torque','dry_weight'] },
  bus: { table: 'vehicle_buses', cols: ['seats','standing_capacity','length_m','engine_power','fuel_type','emission_standard','accessibility_features'] },
  commercial: { table: 'vehicle_commercial', cols: ['cargo_volume_m3','payload_capacity_kg','wheelbase_mm','fuel_type','transmission','drivetrain','doors'] },
  industrial: { table: 'vehicle_industrial', cols: ['category','operating_weight_kg','engine_power','fuel_type','lifting_capacity_kg','hours_used','hydraulic_flow'] },
  truck: { table: 'vehicle_trucks', cols: ['gross_weight_kg','payload_capacity_kg','axle_configuration','engine_power','fuel_type','transmission','traction','cabin_type'] },
};

export interface SaveSpecsParams {
  vehicleId: string;            // ID existente de vehicles
  typeSlug: string;             // slug original (puede ser alias)
  specs: Record<string, any>;   // datos capturados
  // features param eliminado (no se usa aquí, se maneja por saveVehicleFeatures)
}

export interface SaveSpecsResult {
  ok: boolean;
  error?: string;
}

// Nota: para entorno Browser con sesión ya establecida via AuthProvider
export async function saveVehicleSpecs({ vehicleId, typeSlug, specs }: SaveSpecsParams): Promise<SaveSpecsResult> {
  const supabase = createPagesBrowserClient();

  // Actualizar specs en vehicles
  const { error: vehErr } = await supabase
    .from('vehicles')
    .update({ specs: specs, updated_at: new Date().toISOString() })
    .eq('id', vehicleId);
  if (vehErr) return { ok: false, error: vehErr.message };

  return { ok: true };
}

// Sincroniza pivot vehicle_features sustituyendo conjunto completo (idempotente)
export async function saveVehicleFeatures(vehicleId: string, featureCodes: string[]): Promise<SaveSpecsResult> {
  const supabase = createPagesBrowserClient();
  // 1. Borrar actuales que no estén en la nueva lista
  const { data: existing, error: exErr } = await supabase
    .from('vehicle_features')
    .select('feature_code')
    .eq('vehicle_id', vehicleId);
  if (exErr) return { ok: false, error: exErr.message };
  const current = new Set((existing || []).map(r => r.feature_code));
  const incoming = new Set(featureCodes);

  const toDelete = [...current].filter(c => !incoming.has(c));
  if (toDelete.length) {
    const { error: delErr } = await supabase
      .from('vehicle_features')
      .delete()
      .eq('vehicle_id', vehicleId)
      .in('feature_code', toDelete);
    if (delErr) return { ok: false, error: delErr.message };
  }

  const toInsert = [...incoming].filter(c => !current.has(c));
  if (toInsert.length) {
    const rows = toInsert.map(code => ({ vehicle_id: vehicleId, feature_code: code }));
    const { error: insErr } = await supabase.from('vehicle_features').insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }
  return { ok: true };
}
