import { z } from 'zod';

// Enums
export const SubscriptionPlan = {
  FREE: 'free',
  PRO: 'pro',
  PREMIUM: 'premium',
} as const;

export const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  EXPIRED: 'expired',
} as const;

export const SerenataStatus = {
  PENDING: 'pending',
  QUOTED: 'quoted',
  ACCEPTED: 'accepted',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const SerenataSource = {
  SELF_CAPTURED: 'self_captured',
  PLATFORM_LEAD: 'platform_lead',
  PLATFORM_ASSIGNED: 'platform_assigned',
} as const;

export const PaymentStatus = {
  PENDING: 'pending',
  HOLDING: 'holding',
  RELEASED: 'released',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
} as const;

// Schemas
export const createCaptainProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  experience: z.number().min(0).max(50).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  serviceRadius: z.number().min(1).max(200).default(50),
  minPrice: z.number().min(0).default(100),
  maxPrice: z.number().min(0).default(500),
});

export const createSerenataSchema = z.object({
  clientName: z.string().min(1).max(255),
  clientPhone: z.string().max(50).optional(),
  clientEmail: z.string().email().max(255).optional(),
  eventType: z.enum(['serenata', 'cumpleanos', 'aniversario', 'propuesta', 'otro']).default('serenata'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().min(15).max(180).default(30),
  address: z.string().min(1),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  recipientName: z.string().max(255).optional(),
  recipientRelation: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
  songRequests: z.array(z.string().max(255)).optional(),
  price: z.number().min(0).optional(),
  source: z.enum(['self_captured', 'platform_lead', 'platform_assigned']).default('platform_lead'),
});

export const updateSerenataStatusSchema = z.object({
  status: z.enum(['pending', 'quoted', 'accepted', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  price: z.number().min(0).optional(),
});

export const createReviewSchema = z.object({
  serenataId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  punctualityRating: z.number().min(1).max(5).optional(),
  performanceRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

// Types
export type CreateCaptainProfileInput = z.infer<typeof createCaptainProfileSchema>;
export type CreateSerenataInput = z.infer<typeof createSerenataSchema>;
export type UpdateSerenataStatusInput = z.infer<typeof updateSerenataStatusSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
