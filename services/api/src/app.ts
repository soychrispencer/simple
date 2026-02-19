import Fastify, { type FastifyInstance } from "fastify";
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

  app.register(registerHealthRoutes);
  app.register(async (instance) => {
    await registerListingRoutes(instance, listingRepository);
  });
  app.register(async (instance) => {
    await registerPublishRoutes(instance, listingRepository);
  });

  return app;
}
