---
name: Patrones del repositorio Simple
description: Convenciones de codigo y arquitectura del monorepo
type: project
---

## Arquitectura del Monorepo

- **Estructura**: Monorepo con npm workspaces
- **Apps**: simpleautos, simplepropiedades, simpleadmin, simpleplataforma, simpleagenda
- **Services**: api (Hono + Node.js)
- **Packages**: auth, config, types, ui, utils

## Convenciones de Nomenclatura

- **Apps Next.js**: App Router, directorio `src/app/`
- **Componentes React**: PascalCase para archivos (ej: `panel-shell.tsx`)
- **Funciones utilitarias**: camelCase con prefijo contextual (ej: `fmtDate`, `fmtCLP`)
- **APIs frontend**: Archivos `*-api.ts` en `src/lib/`
- **Tipos**: Sufijo por dominio (ej: `AgendaService`, `BoostOrder`)

## Patrones de API

- **Base URL**: `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'`
- **Autenticacion**: Cookies HttpOnly con JWT
- **Funciones API**: `fetchXxx()`, `createXxx()`, `updateXxx()`, `deleteXxx()`

## Stack Tecnologico

- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **Backend**: Hono, Zod, TypeScript
- **BD**: Drizzle ORM + PostgreSQL
- **Iconos**: Tabler Icons React

## Patron de Auth

- **Contexto**: AuthProvider en packages/auth
- **Hook**: useAuth() para acceso al contexto
- **Modal**: AuthModal para login/registro
- **Guard**: AuthGuard para rutas protegidas

## Pendientes Criticos

- **Tests**: No hay tests en el repositorio
- **Logs**: console.log/error dispersos en produccion
- **Duplicacion**: Archivos identicos entre simpleautos y simplepropiedades