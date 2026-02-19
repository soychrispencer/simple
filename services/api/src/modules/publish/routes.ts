import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { parseOrReply } from "../../lib/http.js";
import {
  PublishQueueBodySchema,
  PublishQueueResponseSchema
} from "../listings/contracts.js";
import type { ListingRepository } from "../listings/repository/types.js";

export async function registerPublishRoutes(
  app: FastifyInstance,
  listingRepository: ListingRepository
): Promise<void> {
  app.post("/v1/publish/queue", async (request, reply) => {
    const body = parseOrReply(reply, PublishQueueBodySchema, request.body, "body");
    if (!body) {
      return;
    }

    const listing = await listingRepository.findById(body.listingId);
    if (!listing) {
      return reply.status(404).send({
        error: "not_found",
        message: "Listing not found for queue enqueue"
      });
    }

    if (listing.vertical !== body.vertical) {
      return reply.status(409).send({
        error: "vertical_mismatch",
        message: "Listing vertical does not match payload vertical"
      });
    }

    const payload = PublishQueueResponseSchema.parse({
      status: "accepted",
      jobId: randomUUID(),
      queuedAt: new Date().toISOString()
    });

    app.log.info(
      {
        listingId: body.listingId,
        vertical: body.vertical,
        reason: body.reason,
        jobId: payload.jobId
      },
      "Publish job accepted"
    );

    return reply.status(202).send(payload);
  });
}
