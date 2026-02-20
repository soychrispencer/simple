import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { Env } from "./config/env.js";
import { registerHealthRoutes } from "./modules/health/routes.js";
import { registerListingRoutes } from "./modules/listings/routes.js";
import { buildListingRepository } from "./modules/listings/repository/factory.js";
import { registerPublishRoutes } from "./modules/publish/routes.js";

export function buildServer(env: Env): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug"
    }
  });
  const listingRepository = buildListingRepository(env, app.log);
  const corsOrigins = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const corsConfig =
    corsOrigins.length > 0
      ? { origin: corsOrigins, credentials: true }
      : { origin: true, credentials: true };

  app.register(cors, corsConfig);

  app.register(registerHealthRoutes);
  app.register(async (instance) => {
    await registerListingRoutes(instance, listingRepository);
  });
  app.register(async (instance) => {
    await registerPublishRoutes(instance, listingRepository);
  });

  return app;
}
