# Simple Monorepo

Monorepo de aplicaciones verticales con frontend en Next.js, backend en Hono y paquetes compartidos.

## Apps y puertos (desarrollo)

- `SimpleAdmin`: `http://localhost:3000`
- `SimplePlataforma`: `http://localhost:3001`
- `SimpleAutos`: `http://localhost:3002`
- `SimplePropiedades`: `http://localhost:3003`
- `SimpleAgenda`: `http://localhost:3004`
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
```

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

## Notas

- Evitar documentación histórica en este archivo; mantenerlo corto y operativo.
- Para cambios de arquitectura u operación, actualizar primero `docs/` y luego este resumen si aplica.
