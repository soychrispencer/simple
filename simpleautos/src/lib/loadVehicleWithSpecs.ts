import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { resolveSpecKey } from '@/components/vehicle-wizard/specDescriptors';

interface LoadVehicleOptions {
  id: string;
}

// Retorna vehículo + specs desde el campo specs JSONB
export async function loadVehicleWithSpecs({ id }: LoadVehicleOptions) {
  const supabase = createPagesBrowserClient();
  
  // Cargar vehículo con join a vehicle_types para obtener el slug
  const { data: veh, error: vehErr } = await supabase
    .from('vehicles')
    .select('*, vehicle_types!inner(slug)')
    .eq('id', id)
    .single();
  if (vehErr) throw new Error(vehErr.message);
  if (!veh) throw new Error('Vehículo no encontrado');

  // Extraer el slug del tipo desde el join
  const typeSlug: string = (veh as any).vehicle_types?.slug || veh.type_slug || veh.type_key || veh.type || '';
  const resolved = resolveSpecKey(typeSlug);

  // Usar specs directamente del campo JSONB
  const specs = veh.specs || {};

  // Extraer propiedades comunes del specs para acceso directo
  const vehicleWithExtractedProps = {
    ...veh,
    color: specs.color || null,
  };

  // Cargar features pivot
  const { data: featRows, error: featErr } = await supabase
    .from('vehicle_features')
    .select('feature_code')
    .eq('vehicle_id', id);
  if (featErr) throw new Error(featErr.message);
  const features = (featRows || []).map(r => r.feature_code);

  return { vehicle: vehicleWithExtractedProps, specs, typeSlug: resolved, features };
}
