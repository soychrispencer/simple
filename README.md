# Simple Monorepo

Monorepo de aplicaciones verticales con frontend en Next.js, backend en Hono y paquetes compartidos.

## Apps y puertos (desarrollo)

- `SimpleAdmin`: `http://localhost:3000`
- `SimplePlataforma`: `http://localhost:3001`
- `SimpleAutos`: `http://localhost:3002`
- `SimplePropiedades`: `http://localhost:3003`
- `SimpleAgenda`: `http://localhost:3004`
- `SimpleSerenatas`: `http://localhost:3005`
- `API`: `http://localhost:4000`

## Stack

- Frontend: Next.js 16 + React 19 + Tailwind
- Backend: Hono + TypeScript + Zod
- Monorepo: pnpm workspaces
- Paquetes compartidos: `packages/auth`, `packages/config`, `packages/listings-core`, `packages/logger`, `packages/marketplace-header`, `packages/types`, `packages/ui`, `packages/utils`

## Requisitos

- Node.js `>= 22`
- pnpm instalado globalmente

## Quick Start

```bash
pnpm install
pnpm run dev:all
```

## Comandos principales

```bash
# Desarrollo
pnpm run dev:all
pnpm run dev:simpleadmin
pnpm run dev:simpleplataforma
pnpm run dev:autos
pnpm run dev:propiedades
pnpm run dev:agenda
pnpm run dev:serenatas
pnpm run dev:api

# Validación
pnpm -r exec tsc --noEmit
pnpm run lint

# Build
pnpm run build

# DB (services/api)
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed

# Smoke marketplace (API debe estar corriendo)
pnpm --filter=@simple/api run smoke:marketplace
```

### Probar marketplace (Serenatas)

1. Migrar y seed: `pnpm --filter=@simple/api run db:migrate` y `pnpm --filter=@simple/api run db:seed:marketplace`
2. Levantar API: `pnpm run dev:api` (puerto 4000)
3. Smoke HTTP: `pnpm --filter=@simple/api run smoke:marketplace` (health + grupos/servicios públicos)
4. App: `pnpm --filter=@simple/serenatas run dev` → explorar **Grupos** y solicitar; con sesión dueño, aceptar/rechazar en **Solicitudes**
5. Tests unitarios marketplace: `pnpm --filter=@simple/api test -- marketplace`

Opcional: `SMOKE_SESSION_COOKIE=simple_session=...` para validar `/api/serenatas/groups` autenticado. Tras `db:seed:marketplace`, `SMOKE_PROVIDER_GROUP_ID=<uuid del grupo>` valida `GET /api/serenatas/marketplace/services?providerGroupId=...`.

### E2E Playwright (Serenatas)

Por defecto el job CI usa `PLAYWRIGHT_SKIP=1` (sin instalar Chromium). Para **E2E real** en local o en el job `e2e-serenatas-real`:

1. Base de datos: `pnpm --filter @simple/api run db:migrate` y `pnpm --filter @simple/api run db:apply:post-journal` (hasta **0057**).
2. Fixture demo: `pnpm --filter @simple/serenatas run e2e:seed` (equivale a `db:seed:serenatas-e2e`; imprime `SERENATAS_E2E_EMAIL` / `SERENATAS_E2E_PASSWORD`).
3. API (`pnpm run dev:api`) y app (`pnpm --filter @simple/serenatas run dev`, puerto 3005).
4. Copiar credenciales del seed en `apps/simpleserenatas/.env.local` (o exportar `SERENATAS_E2E_*` / `E2E_TEST_*` y `E2E_API_URL=http://localhost:4000`).
5. Primera vez: `cd apps/simpleserenatas && pnpm exec playwright install chromium`
6. Ejecutar:

```bash
PLAYWRIGHT_SKIP=0 pnpm --filter @simple/serenatas run test:e2e:real
```

Sin credenciales solo corren smoke públicos; con credenciales del seed se habilitan `e2e/admin-flow.spec.ts` (solicitudes → agenda → asignar grupo).

**GitHub Actions:** el job `e2e-serenatas` sigue con `PLAYWRIGHT_SKIP=1` (no instala Chromium). Para E2E real:

1. Definir secrets `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD` (cuenta verificada en la API objetivo).
2. Opcional `E2E_API_URL` apuntando a staging; si se omite, el job `e2e-serenatas-real` levanta Postgres + API local en el runner.
3. Ejecutar manualmente: Actions → CI → Run workflow → activar **Ejecutar E2E Serenatas real**; o dejar los secrets configurados para que el job corra en push/PR (solo si `E2E_TEST_EMAIL` está definido).

## Estructura

```text
apps/            Aplicaciones Next.js
packages/        Librerías compartidas
services/api/    Backend Hono
docs/            Documentación técnica y operativa
scripts/         Scripts de mantenimiento
infrastructure/  Infraestructura (Cloudflare/Workers)
```

## Documentación

Empieza en:

- `docs/INDEX.md` (índice general)
- `docs/DEVELOPMENT.md` (flujo de desarrollo)
- `docs/DEPLOYMENT_PLAYBOOK.md` (deploy/migraciones)

## Post-auditoría (mayo 2026)

Mejoras aplicadas en código (ver informes completos):

- `docs/AUDITORIA_TECNICA_EXPERTO.md` — CORS modularizado, lectura listing DB-first, webhook MP payments, tests API, cron Agenda con advisory lock, inventario Maps en `docs/API_MEMORY_MAPS.md`.
- `docs/AUDITORIA_VISUAL_BRANDING_UX.md` — alias `--danger`/`--success`, acento Propiedades `#3232FF`, wizard publicar Autos con mapeo listing→formulario.

Verificación rápida:

```bash
pnpm --filter @simple/ui build
pnpm --filter @simple/api build
pnpm --filter @simple/api test
```

## Notas

- Evitar documentación histórica en este archivo; mantenerlo corto y operativo.
- Para cambios de arquitectura u operación, actualizar primero `docs/` y luego este resumen si aplica.
