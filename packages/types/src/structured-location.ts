import { z } from 'zod';

/** Ubicación estructurada compartida (cuenta, negocio, marketplace). */
export const structuredLocationSchema = z.object({
    countryCode: z.string().trim().min(2).max(3).default('CL'),
    regionId: z.string().trim().nullable().default(null),
    regionName: z.string().trim().max(120).nullable().default(null),
    localityId: z.string().trim().nullable().default(null),
    localityName: z.string().trim().max(120).nullable().default(null),
});

export type StructuredLocation = z.infer<typeof structuredLocationSchema>;

export const agendaOperatingLocationSchema = structuredLocationSchema.extend({
    serviceLocalities: z.array(z.string().trim().min(1).max(120)).default([]),
    servesOnline: z.boolean().default(true),
    servesPresential: z.boolean().default(false),
});

export type AgendaOperatingLocation = z.infer<typeof agendaOperatingLocationSchema>;
