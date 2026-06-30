import { z } from 'zod';

export const vehicleValuationRequestSchema = z.object({
    operationType: z.enum(['sale', 'rent']),
    vehicleType: z.string().trim().min(1),
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    version: z.string().trim().nullable().default(null),
    year: z.number().int().min(1900).max(2100),
    mileageKm: z.number().nonnegative().nullable().default(null),
    condition: z.string().trim().nullable().default(null),
    fuelType: z.string().trim().nullable().default(null),
    transmission: z.string().trim().nullable().default(null),
    traction: z.string().trim().nullable().default(null),
    bodyType: z.string().trim().nullable().default(null),
    regionId: z.string().trim().min(1),
    communeId: z.string().trim().min(1),
    addressLine1: z.string().trim().nullable().default(null),
});
