import { VehicleSyncData } from './index';

// Utilidad para convertir datos de vehículo de SimpleAutos al formato de sincronización
export function convertVehicleToSyncData(vehicle: any): VehicleSyncData {
  return {
    id: vehicle.id,
    title: vehicle.title || vehicle.titulo,
    description: vehicle.description || vehicle.descripcion || '',
    price: vehicle.price || vehicle.precio || 0,
    currency: 'CLP',
    images: vehicle.image_paths || vehicle.imagenes || [],
    year: vehicle.year || vehicle.anio || 0,
    mileage: vehicle.mileage || vehicle.mileage_km || vehicle.kilometraje || 0,
    fuel: vehicle.fuel || vehicle.combustible || '',
    transmission: vehicle.transmission || vehicle.transmision || '',
    location: {
      commune: vehicle.commune || vehicle.comuna || '',
      region: vehicle.region || vehicle.region_name || ''
    },
    category: vehicle.type_key || vehicle.category || 'car',
    condition: vehicle.condition || vehicle.condicion || vehicle.condicionVehiculo || 'used',
    features: vehicle.features || [],
    contactInfo: {
      name: vehicle.seller?.nombre || vehicle.contact_name || '',
      phone: vehicle.seller?.phone || vehicle.contact_phone || '',
      email: vehicle.seller?.email || vehicle.contact_email || ''
    }
  };
}

// Utilidad para validar datos antes de sincronización
export function validateSyncData(data: VehicleSyncData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length < 10) {
    errors.push('El título debe tener al menos 10 caracteres');
  }

  if (!data.description || data.description.trim().length < 20) {
    errors.push('La descripción debe tener al menos 20 caracteres');
  }

  if (!data.price || data.price <= 0) {
    errors.push('El precio debe ser mayor a 0');
  }

  if (!data.images || data.images.length === 0) {
    errors.push('Debe incluir al menos una imagen');
  }

  if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 1) {
    errors.push('El año debe ser válido');
  }

  if (!data.location.commune || !data.location.region) {
    errors.push('Debe especificar comuna y región');
  }

  if (!data.contactInfo.name || !data.contactInfo.phone) {
    errors.push('Debe incluir nombre y teléfono de contacto');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

