import { z } from "zod";

export const VerticalSchema = z.enum(["autos", "properties", "stores", "food"]);
export type Vertical = z.infer<typeof VerticalSchema>;

export const ListingTypeSchema = z.enum(["sale", "rent", "auction"]);
export type ListingType = z.infer<typeof ListingTypeSchema>;

const QueryBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return value;
}, z.boolean().optional());

const ListListingsQueryBaseSchema = z.object({
  vertical: VerticalSchema.optional(),
  type: ListingTypeSchema.optional(),
  typeId: z.string().trim().min(1).max(80).optional(),
  typeKey: z.string().trim().min(1).max(80).optional(),
  brandId: z.string().trim().min(1).max(80).optional(),
  modelId: z.string().trim().min(1).max(80).optional(),
  bodyType: z.string().trim().min(1).max(80).optional(),
  visibility: z.string().trim().min(1).max(80).optional(),
  transmission: z.string().trim().min(1).max(80).optional(),
  fuelType: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().min(1).max(80).optional(),
  estado: z.string().trim().min(1).max(80).optional(),
  yearMin: z.coerce.number().int().nonnegative().optional(),
  yearMax: z.coerce.number().int().nonnegative().optional(),
  financingAvailable: QueryBooleanSchema,
  keyword: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  regionId: z.string().trim().min(1).max(80).optional(),
  communeId: z.string().trim().min(1).max(80).optional(),
  currency: z.string().trim().min(1).max(12).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  propertyType: z.string().trim().min(1).max(80).optional(),
  minBedrooms: z.coerce.number().int().nonnegative().optional(),
  minBathrooms: z.coerce.number().int().nonnegative().optional(),
  minArea: z.coerce.number().nonnegative().optional(),
  maxArea: z.coerce.number().nonnegative().optional(),
  hasPool: QueryBooleanSchema,
  hasGarden: QueryBooleanSchema,
  hasTerrace: QueryBooleanSchema,
  hasBalcony: QueryBooleanSchema,
  hasElevator: QueryBooleanSchema,
  hasSecurity: QueryBooleanSchema,
  hasParking: QueryBooleanSchema,
  isFurnished: QueryBooleanSchema,
  allowsPets: QueryBooleanSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const ListListingsQuerySchema = ListListingsQueryBaseSchema.superRefine((value, ctx) => {
  if (
    typeof value.minPrice === "number" &&
    typeof value.maxPrice === "number" &&
    value.minPrice > value.maxPrice
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["minPrice"],
      message: "minPrice no puede ser mayor que maxPrice"
    });
  }

  if (
    typeof value.yearMin === "number" &&
    typeof value.yearMax === "number" &&
    value.yearMin > value.yearMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["yearMin"],
      message: "yearMin no puede ser mayor que yearMax"
    });
  }

  if (
    typeof value.minArea === "number" &&
    typeof value.maxArea === "number" &&
    value.minArea > value.maxArea
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["minArea"],
      message: "minArea no puede ser mayor que maxArea"
    });
  }
});
export type ListListingsQuery = z.infer<typeof ListListingsQuerySchema>;

export const MyListingsQuerySchema = z
  .object({
    vertical: VerticalSchema.optional(),
    type: ListingTypeSchema.optional(),
    status: z.string().trim().min(1).max(80).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0)
  })
  .superRefine((value, ctx) => {
    if (
      typeof value.limit === "number" &&
      typeof value.offset === "number" &&
      value.limit < 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limit"],
        message: "limit must be >= 1"
      });
    }
  });
export type MyListingsQuery = z.infer<typeof MyListingsQuerySchema>;

export const ListingSummarySchema = z.object({
  id: z.string().uuid(),
  vertical: VerticalSchema,
  type: ListingTypeSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.string().min(1),
  city: z.string().min(1),
  region: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  regionId: z.string().optional(),
  communeId: z.string().optional(),
  ownerId: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
  typeId: z.string().optional(),
  typeKey: z.string().optional(),
  typeLabel: z.string().optional(),
  brandId: z.string().optional(),
  brandName: z.string().optional(),
  modelId: z.string().optional(),
  modelName: z.string().optional(),
  year: z.number().int().optional(),
  mileage: z.number().int().optional(),
  bodyType: z.string().optional(),
  transmission: z.string().optional(),
  fuelType: z.string().optional(),
  color: z.string().optional(),
  condition: z.string().optional(),
  allowFinancing: z.boolean().optional(),
  allowExchange: z.boolean().optional(),
  featured: z.boolean().optional(),
  visibility: z.string().optional(),
  rentDailyPrice: z.number().nonnegative().optional(),
  rentWeeklyPrice: z.number().nonnegative().optional(),
  rentMonthlyPrice: z.number().nonnegative().optional(),
  rentPricePeriod: z.enum(["daily", "weekly", "monthly"]).optional(),
  rentSecurityDeposit: z.number().nonnegative().optional(),
  auctionStartPrice: z.number().nonnegative().optional(),
  auctionStartAt: z.string().datetime().optional(),
  auctionEndAt: z.string().datetime().optional(),
  propertyType: z.string().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  areaM2: z.number().nonnegative().optional(),
  areaBuiltM2: z.number().nonnegative().optional(),
  parkingSpaces: z.number().int().nonnegative().optional(),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().optional(),
  isFurnished: z.boolean().optional(),
  allowsPets: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
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
