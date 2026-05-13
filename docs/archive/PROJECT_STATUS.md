# Simple - Estado Actual del Proyecto

**Ultima actualizacion:** 9 de mayo de 2026

## Resumen Ejecutivo

Simple es un monorepo pnpm con 5 aplicaciones Next.js, un backend Hono/TypeScript y paquetes compartidos. La vertical experimental retirada fue eliminada del codigo, schema y migraciones; cualquier tabla legacy se limpia con `0041_remove_discontinued_vertical.sql`.

## Apps Activas

| App | Package | Puerto local | Estado |
|---|---|---:|---|
| SimpleAdmin | `@simple/simpleadmin` | 3000 | Activa |
| SimplePlataforma | `@simple/simpleplataforma` | 3001 | Activa |
| SimpleAutos | `@simple/autos` | 3002 | Activa |
| SimplePropiedades | `@simple/propiedades` | 3003 | Activa |
| SimpleAgenda | `@simple/agenda` | 3004 | Activa |
| API | `@simple/api` | 4000 | Activa |

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4.
- Backend: Hono, Drizzle ORM, PostgreSQL, Zod.
- Monorepo: pnpm workspaces.
- Paquetes compartidos: `@simple/auth`, `@simple/config`, `@simple/listings-core`, `@simple/logger`, `@simple/marketplace-header`, `@simple/types`, `@simple/ui`, `@simple/utils`.

## Estado Tecnico

- Persistencia: Drizzle/PostgreSQL con migraciones versionadas.
- Auth: JWT en cookie HttpOnly, bcrypt, verificacion de email, OAuth Google y rate limiting basico.
- Pagos/Integraciones: Mercado Pago, Instagram, WhatsApp, storage S3-compatible y push notifications.
- Limpieza reciente: eliminadas referencias a la vertical retirada, componentes UI vacios, `packages/types/src/index.js` legacy y bootstrap destructivo de `subscriptions`.

## Prioridades

1. Terminar modularizacion de `services/api/src/index.ts` para reducir el monolito.
2. Agregar tests unitarios minimos en `@simple/types`, `@simple/utils`, `@simple/config` y API.
3. Consolidar tipos duplicados entre API, `@simple/types` y `@simple/listings-core`.
4. Adoptar `@simple/logger` en todo `services/api/src`.
5. Homologar scripts `lint`/`typecheck` en todas las apps.
