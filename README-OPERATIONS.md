# Simple Monorepo — Guía de Operaciones (Ops)

Bienvenido a la guía de operaciones del monorepo "Simple". Aquí encontrarás la documentación de comandos, estructura de puertos y flujos de trabajo estandarizados de este repositorio.

## 🗺️ Mapa de Puertos de Desarrollo

Cuando ejecutes el entorno localmente, la arquitectura se expone en la siguiente configuración estandarizada:

| Servicio / Vertical | Puerto Local | Comando Dedicado |
| :--- | :--- | :--- |
| **API Backend** | `:4000` | `pnpm run dev:api` |
| **Simple Admin** | `:3000` | `pnpm run dev:simpleadmin` |
| **Simple Plataforma** | `:3001` | `pnpm run dev:simpleplataforma` |
| **Simple Autos** | `:3002` | `pnpm run dev:autos` |
| **Simple Propiedades**| `:3003` | `pnpm run dev:propiedades` |
| **Simple Agenda** | `:3004` | `pnpm run dev:agenda` |

## 🚀 Comandos Globales

Estos comandos se ejecutan **desde la raíz del monorepo** y actúan sobre todos los proyectos o levantan el entorno completo.

### Arranque
- `pnpm run dev:all` — Levanta simultáneamente el API y **todos** los frontends. Ideal para ver la plataforma completa conectada (utiliza *concurrently*).

### Calidad de Código (QA)
- `pnpm run lint` — Ejecuta ESLint en todo el código base (Frontend, Packages, Backend).
- `pnpm run typecheck` — Valida estrictamente todos los tipos TypeScript sin emitir archivos (`tsc --noEmit`).
- `pnpm run check` — Ejecuta Lint y Typecheck en cascada. Úsalo como filtro local antes de hacer un commit o push a producción.

### Testing (Fase 4 activada)
- `pnpm run test` — Ejecuta las pruebas unitarias (Vitest).
- `pnpm run test:watch` — Ejecuta las pruebas en modo recarga rápida interactiva.

### Base de Datos
- `pnpm run db:generate` — Genera nuevas migraciones (vía Drizzle) a partir del esquema.
- `pnpm run db:migrate` — Aplica las migraciones pendientes.
- `pnpm run db:seed` — Siembra la base de datos con datos de prueba/catálogo.

## 🏗️ Estructura del Proyecto

Este monorepo usa **pnpm workspaces** y está dividido semánticamente en tres capas:

1. `apps/` — Aplicaciones de cara al cliente (Next.js). Aquí viven los diferentes portales y el dashboard de administración.
2. `packages/` — Librerías centrales y estandarizadas (Sistema de Diseño, Autenticación, Configuración). Son independientes y altamente reutilizables.
3. `services/` — Microservicios o backend central (La API en Hono/Node).

## 💡 Mejores Prácticas (Standard Guidelines)

1. **Evitar Re-Exports locales**: No crees componentes clonados (como `auth-modal` o `theme-provider`) en las aplicaciones individuales. Importa siempre directamente desde los paquetes (`@simple/ui`, `@simple/auth`).
2. **Gobierno Visual CSS**: Cualquier cambio en el tema global debe realizarse en `packages/ui/src/theme-base.css` respetando siempre las capas de Tailwind (`@layer base, utilities, components`). Evita escribir CSS global directamente en las apps.
3. **Instalación de dependencias**: Para instalar una dependencia en un proyecto específico, usa el filtro de workspace. Ej: `pnpm add axios --filter=@simple/api`.
