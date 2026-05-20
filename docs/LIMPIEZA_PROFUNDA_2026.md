# Limpieza profunda del monorepo Simple — Mayo 2026

**Fecha:** 2026-05-19
**Alcance:** Auditoría con `npx knip`, grep de referencias, comparación de duplicados, eliminación solo de código muerto verificado.
**Verificación:** `pnpm run typecheck` ✅ · `pnpm --filter @simple/api test` (82 tests) ✅ · `pnpm --filter @simple/ui build` ✅
**Commits:** ninguno (cambios locales sin commitear).

---

## Resumen ejecutivo

Se eliminaron **47 archivos** (~**6.500 líneas** estimadas) confirmados sin referencias en el monorepo: flujo **QuickPublish** obsoleto en SimpleAutos (reemplazado por `panel/publicar` V2 inline), re-exports shim `@/lib/*` → `@simple/utils` en marketplace, barrels API nunca importados, extracciones huérfanas (`cloudflare-overlay`, `ingest-auth`, `mailer`, `schemas`), componentes Propiedades sin consumidor, y scripts one-off de parcheo ya documentados como retirados.

**No se tocó:** migraciones Drizzle, `scripts/archive/*`, redirects legacy Serenatas, tests `legacy-packages`, `sw.js` de Agenda, worker `infrastructure/cloudflare/workers/instagram-overlay`, `migrate-to-cloudflare.ts`, ni deuda funcional grande (CRM ~1.7k líneas duplicado, god file API ~2.3k líneas).

Herramienta **knip** reportó además 254 exports y 16 dependencias sin uso — **no eliminados** en esta pasada (riesgo de romper API pública o falsos positivos de Next.js).

---

## Métricas

| Métrica | Valor |
|--------|-------|
| Archivos eliminados | **47** |
| Líneas aprox. eliminadas | **~6.500** |
| `pnpm run typecheck` | ✅ 15/15 workspaces |
| `@simple/api` tests | ✅ **82/82** (29 archivos) |
| `@simple/ui` build | ✅ |

---

## Tabla — archivos eliminados

| Ruta | Motivo |
|------|--------|
| `auth-email.ts` (raíz) | Archivo vacío, sin imports |
| `apps/simpleadmin/src/lib/env-validation.ts` | Shim sin uso (solo Autos valida en layout) |
| `apps/simpleagenda/src/lib/env-validation.ts` | Idem |
| `apps/simpleplataforma/src/lib/env-validation.ts` | Idem |
| `apps/simplepropiedades/src/lib/env-validation.ts` | Idem |
| `apps/simpleautos/src/lib/crm.ts` | Re-export `@simple/utils`; apps importan paquete |
| `apps/simpleautos/src/lib/listing-leads.ts` | Idem |
| `apps/simpleautos/src/lib/media-upload.ts` | Idem |
| `apps/simpleautos/src/lib/public-profile-settings.ts` | Idem |
| `apps/simpleautos/src/lib/social-feed.ts` | Idem |
| `apps/simpleautos/src/lib/quick-image-utils.ts` | Solo usado por QuickPublish |
| `apps/simpleautos/src/actions/detect-vehicle-color.ts` | Solo QuickPublish |
| `apps/simpleautos/src/actions/generate-listing-text.ts` | Solo QuickPublish |
| `apps/simpleautos/src/actions/get-price-reference.ts` | Solo QuickPublish |
| `apps/simpleautos/src/hooks/useQuickPublish.ts` | Solo QuickPublish |
| `apps/simpleautos/src/components/quick-publish/*` (10 archivos) | Flujo no enlazado desde App Router; `publicar/page.tsx` es V2 inline |
| `apps/simplepropiedades/src/lib/crm.ts` | Shim muerto |
| `apps/simplepropiedades/src/lib/listing-leads.ts` | Idem |
| `apps/simplepropiedades/src/lib/media-upload.ts` | Idem |
| `apps/simplepropiedades/src/lib/public-profile-settings.ts` | Idem |
| `apps/simplepropiedades/src/lib/social-feed.ts` | Idem |
| `apps/simplepropiedades/src/lib/mortgage-utils.ts` | Solo `MortgageAdvisor` |
| `apps/simplepropiedades/src/components/MortgageAdvisor.tsx` | Sin imports en app |
| `apps/simplepropiedades/src/components/listings/property-filters.tsx` | Sin imports |
| `apps/simplepropiedades/src/components/featured/recent-listings-slider.tsx` | Sin imports (Autos tiene el suyo en `featured/`) |
| `apps/simpleserenatas/src/lib/serenata-operational-groups.ts` | Solo comentarios/docs; sin imports TS |
| `packages/ui/src/listing-card/index.ts` | Barrel duplicado; `index.tsx` exporta directo |
| `services/api/src/lib/index.ts` | Barrel sin consumidores |
| `services/api/src/modules/auth/index.ts` | Idem |
| `services/api/src/modules/mercadopago/index.ts` | Idem |
| `services/api/src/modules/whatsapp/index.ts` | Idem |
| `services/api/src/modules/instagram/cloudflare-overlay.ts` | Extracción nunca cableada; lógica en monolito/listing-presentation |
| `services/api/src/modules/leads/ingest-auth.ts` | Duplicado de `isLeadIngestAuthorized` inline en `index.ts` |
| `services/api/src/modules/shared/mailer.ts` | Módulo sin imports |
| `services/api/src/db/seed-subscription-plans.ts` | Sin script `package.json` ni import |
| `services/api/src/modules/public-profile/schemas.ts` | Schemas Zod huérfanos |
| `services/api/src/modules/vehicle-valuation/types.ts` | Tipos duplicados en `vehicle-valuation/index.ts` |

