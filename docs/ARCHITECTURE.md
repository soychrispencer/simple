# Arquitectura

**Ultima actualizacion:** 9 de mayo de 2026

## Vista General

```text
apps/* (Next.js 16 + React 19)
  - simpleadmin       :3000
  - simpleplataforma  :3001
  - simpleautos       :3002
  - simplepropiedades :3003
  - simpleagenda      :3004
          |
          v
services/api (Hono) :4000
          |
          v
PostgreSQL + Drizzle migrations
```

La vertical experimental retirada no debe agregarse de nuevo a `SimpleAppId`, rutas API, migraciones nuevas ni documentacion activa.

## Monorepo

```text
apps/            Aplicaciones Next.js por vertical/producto
packages/        Codigo compartido
services/api/    Backend Hono + Drizzle
scripts/         Automatizacion de mantenimiento
infrastructure/  Infraestructura/deploy
docs/            Documentacion activa
```

## Paquetes Compartidos

- `@simple/config`: branding, metadata, lifecycle de publicaciones y constantes de API.
- `@simple/types`: schemas y tipos compartidos con Zod.
- `@simple/utils`: helpers de formato, CRM, geocoding, media, slug, RUT y valuacion.
- `@simple/ui`: componentes UI compartidos y cards de listings.
- `@simple/auth`: contexto, modal y helpers de autenticacion frontend.
- `@simple/marketplace-header`: header/panel compartido para marketplaces.
- `@simple/listings-core`: hooks y helpers especificos de listings autos/propiedades.
- `@simple/logger`: logger estructurado para backend.

## Backend

`services/api/src/index.ts` aun orquesta muchas responsabilidades. El patron objetivo es:

```text
src/index.ts              composicion de app, CORS, errores y routes
src/db/                   schema, client y migraciones
src/modules/<dominio>/    router, service, schemas y helpers del dominio
src/lib/                  utilidades transversales
```

## Datos y Migraciones

Drizzle es la fuente de migraciones. La migracion `0041_remove_discontinued_vertical.sql` elimina tablas experimentales legacy de la vertical retirada y actualiza `users.primary_vertical` para aceptar solo `autos`, `propiedades` y `agenda`.

## Seguridad

- Sesion por cookie HttpOnly (`simple_session`).
- Password hashing con bcrypt.
- Verificacion de email y reset con tokens opacos hasheados.
- OAuth Google.
- Rate limiting por IP/email en auth.
- CORS controlado por `CORS_ORIGINS`.

## Reglas de Evolucion

- No crear nuevas verticales incompletas sin app, package, schema, docs y puertos definidos.
- Evitar logica destructiva en bootstrap del API; los cambios de DB deben ir por migraciones.
- Mantener `README.md`, `docs/PROJECT_STATUS.md` y `docs/ARCHITECTURE.md` alineados con paquetes y puertos reales.
