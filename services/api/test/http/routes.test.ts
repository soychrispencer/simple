import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../../src/app.js";
import type { Env } from "../../src/config/env.js";

let app: FastifyInstance;
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_ENV: Env = {
  NODE_ENV: "test",
  API_HOST: "127.0.0.1",
  API_PORT: 0,
  LISTINGS_REPOSITORY: "memory",
  SSO_ISSUER: "simple-api-test"
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

test("GET /v1/listings/mine requires bearer auth", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/v1/listings/mine?vertical=autos&limit=10"
  });

  assert.equal(response.statusCode, 401);
});

test("GET /v1/listings/mine returns owner listings", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/v1/listings/mine?vertical=autos&limit=10",
    headers: {
      authorization: `Bearer ${TEST_USER_ID}`
    }
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.meta.total, 1);
  assert.equal(payload.items[0].ownerId, TEST_USER_ID);
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

test("DELETE /v1/listings/:id requires bearer auth", async () => {
  const response = await app.inject({
    method: "DELETE",
    url: "/v1/listings/3f8da0a5-2423-4012-b337-d2fa9c26e8d9"
  });

  assert.equal(response.statusCode, 401);
});

test("DELETE /v1/listings/:id deletes owner listing", async () => {
  const response = await app.inject({
    method: "DELETE",
    url: "/v1/listings/3f8da0a5-2423-4012-b337-d2fa9c26e8d9",
    headers: {
      authorization: `Bearer ${TEST_USER_ID}`
    }
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.deleted, true);
  assert.equal(payload.id, "3f8da0a5-2423-4012-b337-d2fa9c26e8d9");
});

test("POST /v1/sso/token + /v1/sso/validate returns valid token lifecycle", async () => {
  const targetDomain = "https://www.simplepropiedades.app";
  const refreshToken = "refresh-token-sample";
  const tokenResponse = await app.inject({
    method: "POST",
    url: "/v1/sso/token",
    headers: {
      authorization: `Bearer ${TEST_USER_ID}`
    },
    payload: {
      targetDomain,
      expiresIn: 300,
      refreshToken
    }
  });

  assert.equal(tokenResponse.statusCode, 200);
  const tokenPayload = tokenResponse.json();
  assert.equal(typeof tokenPayload.token, "string");
  assert.equal(tokenPayload.expiresIn, 300);

  const validationResponse = await app.inject({
    method: "POST",
    url: "/v1/sso/validate",
    payload: {
      token: tokenPayload.token,
      domain: targetDomain
    }
  });

  assert.equal(validationResponse.statusCode, 200);
  const validationPayload = validationResponse.json();
  assert.equal(validationPayload.valid, true);
  assert.equal(validationPayload.userId, TEST_USER_ID);
  assert.equal(validationPayload.targetDomain, targetDomain);
  assert.equal(validationPayload.session.accessToken, TEST_USER_ID);
  assert.equal(validationPayload.session.refreshToken, refreshToken);

  const secondValidationResponse = await app.inject({
    method: "POST",
    url: "/v1/sso/validate",
    payload: {
      token: tokenPayload.token,
      domain: targetDomain
    }
  });
  assert.equal(secondValidationResponse.statusCode, 200);
  const secondValidationPayload = secondValidationResponse.json();
  assert.equal(secondValidationPayload.valid, false);
  assert.equal(secondValidationPayload.reason, "token_already_used");
});

test("POST /v1/sso/verticals returns active user verticals (fallback defaults)", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/v1/sso/verticals",
    headers: {
      authorization: `Bearer ${TEST_USER_ID}`
    }
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.ok(Array.isArray(payload.items));
  assert.ok(payload.items.length >= 2);
  assert.equal(payload.items.some((item: any) => item.vertical === "autos"), true);
  assert.equal(payload.items.some((item: any) => item.vertical === "propiedades"), true);
});
