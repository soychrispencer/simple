import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    return { ok: true, service: "simple-api", status: "up" };
  });

  app.get("/health", async () => {
    return { ok: true, service: "simple-api", ts: new Date().toISOString() };
  });

  app.get("/api/health", async () => {
    return { ok: true, service: "simple-api", ts: new Date().toISOString() };
  });
}
