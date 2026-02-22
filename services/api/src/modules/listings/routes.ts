import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parseOrReply } from "../../lib/http.js";
import {
  ListingDetailResponseSchema,
  ListingMediaResponseSchema,
  ListListingsQuerySchema,
  MyListingsQuerySchema,
  ListingsResponseSchema,
  UpsertListingBodySchema,
  UpsertListingResponseSchema
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

  app.get("/v1/listings/mine", async (request, reply) => {
    const query = parseOrReply(reply, MyListingsQuerySchema, request.query, "query");
    if (!query) {
      return;
    }

    const authHeader = String(request.headers.authorization || "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return reply.status(401).send({ error: "unauthorized", message: "Missing bearer token" });
    }

    const accessToken = authHeader.slice(7).trim();
    const authUserId = await listingRepository.resolveAuthUserId(accessToken);
    if (!authUserId) {
      return reply.status(401).send({ error: "unauthorized", message: "Invalid auth token" });
    }

    const result = await listingRepository.listMine(authUserId, query);
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

  app.delete("/v1/listings/:id", async (request, reply) => {
    const params = parseOrReply(reply, ListingIdParamsSchema, request.params, "params");
    if (!params) {
      return;
    }

    const authHeader = String(request.headers.authorization || "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return reply.status(401).send({ error: "unauthorized", message: "Missing bearer token" });
    }

    const accessToken = authHeader.slice(7).trim();
    const authUserId = await listingRepository.resolveAuthUserId(accessToken);
    if (!authUserId) {
      return reply.status(401).send({ error: "unauthorized", message: "Invalid auth token" });
    }

    const deleted = await listingRepository.deleteOwnedListing(authUserId, params.id);
    if (!deleted) {
      return reply.status(404).send({ error: "not_found", message: "Listing not found" });
    }

    return reply.send({ deleted: true, id: params.id });
  });

  app.post("/v1/listings/upsert", async (request, reply) => {
    const body = parseOrReply(reply, UpsertListingBodySchema, request.body, "body");
    if (!body) {
      return;
    }

    const authHeader = String(request.headers.authorization || "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return reply.status(401).send({ error: "unauthorized", message: "Missing bearer token" });
    }

    const accessToken = authHeader.slice(7).trim();
    const authUserId = await listingRepository.resolveAuthUserId(accessToken);
    if (!authUserId) {
      return reply.status(401).send({ error: "unauthorized", message: "Invalid auth token" });
    }

    try {
      const result = await listingRepository.upsertListing({
        vertical: body.vertical,
        listingId: body.listingId,
        authUserId,
        listing: body.listing,
        detail: body.detail,
        images: body.images,
        documents: body.documents,
        replaceImages: body.replaceImages
      });

      const payload = UpsertListingResponseSchema.parse(result);
      return reply.send(payload);
    } catch (error: any) {
      app.log.error({ error, body }, "Failed to upsert listing");
      const message = String(error?.message || "Failed to upsert listing");
      const lower = message.toLowerCase();
      const status = lower.includes("not found")
        ? 404
        : lower.includes("publish_limit_exceeded") || lower.includes("create_limit_exceeded")
          ? 409
          : 500;
      return reply.status(status).send({ error: "upsert_failed", message });
    }
  });
}
