import { z } from 'zod';

// Esquemas de validaci�n
export const VehicleSchema = z.object({
  title: z.string().min(3, 'El t�tulo debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  price: z.number().positive('El precio debe ser positivo'),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.number().min(0, 'El kilometraje debe ser positivo'),
  condition: z.enum(['new', 'used']),
  status: z.enum(['draft', 'published', 'sold']),
  listing_type: z.enum(['sale', 'rent', 'auction']),
  specs: z.record(z.string(), z.any()).optional()
});

export const ProfileSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inv�lido'),
  phone: z.string().optional(),
  region_id: z.number(),
  commune_id: z.number()
});

export const BoostSchema = z.object({
  vehicle_id: z.string().uuid(),
  plan_id: z.number(),
  start_date: z.date(),
  end_date: z.date(),
  status: z.enum(['active', 'pending', 'expired'])
});

// Funciones de validaci�n
export function validateVehicleData(data: unknown) {
  return VehicleSchema.parse(data);
}

export function validateProfileData(data: unknown) {
  return ProfileSchema.parse(data);
}

export function validateBoostData(data: unknown) {
  return BoostSchema.parse(data);
}

