import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parseOrReply } from "../../lib/http.js";
import {
  ListingDetailResponseSchema,
  ListingMediaResponseSchema,
  ListListingsQuerySchema,
  ListingsResponseSchema
} from "./contracts.js";
import type { ListingRepository } from "./repository/types.js";

const ListingIdParamsSchema = z.object({
  id: z.string().uuid()
});

export async function registerListingRoutes(
  app: FastifyInstance,
  listingRepository: ListingRepository
): Promise<void> {
  app.get("/v1/listings", async (request, reply) => {
    const query = parseOrReply(reply, ListListingsQuerySchema, request.query, "query");
    if (!query) {
      return;
    }

    const result = await listingRepository.list(query);
    const payload = ListingsResponseSchema.parse({
      items: result.items,
      meta: {
        total: result.total,
        limit: query.limit,
        offset: query.offset
      }
    });

    return reply.send(payload);
  });

  app.get("/v1/listings/:id", async (request, reply) => {
    const params = parseOrReply(reply, ListingIdParamsSchema, request.params, "params");
    if (!params) {
      return;
    }

    const listing = await listingRepository.findById(params.id);
    if (!listing) {
      return reply.status(404).send({ error: "not_found", message: "Listing not found" });
    }

    const payload = ListingDetailResponseSchema.parse({ item: listing });
    return reply.send(payload);
  });

  app.get("/v1/listings/:id/media", async (request, reply) => {
    const params = parseOrReply(reply, ListingIdParamsSchema, request.params, "params");
    if (!params) {
      return;
    }

    const media = await listingRepository.listMedia(params.id);
    const payload = ListingMediaResponseSchema.parse({ items: media });
    return reply.send(payload);
  });
}
