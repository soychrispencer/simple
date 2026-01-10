/**
 * Normaliza las especificaciones del veh�culo para mostrar en tarjetas
 * Busca en m�ltiples ubicaciones posibles y retorna valores consistentes
 */

export function normalizeVehicleSpecs(vehicle: any) {
  const extraSpecs = vehicle.extra_specs || {};
  const legacy = extraSpecs.legacy || {};

  return {
    // Combustible: buscar en todos los lugares posibles
    fuel: 
      vehicle.fuel || 
      extraSpecs.fuel_type || 
      legacy.fuel_legacy || 
      extraSpecs.fuel || 
      null,

    // Transmisi�n: buscar en todos los lugares posibles
    transmission: 
      vehicle.transmission || 
      extraSpecs.transmission || 
      extraSpecs.transmission_type || 
      legacy.transmission_legacy || 
      null,

    // Tipo de carrocer�a: buscar en todos los lugares posibles
    bodyType: 
      vehicle.body_type || 
      extraSpecs.body_type || 
      legacy.body_type || 
      null,

    // Tipo de veh�culo
    typeKey: vehicle.type_key || null,
    typeLabel: vehicle.type_label || null,

    // Kilometraje
    mileage: vehicle.mileage || vehicle.mileage_km || 0,
  };
}

/**
 * Asegura que extra_specs tenga los datos en el formato legacy esperado
 * para compatibilidad con componentes existentes
 */
export function ensureLegacyFormat(extraSpecs: any) {
  if (!extraSpecs) return null;

  const legacy = extraSpecs.legacy || {};

  return {
    ...extraSpecs,
    legacy: {
      ...legacy,
      fuel_legacy: legacy.fuel_legacy || extraSpecs.fuel_type || extraSpecs.fuel || null,
      transmission_legacy: legacy.transmission_legacy || extraSpecs.transmission || extraSpecs.transmission_type || null,
      body_type: legacy.body_type || extraSpecs.body_type || null,
    }
  };
}


