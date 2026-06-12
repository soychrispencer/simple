# @simple/ui

Componentes React compartidos del monorepo Simple (panel, ubicación, libreta de direcciones, branding).

## Requisitos

- Node ≥ 22
- `pnpm` en la raíz del monorepo

## Build (obligatorio antes de consumir)

Las apps importan el paquete compilado (`dist/`), no el fuente TypeScript:

```bash
pnpm --filter @simple/ui build
```

Tras un clone limpio o cambios en `src/`, hay que compilar `@simple/ui` antes de `next dev` o `next build` en apps que dependan de él. Tras cambiar UI: `pnpm --filter @simple/ui build` y `pnpm ensure:ui` en la raíz (los `dev:*` ya ejecutan `ensure:ui` si falta `dist/`).

### Desarrollo

En una terminal, deja el paquete recompilándose al guardar:

```bash
pnpm dev:ui:watch
```

En otra, levanta la app (los scripts `dev:*` del root ejecutan `ensure:ui` si falta `dist/`):

```bash
pnpm dev:serenatas
```

Apps con `transpilePackages: ['@simple/ui', …]` en `next.config` siguen necesitando `dist` o el watch anterior para tipos y resolución estable.

## Scripts del package

| Script | Descripción |
|--------|-------------|
| `build` | `tsc --build` → genera `dist/` |
| `dev` | `tsc --build --watch` |
| `typecheck` | Verificación sin emitir |
| `test` | Vitest (smoke) |

## Módulos principales

| Ruta | Contenido |
|------|-----------|
| `src/location/listing-location-editor.tsx` | `ListingLocationEditor`, `LocationMapPreview` |
| `src/address-book/address-book-manager.tsx` | `AddressBookManager` |
| `src/address-book/use-address-book-page.ts` | `useAddressBookPage` (CRUD libreta vía `@simple/utils`) |
| `src/avatar-upload.tsx` | `AvatarUpload` (recorte + subida vía callback) |
| `src/index.tsx` | Re-export del API público |

## Libreta de direcciones en apps

- **simpleautos / simplepropiedades**: página `/panel/mi-negocio/direcciones` con `useAddressBookPage` + `AddressBookManager`.
- **simpleserenatas**: direcciones en la SPA (`account_tab=addresses`), no usa la página Next de libreta.
- **simpleagenda**: API propia (`agenda-api`); no usar `useAddressBookPage`.

## AvatarUpload en apps

- **simpleserenatas**: cuenta con API `uploadAvatar` — uso directo.
- **simpleagenda**: mismo endpoint de media (`uploadAvatar` en agenda-api).
- **simpleautos / simplepropiedades**: la cuenta solo edita nombre/teléfono; el avatar público del negocio se gestiona por URL en «Página pública», no con subida de archivo en cuenta.

## Google Places

La libreta y el editor de ubicación usan la API clásica `google.maps.places.Autocomplete`. Está documentada como deuda técnica en `src/index.tsx`; migración futura a `PlaceAutocompleteElement`.
