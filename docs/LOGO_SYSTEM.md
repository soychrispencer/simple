# Sistema de logos Simple

Guía breve para iconos de app (favicon, `icon.tsx`, `apple-icon.tsx`) en las verticales Next.js. No incluye assets binarios ni manuales de marca impresa.

## Fuente de verdad

- **Tokens por app:** `getSimpleBrandIconTokens(appId)` y `getSimpleAppBrand(appId)` en `@simple/config`.
- **Acento por vertical:** p. ej. SimpleAgenda `#0D9488`, SimpleAutos/Propiedades azul marca, SimpleSerenatas rosa.
- **Metadatos PWA:** `buildSimpleWebManifest(appId)` reutiliza los mismos tokens.

## Patrón en Next.js App Router

1. `src/app/icon.tsx` — 512×512 SVG dinámico con tokens.
2. `src/app/apple-icon.tsx` — 180×180, misma silueta/glyph que `icon.tsx` (no hardcodear hex salvo prototipo).
3. `layout.tsx` — `metadata` / manifest vía helpers de `@simple/config` cuando aplique.

## Reglas

| Regla | Detalle |
|-------|---------|
| Color | Usar `tokens.accent` y `tokens.glyph`; evitar duplicar hex en cada app. |
| Formato | SVG en rutas `icon` / `apple-icon` (content-type `image/svg+xml`). |
| Coherencia | Misma metáfora visual entre favicon y Apple touch (calendario Agenda, casa Propiedades, etc.). |
| Alcance | Esta guía cubre **iconografía de producto**; logos de terceros (MP, Google) van en integraciones, no aquí. |

## Estado por vertical (mayo 2026)

| App | `icon.tsx` tokens | `apple-icon.tsx` tokens |
|-----|-------------------|-------------------------|
| SimpleAgenda | Sí | Sí (pasada 14) |
| SimplePropiedades | Sí (pasada 15) | Sí (pasada 15) |
| SimpleAutos | Sí (pasada 15) | Sí (pasada 15) |
| SimpleSerenatas | Sí | Sí (pasada 15; 180×180 escalado) |

## PNG legacy en `/public` (mayo 2026)

**Preferir** `src/app/icon.tsx` y `src/app/apple-icon.tsx` con `getSimpleBrandIconTokens(appId)` para favicon y Apple touch. Los PNG solo deben quedar donde haya dependencia explícita (email, overlays Instagram API, `@simple/ui` shell).

| Archivo | App | Uso conocido | Acción |
|---------|-----|--------------|--------|
| `logo.png` | SimpleAutos | Overlay publicación Instagram (`listing-presentation.ts`); simulador hipotecario fetch en Propiedades no aplica | No borrar sin migrar overlay a SVG/tokens |
| `logo-light.png` | SimpleAutos | Variante clara para templates Instagram / shell `@simple/ui` | Idem |
| `logo.png` | SimplePropiedades | Overlay Instagram + `simulador-hipotecario/page.tsx` (`fetch('/logo.png')`) | Migrar simulador a tokens antes de eliminar |
| `logo-light.png` | SimplePropiedades | Templates Instagram / shell | Idem |

**Sin PNG en `public/` hoy:** SimpleAgenda, SimpleSerenatas, SimpleAdmin, SimplePlataforma (iconografía vía rutas dinámicas).

**Regla:** no eliminar PNG legacy sin confirmar referencias (`rg logo\\.png`, `rg logo-light` en monorepo).

## Pendientes de assets (auditoría ecosistema mayo 2026)

| Pendiente | Detalle | Acción recomendada |
|-----------|---------|-------------------|
| Wordmark horizontal Simple madre | No existe asset único en repo para marketing impreso | Diseño + export SVG; documentar en esta guía |
| Variantes light/dark por vertical | Algunas apps solo tienen `icon.tsx` dinámico | Completar `apple-icon.tsx` + guía de contraste |
| Deprecación PNG `logo.png` / `logo-light.png` | Autos y Propiedades aún los referencian (Instagram, simulador) | Migrar overlays a SVG/tokens; luego retirar PNG (ver tabla arriba) |
| Favicon Propiedades vs marca índigo | Histórico `#3b82f6` en assets viejos | Verificar despliegue actual de `icon.tsx` con tokens |

**Regla:** no eliminar PNG sin `rg logo\.png` / `rg logo-light` en monorepo.

## Qué queda fuera de este doc

- Auditoría UX completa: `docs/AUDITORIA_VISUAL_BRANDING_UX.md`.
