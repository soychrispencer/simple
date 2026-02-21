#!/usr/bin/env node
/* eslint-disable no-console */

const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
const baseUrl = (
  baseArg?.split("=")[1] ||
  process.env.SIMPLE_API_BASE_URL ||
  "http://localhost:4000"
).replace(/\/+$/, "");

const timeoutMs = Number(process.env.SIMPLE_API_SMOKE_TIMEOUT_MS || 12000);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

async function requestJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: controller.signal
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { response, json };
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log(`[simple-api smoke] base=${baseUrl}`);

  const health = await requestJson("/api/health");
  assertCondition(health.response.status === 200, "Healthcheck failed");
  assertCondition(health.json?.ok === true, "Health payload invalid");
  console.log("[ok] /api/health");

  const autosListings = await requestJson("/v1/listings?vertical=autos&type=sale&limit=3");
  assertCondition(autosListings.response.status === 200, "Autos listings endpoint failed");
  assertCondition(Array.isArray(autosListings.json?.items), "Autos listings payload invalid");
  console.log(`[ok] /v1/listings autos (items=${autosListings.json.items.length})`);

  const propertiesListings = await requestJson(
    "/v1/listings?vertical=properties&type=sale&limit=3"
  );
  assertCondition(
    propertiesListings.response.status === 200,
    "Properties listings endpoint failed"
  );
  assertCondition(
    Array.isArray(propertiesListings.json?.items),
    "Properties listings payload invalid"
  );
  console.log(
    `[ok] /v1/listings properties (items=${propertiesListings.json.items.length})`
  );

  const first =
    autosListings.json.items[0] ||
    propertiesListings.json.items[0] ||
    null;

  if (!first) {
    console.log("[warn] listings returned 0 rows; skipping media/queue checks");
    return;
  }

  const media = await requestJson(`/v1/listings/${first.id}/media`);
  assertCondition(media.response.status === 200, "Listing media endpoint failed");
  assertCondition(Array.isArray(media.json?.items), "Listing media payload invalid");
  console.log(`[ok] /v1/listings/:id/media (items=${media.json.items.length})`);

  const queue = await requestJson("/v1/publish/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listingId: first.id,
      vertical: first.vertical,
      reason: "manual_retry"
    })
  });
  assertCondition(queue.response.status === 202, "Publish queue endpoint failed");
  assertCondition(queue.json?.status === "accepted", "Queue payload invalid");
  console.log("[ok] /v1/publish/queue");

  const upsertUnauthorized = await requestJson("/v1/listings/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vertical: "autos",
      listing: {
        title: "smoke unauthorized check",
        listing_type: "sale",
        status: "draft"
      },
      detail: {},
      images: [],
      replaceImages: true
    })
  });
  assertCondition(
    upsertUnauthorized.response.status === 401,
    "Listings upsert auth guard failed"
  );
  console.log("[ok] /v1/listings/upsert auth guard");
}

run()
  .then(() => {
    clearTimeout(timer);
    console.log("[simple-api smoke] success");
  })
  .catch((error) => {
    clearTimeout(timer);
    console.error("[simple-api smoke] failed:", error.message);
    process.exit(1);
  });
