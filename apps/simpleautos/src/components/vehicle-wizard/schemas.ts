import { z } from 'zod';

// Enumeraciones base
export const listingTypeEnum = z.enum(['sale','rent','auction']);
// Condición del vehículo
export const estadoEnum = z.enum([
  'nuevo',       // Nuevo
  'demo',        // Vehículo demo
  'seminuevo',   // Seminuevo / Certificado
  'usado',       // Usado
  'restored',    // Restaurado
  'accident',    // Siniestrado
  'to-repair',   // Para reparar (requiere intervención para quedar operativo)
  'parts',       // Solo para partes
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const uuidStringSchema = z.string().trim().regex(UUID_REGEX, 'Selecciona una opción válida');

const locationIdSchema = z.union([
  uuidStringSchema,
  z.number().int().positive('Identificador inválido'),
]).nullable().optional();

const requiredLocationIdSchema = locationIdSchema.refine(v => v != null, { message: 'Campo requerido' });

// Paso: basic (para sale/auction inicialmente)
export const basicSchema = z.object({
  // El título se genera automáticamente (no se exige como input).
  title: z.string().trim().max(120, 'Máximo 120').optional(),
  estado: estadoEnum
    .nullable()
    .refine(v => v != null, { message: 'Condición requerida' }),
  year: z
    .number({ message: 'Año inválido' })
    .int()
    .min(1900,'Muy antiguo')
    .max(new Date().getFullYear()+1,'Año futuro?')
    .nullable()
    .refine(v => v != null, { message: 'Año requerido' }),
  mileage: z
    .number({ message: 'Kilometraje inválido' })
    .min(0, 'Km >= 0')
    .nullable()
    .refine(v => v != null, { message: 'Kilometraje requerido' }),
  // Aceptamos id numérico (DB int) o string (posible UUID futuro) -> normalizamos fuera.
  brand_id: z.union([uuidStringSchema, z.number().int().positive('Identificador inválido')])
    .nullable()
    .refine(v => v != null, { message: 'Marca requerida' }),
  brand_name: z.string().trim().max(80, 'Máximo 80').nullable().optional(),
  model_id: z.union([uuidStringSchema, z.number().int().positive('Identificador inválido')])
    .nullable()
    .refine(v => v != null, { message: 'Modelo requerido' }),
  model_name: z.string().trim().max(80, 'Máximo 80').nullable().optional(),
  color: z.string().min(2,'Color requerido').max(32,'Muy largo')
    .nullable()
    .refine(v => !!v && v !== 'generic', { message: 'Color requerido' }),
  description: z.string().trim().max(2000,'Máximo 2000 caracteres').optional(),
  region: requiredLocationIdSchema,
  commune: requiredLocationIdSchema,
  region_name: z.string().nullable().optional(),
  commune_name: z.string().nullable().optional(),
  address: z.string().trim().max(180, 'Máximo 180 caracteres').nullable().optional(),
}).refine(d => {
  if (d.model_id && !d.brand_id) return false;
  return true;
}, { message: 'Selecciona marca antes de modelo', path: ['model_id'] })
;

// Paso: type
export const typeSchema = z.object({
  type_key: z.string().min(2), // car, motorcycle, etc.
});

// Paso: specs dinámico -> placeholder (se definirá por descriptors)
// Para ahora aceptamos cualquier par clave/valor hasta definir descriptors
export const specsDynamicSchema = z.record(z.string(), z.any());

// Paso: media
export const mediaSchema = z.object({
  images: z.array(z.object({
    id: z.string(),
    url: z.string().url().optional(),
    main: z.boolean().optional(),
  })).min(1,'Al menos una imagen'),
  video_url: z.string().url().optional().or(z.literal('')).optional(),
});

// Esquemas para condiciones comerciales avanzadas
const financingOptionSchema = z.object({
  bank: z.string().min(1, 'Banco requerido'),
  rate: z.number().min(0, 'Tasa >= 0').max(100, 'Tasa <= 100'),
  term_months: z.number().int().min(1, 'Mínimo 1 mes').max(120, 'Máximo 120 meses'),
  down_payment_percent: z.number().min(0, 'Pie >= 0').max(100, 'Pie <= 100'),
});

const bonusSchema = z.object({
  type: z.enum(['cash', 'accessory', 'service']),
  description: z.string().min(1, 'Descripción requerida').max(200, 'Máximo 200 caracteres'),
  value: z.number().positive('Valor > 0').optional(),
}).refine(data => {
  if (data.type === 'cash' && !data.value) {
    return false;
  }
  return true;
}, {
  message: 'Valor requerido para bonos en efectivo',
  path: ['value']
});

const discountSchema = z.object({
  type: z.enum(['percentage', 'fixed_amount']),
  value: z.number().positive('Valor > 0'),
  description: z.string().min(1, 'Descripción requerida').max(200, 'Máximo 200 caracteres'),
  valid_until: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Formato YYYY-MM-DD').optional(),
}).refine(data => {
  if (data.type === 'percentage' && data.value > 100) {
    return false;
  }
  return true;
}, {
  message: 'Porcentaje máximo 100%',
  path: ['value']
});

const warrantyOfferSchema = z.object({
  kind: z.enum(['seller', 'extended']),
  duration_months: z.number().int().min(1, 'Mínimo 1 mes').max(120, 'Máximo 120 meses').nullable().optional(),
  provider: z.string().trim().max(80, 'Máximo 80 caracteres').nullable().optional(),
  details: z.string().trim().max(300, 'Máximo 300 caracteres').nullable().optional(),
});

const condicionesSchema = z.object({
  flags: z.array(z.string()).default([]),
  notas: z.string().max(2000,'Máx 2000 caracteres').nullable().optional(),
});

const advancedConditionsSchema = z.object({
  financing: z.array(financingOptionSchema).optional(),
  bonuses: z.array(bonusSchema).optional(),
  discounts: z.array(discountSchema).optional(),
  warranty_offer: warrantyOfferSchema.nullable().optional(),
  additional_conditions: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
}).optional();

export const commercialSchema = z.object({
  // La visibilidad se maneja fuera del wizard (pausar/impulsar post-publicación).
  // Mantener compat con drafts antiguos pero restringir a 'normal'.
  visibility: z.literal('normal').nullable().optional(),
  currency: z.enum(['CLP','USD']).nullable().optional(),
  price: z.number().positive('> 0').nullable().optional(),
  offer_price: z.number().positive('> 0').nullable().optional(),
  discount_type: z.enum(['percent','amount','financing_bonus','brand_bonus']).nullable().optional(),
  discount_valid_until: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,'Formato YYYY-MM-DD').nullable().optional(),
  condiciones: condicionesSchema.optional(),
  advanced_conditions: advancedConditionsSchema,
  financing_available: z.boolean().optional(),
  promotions_available: z.boolean().optional(),
  discounts_available: z.boolean().optional(),
  exchange_considered: z.boolean().optional(),
  exchange_accepts: z.enum(['car_suv_pickup','motorcycle','commercial_vehicle','depends']).nullable().optional(),
  exchange_balance: z.enum(['to_seller','to_buyer','negotiable']).nullable().optional(),
  // Campos potenciales de rent (opcionales a nivel base, se validan condicionalmente en StepCommercial)
  rent_daily_price: z.number().positive('> 0').nullable().optional(),
  rent_weekly_price: z.number().positive('> 0').nullable().optional(),
  rent_security_deposit: z.number().min(0,'>= 0').nullable().optional(),
  rent_monthly_price: z.number().positive('> 0').nullable().optional(),
  rent_price_period: z.enum(['daily','weekly','monthly']).nullable().optional(),
  // Campos potenciales de auction
  auction_start_price: z.number().positive('> 0').nullable().optional(),
  auction_start_at: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/,'Formato inválido').nullable().optional(),
  auction_end_at: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/,'Formato inválido').nullable().optional(),
});

