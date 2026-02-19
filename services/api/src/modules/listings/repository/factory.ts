import type { FastifyBaseLogger } from "fastify";
import type { Env } from "../../../config/env.js";
import { MemoryListingRepository } from "./memoryListingRepository.js";
import { SupabaseListingRepository } from "./supabaseListingRepository.js";
import type { ListingRepository } from "./types.js";

export function buildListingRepository(env: Env, logger: FastifyBaseLogger): ListingRepository {
  if (env.LISTINGS_REPOSITORY === "supabase") {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "LISTINGS_REPOSITORY=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    logger.info("Using Supabase listing repository");
    return new SupabaseListingRepository({
      url: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
    });
  }

  logger.info("Using in-memory listing repository");
  return new MemoryListingRepository();
}
