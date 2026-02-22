import type { FastifyBaseLogger } from "fastify";
import type { Env } from "../../../config/env.js";
import { MemoryListingRepository } from "./memoryListingRepository.js";
import { PostgresListingRepository } from "./postgresListingRepository.js";
import type { ListingRepository } from "./types.js";

export function buildListingRepository(env: Env, logger: FastifyBaseLogger): ListingRepository {
  if (env.LISTINGS_REPOSITORY === "postgres") {
    if (!env.DATABASE_URL) {
      throw new Error("LISTINGS_REPOSITORY=postgres requires DATABASE_URL");
    }

    logger.info("Using Postgres listing repository");
    return new PostgresListingRepository({
      databaseUrl: env.DATABASE_URL
    });
  }

  logger.info("Using in-memory listing repository");
  return new MemoryListingRepository();
}
