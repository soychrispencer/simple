import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../../src/app.js";
import type { Env } from "../../src/config/env.js";

let app: FastifyInstance;
const TEST_ENV: Env = {
  NODE_ENV: "test",
  API_HOST: "127.0.0.1",
  API_PORT: 0,
  LISTINGS_REPOSITORY: "memory"
};

before(async () => {
  app = buildServer(TEST_ENV);
  await app.ready();
});

after(async () => {
  await app.close();
});

test("GET /api/health returns service heartbeat", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/health"
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "simple-api");
});

test("GET /v1/listings returns fixture list", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/v1/listings?vertical=autos&limit=10"
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.meta.total, 1);
  assert.equal(payload.items[0].vertical, "autos");
});

test("POST /v1/publish/queue returns accepted", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/v1/publish/queue",
    payload: {
      listingId: "3f8da0a5-2423-4012-b337-d2fa9c26e8d9",
      vertical: "autos",
      reason: "new_publish"
    }
  });

  assert.equal(response.statusCode, 202);
  const payload = response.json();
  assert.equal(payload.status, "accepted");
  assert.match(payload.jobId, /^[a-f0-9-]{36}$/);
});
