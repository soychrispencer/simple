# Scripts

Scripts de utilidad para operar/mantener el repo. La idea es que no haya “one-offs” sueltos: si un script se usa, queda documentado aquí y/o referenciado desde `package.json`.

## `catalog/`

- `catalog_audit.mjs` — genera un reporte de auditoría del catálogo.
  - Ejecuta: `npm run catalog:audit`
  - Output: `docs/catalog/catalog-audit-output.md`

## `supabase/`

- `supabase-push.mjs` — hace `supabase db push` contra `staging` o `prod` usando `SUPABASE_STAGING_DB_URL` / `SUPABASE_PROD_DB_URL`.
  - Ejecuta: `npm run supabase:db:push:staging` / `npm run supabase:db:push:prod`
- `migrate_vehicle_boosts.mjs` — migración puntual legacy → nuevo esquema de boosts.
  - Dry run: `node scripts/supabase/migrate_vehicle_boosts.mjs`
  - Apply: `node scripts/supabase/migrate_vehicle_boosts.mjs --apply`

## `seed/`

Scripts para validar y mantener el baseline seed (en `backend/supabase/migrations/*_baseline_seed.sql`).

- `validate_seed_models.js` — valida marcas referenciadas / definidas y stats por tipo.
- `reorder_models.mjs` — reordena el bloque de modelos por tipo (edita el baseline seed).
- `check_communes.js` — valida conteo de comunas por región leyendo el baseline seed.

Comandos npm (desde el root):

- `npm run seed:validate-models`
- `npm run seed:check-communes`
- `npm run seed:reorder-models`
- `npm run seed:all`

## `dev/`

- `setup-env.ps1` — copia variables Supabase desde un `.env` root hacia `backend/supabase/.env` y `apps/*/.env.local` usando los `.env.example`.
  - Ejecuta: `npm run env:setup` (Windows)
  - Alternativa: `pwsh scripts/dev/setup-env.ps1`
