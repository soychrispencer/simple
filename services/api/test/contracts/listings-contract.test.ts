import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ListingMediaResponseSchema,
  ListingsResponseSchema,
  PublishQueueBodySchema
} from "../../src/modules/listings/contracts.js";
import { LISTING_FIXTURES, LISTING_MEDIA_FIXTURES } from "../../src/modules/listings/fixtures.js";

test("listings contract validates fixture payload", () => {
  const parsed = ListingsResponseSchema.parse({
    items: LISTING_FIXTURES,
    meta: {
      total: LISTING_FIXTURES.length,
      limit: 20,
      offset: 0
    }
  });

  assert.equal(parsed.items.length, LISTING_FIXTURES.length);
});

test("listing media contract validates fixture payload", () => {
  const parsed = ListingMediaResponseSchema.parse({
    items: LISTING_MEDIA_FIXTURES["3f8da0a5-2423-4012-b337-d2fa9c26e8d9"]
  });

  assert.equal(parsed.items[0]?.kind, "image");
});

test("publish queue body rejects malformed payload", () => {
  const parsed = PublishQueueBodySchema.safeParse({
    listingId: "not-a-uuid",
    vertical: "autos",
    reason: "new_publish"
  });

  assert.equal(parsed.success, false);
});
