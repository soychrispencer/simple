# Backend (Supabase)

Este directorio contiene el proyecto Supabase del ecosistema Simple.

## Estructura

- `config.toml`: configuración del CLI (puertos, auth templates, storage, etc.).
- `migrations/`: **solo 2 archivos** (baseline schema + baseline seed) para mantener el **contexto real** del backend.
- `functions/`: edge functions (Deno). Actualmente solo configuración.
- `templates/`: plantillas de email usadas por Supabase Auth.

## Comandos (desde la raíz del repo)

- Desarrollo local
  - `npm run supabase:start`
  - `npm run supabase:db:reset`

- Deploy de migraciones
  - `npm run supabase:db:push` (linked)
  - `npm run supabase:db:push:staging`
  - `npm run supabase:db:push:prod`

## Nota sobre seeds

Los “seeds” de catálogo (verticales, catálogo, features, planes) están versionados como migraciones.
Esto permite que el catálogo se aplique también vía `db push` en entornos remotos.

## Contexto del backend (lo que importa)

En este repo dejamos el backend alineado manteniendo **solo**:

- `backend/supabase/migrations/*_baseline_schema.sql`
- `backend/supabase/migrations/*_baseline_seed.sql`

Nota: si tu Supabase remoto ya tiene todo aplicado, estas migraciones se usan principalmente para mantener el **contexto del schema/datos** dentro del repo (no para re-aplicarlas).