**Nota:** Scripts `patch-*`, `fix-mojibake`, `_patch-crm-inline`, etc. ya constaban eliminados en `scripts/README.md` (mayo 2026); no estaban en disco en esta pasada.

---

## Tabla — deuda grande (NO eliminada)

| Área | Ubicación | Estimación | Notas |
|------|-----------|------------|-------|
| God file API | `services/api/src/index.ts` | **~2.345 líneas** | Routers modulares montados; lógica Instagram/leads aún inline |
| CRM panel duplicado | `apps/simpleautos` + `simplepropiedades` `panel/crm/page.tsx` | **~1.739 / 1.734 líneas** | Mismo patrón; diffs menores por vertical |
| Página mensajes | `panel/mensajes/page.tsx` (autos/prop) | **~295 líneas** c/u | Casi idénticas |
| Estadísticas panel | `panel/estadisticas/page.tsx` | **~120 líneas** c/u | **Hash idéntico** entre autos y propiedades |
| `messages.ts` / `boost.ts` lib | autos vs propiedades | 37 / 72 líneas | Misma estructura, distinto vertical en tipos |
| Subscription wrapper | `subscription-manager.tsx` | 24 líneas c/u | **Hash idéntico** (wrapper fino sobre `@simple/ui`) |
| Agenda suscripciones | `simpleagenda/.../subscription-manager.tsx` | **~168 líneas** | Implementación inline distinta a marketplace |
| QuickPublish docs | `docs/SIMPLEAUTOS_ARQUITECTURA_COMPLETA.md` | — | Referencias obsoletas al flujo eliminado |
| Knip: exports no usados | API + apps + UI | **254** | Muchos son API de panel “por usar” o barrels intencionales |
| Knip: dependencias | `clsx`, `@simple/listings-core`, `twilio`, etc. | **16** | Revisar antes de quitar de `package.json` |
| `ingest-auth` deuda | `index.ts` vs módulo | — | Eliminar duplicación **inline** → módulo (refactor, no delete) |
| `cloudflare-overlay` | API vs Worker infra | — | Cablear extracción o borrar doc desactualizado en `API_MEMORY_MAPS.md` |
| Instagram deps | `@google/generative-ai` en autos | knip unused | Usado en rutas server? Revisar dynamic |
| Legacy Serenatas | paquetes, redirects, `legacySerenataPackagesEnabled` | — | **Intencional** — tests y flags |
| Archive scripts | `services/api/scripts/archive/*` | 8 archivos | Documentados en `BACKEND_CONTROL.md` |

---

## Duplicación >80% (candidatos a unificación futura)

| Par | Similitud | Acción esta pasada |
|-----|-----------|-------------------|
| `estadisticas/page.tsx` (autos ↔ prop) | **100%** (mismo hash) | No unificar — deuda documentada |
| `subscription-manager.tsx` wrapper | **100%** | Ya unificado en `@simple/ui` |
| `panel/crm/page.tsx` | **~95%+** (~5 líneas diff) | No tocar |
| `panel/mensajes/page.tsx` | **~98%** | No tocar |
| `lib/messages.ts`, `lib/boost.ts` | Alta | No tocar |

---

## Hallazgos knip / grep (TODO–legacy)

- **TODO activo:** `apps/simpleautos/.../home-searchbox.tsx` — reactivar redirección búsqueda.
- **TODO:** `apps/simpleagenda/.../configuracion/page.tsx` — lógica completitud onboarding.
- **Legacy Serenatas:** redirects `?section=`, rutas EN→ES, `@deprecated` en API/router — **mantener**.
- **Marcadores `legacy` en API:** compatibilidad `repeatWeekly`, tablas deprecated en schema (aliases) — **mantener**.

---

## Recomendaciones priorizadas

### P0
1. **Extraer `panel/crm/page.tsx`** a `@simple/ui` o `packages/listings-core` con prop `vertical: 'autos' \| 'propiedades'` — mayor ROI (~3.4k líneas).
2. **Continuar desglose de `services/api/src/index.ts`** — cablear `ingest-auth` y eliminar duplicado inline; recuperar valor de extracciones ya hechas.

### P1
3. Unificar **`estadisticas/page.tsx`** y **`mensajes/page.tsx`** marketplace en componente compartido.
4. Actualizar **`docs/SIMPLEAUTOS_ARQUITECTURA_COMPLETA.md`** post-eliminación QuickPublish.
5. Añadir **`knip.json`** por workspace para CI (report-only) y reducir ruido de Next entrypoints.
6. Revisar dependencias knip-unused (`clsx` en serenatas unlisted vs declared en otros paquetes).

### P2
7. Eliminar **exports muertos** en `@simple/ui` de forma incremental (254 reportados).
8. Evaluar **Agenda `subscription-manager`** vs wrapper marketplace.
9. Conectar o eliminar **`seed-subscription-plans`** como script `db:seed:plans` si sigue siendo necesario operativamente.
10. Auditoría **`.cursor/skills`** — solo 2 skills activos; sin duplicados detectados.

---

## Conservado a propósito

- `apps/simpleagenda/public/sw.js` — registrado en `use-push-notifications.ts`
- `apps/simpleautos/src/lib/env-validation.ts` — usado en `layout.tsx`
- `services/api/src/db/apply-pending-migrations.ts` — usado por scripts archive/documentación Drizzle
- `scripts/migrate-to-cloudflare.ts` — playbook de migración storage
- `infrastructure/cloudflare/workers/instagram-overlay/` — deploy Wrangler independiente
- Tests `legacy-packages.test.ts`, redirects Serenatas, migraciones SQL

---

## Comandos de verificación reproducibles

```bash
npx knip --no-progress
pnpm run typecheck
pnpm --filter @simple/api test
pnpm --filter @simple/ui build
```

---

*Generado en auditoría profunda mayo 2026. Sin commits.*
