import type { ListingSummary } from "./contracts.js";

const PUBLISHED_AT = "2026-02-17T15:00:00.000Z";

export const LISTING_FIXTURES: ListingSummary[] = [
  {
    id: "3f8da0a5-2423-4012-b337-d2fa9c26e8d9",
    vertical: "autos",
    type: "sale",
    title: "Peugeot 208 Hatchback 2016 Blanco",
    price: 5790000,
    currency: "CLP",
    city: "Santiago",
    ownerId: "11111111-1111-4111-8111-111111111111",
    status: "published",
    publishedAt: PUBLISHED_AT
  },
  {
    id: "e95856a6-d4f8-4bf8-b4c5-347f304f67f0",
    vertical: "properties",
    type: "rent",
    title: "Departamento 2D+2B en Providencia",
    price: 850000,
    currency: "CLP",
    city: "Santiago",
    ownerId: "22222222-2222-4222-8222-222222222222",
    status: "draft",
    publishedAt: PUBLISHED_AT
  }
];

export const LISTING_MEDIA_FIXTURES = {
  "3f8da0a5-2423-4012-b337-d2fa9c26e8d9": [
    {
      id: "f9df0fc8-4ef6-4562-aecf-9166b159a4a7",
      listingId: "3f8da0a5-2423-4012-b337-d2fa9c26e8d9",
      url: "https://cdn.simpleautos.app/listings/peugeot-208-cover.jpg",
      kind: "image",
      order: 0
    }
  ],
  "e95856a6-d4f8-4bf8-b4c5-347f304f67f0": [
    {
      id: "1aff03ca-ffbf-4b5e-ba03-f0ad7938ab6a",
      listingId: "e95856a6-d4f8-4bf8-b4c5-347f304f67f0",
      url: "https://cdn.simplepropiedades.app/listings/depto-providencia-cover.jpg",
      kind: "image",
      order: 0
    }
  ]
} as const;
