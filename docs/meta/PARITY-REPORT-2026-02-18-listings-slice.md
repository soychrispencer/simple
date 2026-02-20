# Parity Report - Listings + Media + Publish Queue (Slice 1)

- Date: 2026-02-18
- Owner: Christian
- Scope: Fase 2 bootstrap (`services/api`)
- Status: Draft (pending staging approval)

## Compared flows

- `GET /v1/listings`
- `GET /v1/listings/:id`
- `GET /v1/listings/:id/media`
- `POST /v1/publish/queue` (accepted response contract)

## Evidence

- Contract tests (`simple-api`) green:
  - `npm run test --workspace=simple-api`
- Typecheck (`simple-api`) green:
  - `npm run typecheck --workspace=simple-api`
- Build + typecheck (`simpleautos`) green with feature-flag wiring:
  - `npm run typecheck --workspace=simpleautos`
  - `npm run build --workspace=simpleautos`

## Current match assessment

- Contract compatibility: **High** (schema-level pass in tests).
- Runtime parity in staging: **Pending** (smoke on staging with `LISTINGS_REPOSITORY=supabase` still required).

## Known deviations

1. Current `simple-api` list payload is intentionally minimal (slice bootstrap).
2. UI card enrichment fields (`year`, `mileage`, seller profile full data) may be null when reading from `simple-api`.
3. Media retrieval is currently one request per listing (`/media`), acceptable for bootstrap but should be optimized in later slices.

## Rollout status

- Feature flag implemented in `simpleautos` home slider:
  - `NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS`
  - `NEXT_PUBLIC_SIMPLE_API_BASE_URL`
- Fallback strategy active:
  - `simple-api` -> existing boost/supabase flow when error or empty response.

## Go/No-Go recommendation

- **Go for staging dark traffic** with flag OFF by default.
- Enable flag only in staging/internal after smoke success:
  - `npm run api:smoke -- --base=<staging-api-base>`
- Do not enable production traffic until staging parity is validated and documented as approved.
