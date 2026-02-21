import { z } from "zod";

export const VerticalSchema = z.enum(["autos", "properties", "stores", "food"]);
export type Vertical = z.infer<typeof VerticalSchema>;

export const ListingTypeSchema = z.enum(["sale", "rent", "auction"]);
export type ListingType = z.infer<typeof ListingTypeSchema>;

export const ListListingsQuerySchema = z.object({
  vertical: VerticalSchema.optional(),
  type: ListingTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});
export type ListListingsQuery = z.infer<typeof ListListingsQuerySchema>;

export const ListingSummarySchema = z.object({
  id: z.string().uuid(),
  vertical: VerticalSchema,
  type: ListingTypeSchema,
  title: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().min(1),
  city: z.string().min(1),
  publishedAt: z.string().datetime()
});
export type ListingSummary = z.infer<typeof ListingSummarySchema>;

export const ListingsResponseSchema = z.object({
  items: z.array(ListingSummarySchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

export const ListingDetailResponseSchema = z.object({
  item: ListingSummarySchema
});

export const ListingMediaSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  url: z.string().url(),
  kind: z.enum(["image", "video"]),
  order: z.number().int().min(0)
});

export const ListingMediaResponseSchema = z.object({
  items: z.array(ListingMediaSchema)
});

export const ListingWriteImageSchema = z.object({
  url: z.string().url(),
  is_primary: z.boolean().optional(),
  position: z.number().int().min(0).optional()
});
export type ListingWriteImage = z.infer<typeof ListingWriteImageSchema>;

export const ListingWriteDocumentSchema = z.object({
  record_id: z.string().uuid().optional(),
  name: z.string().min(1),
  type: z.string().optional().nullable(),
  size: z.number().int().min(0).optional().nullable(),
  is_public: z.boolean().default(false),
  path: z.string().min(1)
});
export type ListingWriteDocument = z.infer<typeof ListingWriteDocumentSchema>;

export const UpsertListingBodySchema = z.object({
  vertical: VerticalSchema,
  listingId: z.string().uuid().optional(),
  listing: z.record(z.unknown()),
  detail: z.record(z.unknown()).optional(),
  images: z.array(ListingWriteImageSchema).default([]),
  documents: z.array(ListingWriteDocumentSchema).optional(),
  replaceImages: z.boolean().default(true)
});
export type UpsertListingBody = z.infer<typeof UpsertListingBodySchema>;

export const UpsertListingResponseSchema = z.object({
  id: z.string().uuid(),
  created: z.boolean(),
  updatedAt: z.string().datetime()
});

export const PublishQueueBodySchema = z.object({
  listingId: z.string().uuid(),
  vertical: VerticalSchema,
  reason: z.enum(["new_publish", "manual_retry"]).default("new_publish")
});
export type PublishQueueBody = z.infer<typeof PublishQueueBodySchema>;

export const PublishQueueResponseSchema = z.object({
  status: z.literal("accepted"),
  jobId: z.string().uuid(),
  queuedAt: z.string().datetime()
});
