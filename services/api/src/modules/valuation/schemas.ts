import { z } from 'zod';

export const propertyValuationRequestSchema = z.object({
    operationType: z.enum(['sale', 'rent']),
    propertyType: z.string().trim().min(1),
    regionId: z.string().trim().min(1),
    communeId: z.string().trim().min(1),
    neighborhood: z.string().trim().nullable().default(null),
    addressLine1: z.string().trim().nullable().default(null),
    areaM2: z.number().positive(),
    builtAreaM2: z.number().positive().nullable().default(null),
    bedrooms: z.number().nonnegative().nullable().default(null),
    bathrooms: z.number().nonnegative().nullable().default(null),
    parkingSpaces: z.number().nonnegative().nullable().default(null),
    storageUnits: z.number().nonnegative().nullable().default(null),
    yearBuilt: z.number().int().nullable().default(null),
    condition: z.string().trim().nullable().default(null),
});
