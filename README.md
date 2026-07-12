# Simple

Monorepo de aplicaciones verticales de marketplace con frontend en Next.js, backend en Hono y paquetes compartidos.

## Stack

- **Frontend:** Next.js 16 + React 19 + Tailwind CSS
- **Backend:** Hono + TypeScript + Zod + Drizzle ORM
- **Base de datos:** PostgreSQL
- **Monorepo:** pnpm workspaces
- **Deploy:** Docker + Coolify

## Apps

| App | Puerto | Descripción |
|-----|--------|-------------|
| `@simple/admin` | 3000 | Panel administrativo |
| `@simple/plataforma` | 3001 | Gestión de plataforma |
| `@simple/autos` | 3002 | Marketplace de vehículos |
| `@simple/propiedades` | 3003 | Marketplace de propiedades |
| `@simple/agenda` | 3004 | Agenda y reservas para profesionales |
| `@simple/serenatas` | 3005 | Marketplace de serenatas y eventos musicales |
| `@simple/api` | 4000 | Backend API |

## Paquetes compartidos

| Paquete | Descripción |
|---------|-------------|
| `@simple/ui` | Componentes de UI reutilizables |
| `@simple/utils` | Utilidades (pagos, mensajes, notificaciones, etc.) |
| `@simple/types` | Tipos TypeScript compartidos |
| `@simple/config` | Configuración de marca y URLs |
| `@simple/auth` | Contexto de autenticación |
| `@simple/logger` | Logger estructurado |
| `@simple/marketplace-header` | Header compartido de marketplace |

## Requisitos

- Node.js >= 22
- pnpm instalado globalmente
- PostgreSQL (para el API)

## Quick Start

```bash
pnpm install
pnpm run dev:all
```

## Comandos

```bash
# Desarrollo
pnpm run dev:all              # Todas las apps + API (webpack; menos RAM)
pnpm run dev:all:turbo        # Igual, con Turbopack (más rápido, mucho más RAM)
pnpm run dev:api              # Solo API
pnpm run dev:autos            # Solo SimpleAutos (Turbopack)
pnpm run dev:propiedades      # Solo SimplePropiedades
pnpm run dev:agenda           # Solo SimpleAgenda
pnpm run dev:serenatas        # Solo SimpleSerenatas
pnpm run dev:ui:watch         # Recompila @simple/ui al editar el paquete compartido

# Build
pnpm run build                # Todas las apps y packages

# Validación
pnpm run lint                 # ESLint
pnpm run typecheck            # TypeScript check

# Base de datos
pnpm run db:generate          # Generar migraciones
pnpm run db:migrate           # Aplicar migraciones
pnpm run db:seed              # Seed inicial
```

## Estructura

```
apps/               Aplicaciones Next.js
packages/           Librerías compartidas (ui, utils, types, config, auth, logger)
services/api/       Backend Hono + PostgreSQL
docs/               Documentación de deploy
scripts/            Scripts de mantenimiento y deploy
infrastructure/     Workers de Cloudflare
```

## Deploy

Ver `docs/DEPLOYMENT_PLAYBOOK.md` y `docs/COOLIFY_DEPLOYMENT.md`.
