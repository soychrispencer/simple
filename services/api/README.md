# simple-api

Fastify + TypeScript + Zod bootstrap for the 2026 backend migration.

## Scripts

- `npm run dev --workspace=simple-api`
- `npm run build --workspace=simple-api`
- `npm run test --workspace=simple-api`
- `npm run api:smoke -- --base=https://api-staging.simpleplataforma.app`

## Current scope (phase bootstrap)

- `GET /health`
- `GET /api/health`
- `GET /v1/listings`
- `GET /v1/listings/:id`
- `GET /v1/listings/:id/media`
- `POST /v1/publish/queue`

## Environment

- `LISTINGS_REPOSITORY=memory|supabase` (default: `memory`)
- `SUPABASE_URL` (required when `LISTINGS_REPOSITORY=supabase`)
- `SUPABASE_SERVICE_ROLE_KEY` (required when `LISTINGS_REPOSITORY=supabase`)
- `API_HOST` (default: `0.0.0.0`)
- `API_PORT` (default: `4000`)

For staging smoke validation:

```bash
npm run api:smoke -- --base=https://api-staging.simpleplataforma.app
```

## Docker / Coolify

- Dockerfile path: `services/api/Dockerfile`
- Port: `4000`
- Healthcheck path: `/api/health`
