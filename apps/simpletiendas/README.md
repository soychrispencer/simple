# SimpleTiendas

Vertical de tiendas dentro del monorepo **Simple Ecosystem**.

## 🧱 Stack
- Next.js 16 (App Router)
- React 19
- TypeScript 5.7
- Tailwind CSS (preset compartido)
- Supabase (cliente en `src/lib/supabase/*`)

## ▶️ Desarrollo
Desde la raíz del monorepo:
- `npm run dev:tiendas`

O dentro del vertical:
- `npm run dev`

Puertos:
- Dev/Start: `3002`

## 🧩 Packages compartidos
Importa siempre desde entrypoints:
- `@simple/ui`, `@simple/auth`, `@simple/config`, `@simple/shared-types`

Excepción intencional:
- `@simple/config/tailwind-preset`
- `@simple/config/tokens.css`

## ✅ Checks
- Lint: `npm run lint`
- Types: `npm run typecheck`