// Validadores de flujo por tipo de publicación (inicialmente iguales)
export const flowByListingType = {
  sale: ['type','basic','specs','media','commercial'] as const,
  rent: ['type','basic','specs','media','commercial'] as const,
  auction: ['type','basic','specs','media','commercial'] as const,
};

export type BasicValues = z.infer<typeof basicSchema>;
export type TypeValues = z.infer<typeof typeSchema>;
export type MediaValues = z.infer<typeof mediaSchema>;
export type CommercialValues = z.infer<typeof commercialSchema>;

// Helper para validar un paso específico
export function validateStepData(step: string, data: any): { ok: boolean; errors?: Record<string,string> } {
  try {
    switch(step){
      case 'basic': basicSchema.parse(data); break;
      case 'type': typeSchema.parse(data); break;
      case 'specs': specsDynamicSchema.parse(data); break; // TODO real
      case 'media': mediaSchema.parse(data); break;
      case 'commercial': commercialSchema.parse(data); break;
      default: return { ok: true };
    }
    return { ok: true };
  } catch (e:any) {
    if (e?.issues) {
      const errMap: Record<string,string> = {};
      for (const issue of e.issues) {
        if (issue.path?.length) errMap[String(issue.path[0])] = issue.message;
      }
      return { ok: false, errors: errMap };
    }
    return { ok: false, errors: { _root: 'Error de validación desconocido'} };
  }
}


