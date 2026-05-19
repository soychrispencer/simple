# Inventario de Maps en memoria — API Simple

**Última actualización:** mayo 2026  
**Contexto:** `services/api/src/index.ts` carga datos al arranque vía `loadDataFromDB()` y mantiene estado en `Map` por proceso. Con **N réplicas**, cada instancia puede divergir hasta reinicio.

## Maps principales

| Map | Propósito | Mutación en runtime | Riesgo multi-réplica |
|-----|-----------|---------------------|----------------------|
| `usersById` | Usuarios y sesiones legacy | Alta (auth, perfil) | Medio |
| `listingsById` | Listings autos/propiedades | Alta (CRUD panel) | **Alto** |
| `listingIdsByUser` | Índice owner → listing ids | Alta | Alto |
| `paymentOrdersByUser` | Órdenes MP checkout/confirm | Alta | **Alto** (hidrata pending + 30 días al arranque) |
| `activeSubscriptionsByUser` | Suscripciones activas | Media | Alto |
| `authRateLimitBuckets` | Rate limit auth (proceso) | Alta | Alto (bypass × N) |
| `listingLeadCountsByListing` | Contadores leads | Media | Medio — sync batch al arranque (activos ≤10k, agregado SQL) |
| `processedMercadoPagoWebhookPaymentIds` | Idempotencia webhook payments | Alta | Medio (por instancia) |

## Flujos ya migrados / parcialmente a Drizzle

| Flujo | Estado |
|-------|--------|
| `GET /api/listings/:id` (detalle panel) | **DB-first** — `getListingByIdFromDb` → `fetchListingRowById` + `fetchLeadCountByListingId` |
| `GET /api/listings` (listado panel) | **DB-first** — `listListingsFromDb` → `fetchListingRowsForPanel` + `fetchLeadCountsForListingIds` |
| `PUT/PATCH/DELETE/POST …/api/listings/:id` (mutaciones panel) | **DB-first lectura** — `resolvePanelListing` usa `getListingByIdFromDb` cuando está cableado |
| `getListingBySlug()` / slug público | **DB-first** — `listings.hrefSlug` en Drizzle; sin escaneo de `listingsById` |
| `GET /api/public/listings/:slug` | **DB-first** — `fetchListingRowByHrefSlug` (pasada 6) |
| `GET /api/public/profiles/:slug` | **DB-first** — `fetchActivePublicListingRowsForOwner` para listados del vendedor (pasada 6) |
| `getListingByPortalExternalId()` | **DB-first** — consulta por `vertical` + mapper; sin caché Map previa |
| `listFeaturedBoosted()` (destacados boost) | **DB fallback** — `getListingById` si el listing no está en `listingsById` |
| `GET /api/messages/threads*` (`messageThreadToResponse`) | **DB fallback** — listing del hilo vía `getListingById` |
| `listingLeadToResponse` (index / leads / messages) | **DB fallback** — listing del lead vía `getListingById` |
| Webhook MP `payments` / confirm | **DB-first hydrate** — `loadPaymentOrderFromDb` + `upsertPaymentOrder` si falta en Map; `POST /payments/confirm` igual |
| `GET /api/payments/orders` (listado) | **DB-first** — `listPaymentOrdersForUserFromDb` si Map vacío |
| `updatePaymentOrder` | **DB hydrate** — carga desde PostgreSQL si la orden no está en Map |
| Checkout MP (`POST /payments/checkout`) | **Escritura dual** — `upsertPaymentOrder` / `updatePaymentOrder` persisten en `payment_orders` (`metadata.orderExternalId` = id MP) |
| `getListingById()` helper global | Drizzle + upsert en caché (legacy) |
| Agenda recordatorios cron | Solo Drizzle en queries |
| Marketplace Serenatas (0049) | Drizzle en `marketplace.ts` |
| `POST /api/listings` / `PATCH /api/listings/:id` (panel) | **Escritura dual** — `insertListingRecord` / `saveListingRecord` persisten en PostgreSQL; `upsertListingCache` sincroniza `listingsById` + `listingIdsByUser` |
| `DELETE /api/listings/:id` | **Escritura Map** — elimina fila en DB y `listingsById.delete` + índice `listingIdsByUser` |
| `getListingById()` / persist on miss | **DB-first hydrate** — lectura Drizzle → `upsertListingCache` (Map + índice owner) si falta en caché |
| Alta lead listing (`createListingLead`) | **DB-first sync** — tras insert en `listing_leads`, `syncListingLeadCountFromDb` recuenta desde PostgreSQL y actualiza Map caché |
| `incrementListingLeadCount` (legacy) | Reemplazado por `syncListingLeadCountFromDb` | — |
| `GET /api/social/saved` (favoritos) | **DB-only** — `getSavedListingsByUser` join Drizzle `saved_listings` + `listings` + `users` (sin Map) |
| `GET /api/boost/featured` (`listFeaturedBoosted`) | **DB fallback** — listing por orden boost vía `getListingById` si no está en `listingsById` |

## Endpoints que aún priorizan Map

- Muchas rutas legacy en `index.ts` (~7.9k líneas tras pasada 7)

## CIERRE FINAL (mayo 2026)

- **Fuente de verdad:** PostgreSQL para lecturas panel, pagos, público y marketplace Serenatas.
- **Caché en proceso:** `listingsById`, `paymentOrdersByUser`, `usersById` — hidratación al arranque + dual-write en mutaciones; no usar como única fuente en nuevas rutas.
- **Multi-réplica:** asumir divergencia hasta reinicio o `REDIS_URL` para rate limit compartido; listings/órdenes requieren DB o caché distribuida futura.
- **`index.ts`:** ~**2.19k** líneas (CIERRE mayo 2026); schemas en `lib/request-schemas.ts`; row mapper en `listings/row-mapper.ts`; lead routing en `listings/lead-routing-assignment.ts`; env admin en `lib/env-status.ts`; búsqueda pública SQL en `public-search-sql.ts`; auth/sesión en `modules/auth/session-runtime.ts`; arranque Maps en `cache/startup-load.ts`.

## Montaje Hono (`index.ts`, pasada 12)

| Zona | Líneas aprox. | Contenido |
|------|---------------|-----------|
| Dominio + Maps + helpers | 1–~5305 | Tipos, cachés en memoria, CRM/mensajes/valuation; wiring `createStartupDataLoader` + `createListingLeadIngestHelpers` |
| `const app = new Hono()` | ~5307 | CORS, error handler global |
| `app.route(...)` routers | ~5350–6265 | system, auth, listings, boost, payments, admin, crm, serenatas, agenda, public, media, … |
| Bootstrap servidor | ~6278–6310 | migraciones, `loadDataFromDB()` (desde `cache/startup-load.ts`), `serve()` |

**Arranque Maps:** `createStartupDataLoader({ maps, boostListingsSeed, mappers… })` — hidrata users, accounts, listings, boost seed, lead counts, saved/follows, Instagram, address book, `loadPaymentOrdersCache()`.

## Pasada pendientes 12 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `cache/startup-load.ts` | `loadDataFromDB` (~200 líneas) con deps inyectados (Maps, mappers, `applyLeadCountsToListingCache`, `loadPaymentOrdersCache`) |
| `listings/listing-lead-ingest.ts` | `createOrAppendListingConversation`, import/acción contacto, `createListingLeadRecord` (~390 líneas) |
| `index.ts` | **~6.85k → ~6.31k** (~537 líneas netas menos) |
| Tests | `listing-lead-ingest.test.ts` (`buildListingLeadActionExternalSourceId`) |
| Verificación | `pnpm run typecheck` + `@simple/api test` (53) + `smoke:marketplace` ✅ |

## Pasada pendientes 10 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| Auth email DRY | `index.ts` importa `lib/auth-email.ts` + `session-cookie.ts`; eliminado bloque duplicado (~**637** líneas netas; **~7.6k → ~7.0k**) |
| Serenatas / mortgage | Sin bloques legacy nuevos en monolito: `app.route('/api/serenatas', createSerenatasRouter)`; mortgage/UF en `modules/public/router.ts` |
| Smoke pasada 7 | `smoke-marketplace.ts` sigue cubriendo `mortgage-rates` + `uf-value` + health/CORS |
| Tests | 51 tests `@simple/api`; `pnpm run typecheck` monorepo ✅ |

## Pasada pendientes 7 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| Admin snapshots | `listAdminUsersSnapshot` / `listAdminListingsSnapshot` solo en `modules/admin/snapshots.ts` (~**195** líneas menos en monolito) |
| Listings persist | `upsertListingCache` actualiza `listingIdsByUser` tras insert/save/hydrate |
| DRY slug | `extractListingSlugCandidate` import desde `listings/public-present.ts` |
| Smoke | `GET /api/public/mortgage-rates` + `/api/public/uf-value` |

## Pasada pendientes 5 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| Lead counts arranque | `fetchActiveListingIdsForLeadCountSync` + `fetchLeadCountsForListingIdsBatched` (límite 10k activos, lotes 500) en `loadDataFromDB`; reemplaza scan fila-a-fila de `listing_leads` |
| Social feed DRY | `index.ts` delega en `modules/social/feed.ts` (`buildSocialFeedClips`); ~115 líneas duplicadas eliminadas del monolito |
| Tests | `lead-count.test.ts` (`applyLeadCountsToListingCache`) |

## Pasada pendientes 4 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `listings/location.ts` | Geocode local/remoto, labels públicos, schemas Zod (`geocodeLocationRequestSchema`) |
| Panel listings router | `getListingByIdFromDb`, `listListingsFromDb`, `resolvePanelListing` en mutaciones |
| Tests | `location.test.ts` (comuna seed, hidden, humanize) |

## Pasada pendientes 3 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `portal-coverage.ts` | `getPortalCoverage` / autos / propiedades (~170 líneas) |
| Dedup `portals.ts` | Eliminadas copias en `index.ts` (helpers import, metadata integraciones) |
| Leads post-insert | `syncListingLeadCountFromDb` — `fetchLeadCountByListingId` |
| Tests | `portal-coverage.test.ts` |

## Pasada pendientes 20 — GIN jsonb, auth/sesión, smoke brand (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `0054_listings_public_search_gin.sql` | GIN `jsonb_path_ops` en `listings.raw_data` y `listings.location_data` (filtros `public-search-sql.ts`) |
| `modules/auth/session-runtime.ts` | JWT cookie, `requireVerifiedSession`, OAuth/Instagram state cookies |
| `modules/auth/user-auth.ts` / `admin-guard.ts` | `getUserByEmail`, `canAuthenticateUser`, guards admin vertical |
| `index.ts` | **~2.49k → ~2.19k** (−~300; pasada 21: `lead-routing-assignment`, `env-status`) |
| Smoke | `SMOKE_LISTING_BRAND` (default `toyota`); `db:seed:smoke-toyota` opcional; forma `items[]` con `id`/`title` si hay datos |
| Post-journal | `db:apply:post-journal` / `db:setup` para `0046`–`0059` (incl. `0058` mortgage, `0059` admin audit) |

## Pasada 21 — CIERRE DEFINITIVO (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `listings/lead-routing-assignment.ts` | `resolveInitialListingLeadAssignment` fuera del monolito |
| `lib/env-status.ts` | Snapshot admin `getEnvStatus` |
| `drizzle/README.md` | Migraciones 0046–0059 fuera del journal; `db:apply:post-journal` / `db:setup` |
| Bloque inevitable mínimo en `index.ts` | Maps bootstrap, wiring routers Hono, deps Instagram/CRM/messages, `loadDataFromDB` callback |

## Pasada pendientes 19 — index &lt;2.5k, SQL precio/año (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `index.ts` | **~2.66k → ~2.49k** — `listings/row-mapper`, `lib/browser-origin`, `lib/format-relative`, `payments/presentation`; CORS desde `lib/cors.ts` |
| `public-search-sql.ts` | Filtros SQL `price_from`/`price_to`/`year_from`/`year_to` vía `price_label`, `raw_data.commercial.price`, `raw_data.basic.year` |
| `listing-search.ts` | Fallback memoria alinea precio con mismos paths JSON |
| Tests | `listing-search.test.ts` (**9** casos); API vitest **62** |
| Smoke / Playwright | `GET /api/public/listings?vertical=autos&brand=toyota` en `smoke-marketplace.ts` + e2e Serenatas |

## Pasada pendientes 18 — index &lt;2.7k, SQL búsqueda (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `index.ts` | **~2.96k → ~2.66k** — suscripciones, CRM/messages bindings, cuentas, OAuth Instagram |
| `subscriptions/access.ts` | Plan efectivo, permisos perfil/CRM/Instagram, upsert suscripción |
| `crm/runtime-bindings.ts` / `messages/runtime-bindings.ts` | Wrappers finos sobre `service.ts` |
| `accounts/account-cache.ts` / `address-book-service.ts` | Cuenta primaria + libreta direcciones |
| `listings/public-search-sql.ts` | Filtros jsonb (marca, modelo, región, comuna, q) en consulta pública |
| `public-profile/types.ts` | Re-export DRY desde `lib/domain-types.ts` |
| Tests | `listing-search.test.ts` ampliado (**7**); API vitest **60** |

## Pasada pendientes 17 — dominio, listado público DB-first (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `lib/domain-types.ts` | Tipos dominio (~640 líneas fuera de `index.ts`) |
| `modules/cache/domain-maps.ts` | Maps bootstrap + caché perfil público |
| `index.ts` | **~3.33k → ~2.96k** (import + re-export implícito vía deps) |
| `public/listing-search.ts` | `listPublicListingsFromSource` — PostgreSQL primero, fallback Map |
| `listings/queries.ts` | `fetchActivePublicListingRowsForMarketplace` |
| Tests | `listing-search.test.ts` (filtros + DB-first / fallback) |
| Zod en `index.ts` | Sin schemas restantes (todos en `lib/request-schemas.ts`) |

### Inevitable en `index.ts` (pasada 17, aprox.)

| Bloque | Líneas aprox. | Motivo |
|--------|---------------|--------|
| Helpers usuario/cuenta/listing | ~470–1650 | Hidratación caché + mappers |
| CRM/mensajería wiring | ~1650–1950 | `crmDeps` / `messageDeps` |
| Montaje Hono + `app.route` | ~2400–2900 | Deps desde Maps importados |
| Bootstrap + `serve` | ~2900–fin | Orquestación arranque |

## Pasada 17 — cierre parcial (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `publish-listing.ts` | `publishListingToInstagram` + `maybeAutoPublishListing` extraídos de `index.ts` |
| Rate limit | `REDIS_URL` → ioredis opcional en `lib/rate-limit.ts` |
| Smoke | POST opcional `SMOKE_MARKETPLACE_POST=1` → `POST /api/serenatas/client/serenatas` |

## Pasada pendientes 16 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `lib/request-schemas.ts` | Schemas Zod auth/listings/CRM/pagos/Instagram (~480 líneas fuera del monolito) |
| `instagram/publish-wiring.ts` | Caption, image prep, `publishListingToInstagram`, `maybeAutoPublishListing` |
| `public/listing-search.ts` | Filtros `GET /api/public/listings` (q, región, precio, marca, etc.) |
| `index.ts` | **~3.79k → ~3.33k** (target &lt;3.5k cumplido) |
| Playwright CI | Comentario en step `Run Serenatas E2E (Chromium)` del job `e2e-serenatas-real` |
| Logos | `LOGO_SYSTEM.md` — inventario PNG legacy Autos/Propiedades |

### Inevitable en `index.ts` (pasada 16, aprox.)

| Bloque | Líneas aprox. | Motivo |
|--------|---------------|--------|
| Tipos dominio + Maps | ~1–1050 | Acoplamiento listings/CRM/users en memoria |
| Helpers usuario/cuenta/listing | ~1050–2200 | Hidratación caché + DB-first panel |
| CRM/mensajería presentation wiring | ~2200–2500 | `crmDeps` / `messageDeps` inyectados a routers |
| Montaje Hono + `app.route` | ~2700–3600 | Deps explícitos desde Maps |
| Bootstrap `loadDataFromDB` + `serve` | ~3600–fin | Orquestación única de arranque |

## Pasada 16 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| Extracción `index.ts` | **~514 líneas netas** (10.355 → ~9.841): `instagram/account-store.ts`, `instagram/cloudflare-overlay.ts`, `listings/persist.ts`, `payments/order-cache.ts` |
| MP checkout | `buildMercadoPagoCheckoutBackUrls` + `resolveMercadoPagoPreferenceCheckoutUrl` en `mercadopago/checkout-helpers.ts`; router payments reutiliza |
| Pagos DB-first | `updatePaymentOrder` hidrata desde DB si falta en Map; `GET /api/payments/orders` listado DB-first con fallback Map |
| Tests pagos | `order-cache.test.ts`, `queries-list.test.ts` |
| Smoke marketplace | `SMOKE_PROVIDER_GROUP_ID` → `GET .../marketplace/services?providerGroupId=` |
| Playwright Serenatas | Test `/panel/grupos` sin auth (copy marketplace + acceso restringido); `PLAYWRIGHT_SKIP=1` |

## Pasada pendientes 15 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| CRM/mensajería | Hilos y entradas vía `modules/messages/service.ts`; leads/pipeline en `modules/crm/service.ts` (`crmDeps` en `index.ts`) |
| `index.ts` | ~**5.16k → ~4.10k**; Maps `usersById` / `listingsById` inyectados en respuestas mensajería |

## Pasada 15 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| Extracción valuation | `property-feeds.ts` + `vehicle-valuation/seed-data.ts` conectados desde `index.ts` (~740 líneas menos duplicadas) |
| Perfil público | Normalizers desde `modules/public-profile/normalize.ts` (sin duplicar en monolito) |
| Pagos lectura | `GET /api/payments/orders/:orderId` **DB-first** (`loadPaymentOrderFromDb` → `upsertPaymentOrder`); `POST /payments/confirm` ya DB-first |
| Smoke marketplace | Validación mínima `id` + `name` en primeros items de `groups` |
| Playwright Serenatas | Tests landing grupos/marketplace + panel sin auth; `PLAYWRIGHT_SKIP=1` / `pnpm exec playwright install` |

**Camino fuente única `payment_orders`:** lectura crítica vía DB + Map caché; escritura dual en checkout/confirm; Map sigue para índice por usuario y webhook idempotencia en proceso.

## Pasada 9 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `GET /api/payments/orders` | `listUserPaymentOrdersMerged` — consulta DB + fusiona con Map; gana copia con `updatedAt` mayor |
| Public listings DRY | `index.ts` usa `createListingPublicPresent` (sin duplicar summaries/slug helpers) |
| Boost featured | `modules/boost/featured-list.ts` (~75 líneas fuera del monolito) |

## Pasada pendientes 13 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `index.ts` | **~6.31k → ~5.57k** (~**742** líneas netas; target &lt;6k cumplido) |
| CRM | `modules/crm/row-mappers.ts`, `lead-sla.ts`; `createLeadPresentation` en monolito |
| Perfil público | `public-profile/row-mappers.ts`, `profile-cache.ts`, `presentation.ts` |
| Boost seed | `modules/boost/listing-seed-sync.ts` |
| Auth rate limit | `lib/auth-rate-limit.ts` (Map local; nota `REDIS_URL` → middleware en `.env.example`) |
| Favicon | `simpleagenda` usa `getSimpleBrandIconTokens('simpleagenda')` |

## Pasada 14 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `index.ts` | **~5.58k → ~5.16k** (~**418** líneas netas; target &lt;5.2k cumplido) |
| Admin | `modules/admin/permanently-delete-user.ts` — borrado transaccional usuario + caches |
| Publicidad | `modules/advertising/campaign-store.ts` — mapper, queries, sanitize |
| Agenda runtime | `modules/agenda/runtime-support.ts` — slug, push, Google Calendar, NPS |
| `paymentOrdersByUser` arranque | `loadPaymentOrdersCache()` — pending/authorized + últimos 30 días, límite 2000 filas |
| Instagram extracción | `modules/instagram/listing-presentation.ts` (~300 líneas: caption, listing data, R2 image prep) |
| Webhook MP listings | `POST /api/payments/mercadopago/webhook` (autos/propiedades/serenatas) ya en `payments/router.ts` |
| Playwright Serenatas | Segunda aserción: título + meta description |
| Logos | `docs/LOGO_SYSTEM.md`; SimpleAgenda `apple-icon` con `@simple/config` |

### Inevitable en `index.ts` (aprox.)

| Bloque | Motivo |
|--------|--------|
| Tipos + schemas Zod dominio listings/CRM | Acoplamiento a Maps en memoria y respuestas panel |
| `listingLeadToResponse` / mensajería / pipeline | Deps cruzados listings + users + CRM presentation |
| Montaje routers Hono (~L4.6k+) | Inyección explícita de deps desde caches |
| `loadDataFromDB` wiring | Orquestación startup única |

## Pasada 13 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| `payment_orders` escritura | `modules/payments/persist.ts` — insert/update en checkout y confirm; `orderExternalId` en metadata para lookup por `external_reference` MP |
| Hydrate | `loadPaymentOrderFromDb` busca por `metadata.orderExternalId` o `id` UUID |
| MP helpers | `index.ts` reutiliza `mercadopago/checkout-helpers.ts` (~70 líneas menos duplicadas) |
| Smoke | `smoke-marketplace.ts`: validación body `{ ok: true }` en `/api/health` |
| Playwright | `@playwright/test` en `apps/simpleserenatas`; `pnpm test:e2e` con `PLAYWRIGHT_SKIP=1` para CI sin browsers |

## Pasada 12 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| SVG Instagram | `modules/instagram/svg-render.ts` (~480 líneas extraídas de `index.ts`) |
| Pagos hydrate | `loadPaymentOrderFromDb` + mapper `mapPaymentOrderRowToHydrated`; webhook y confirm |
| Smoke API | `smoke-marketplace.ts`: CORS OPTIONS health, validación `services[]` |

## Pasada pendientes 11 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| Smoke marketplace | `smoke-marketplace.ts` usa `GET /api/serenatas/marketplace/groups/:id/services` (no `/marketplace/services`); valida `id`, `name`, `providerGroupId` en items |
| S3 media proxy | `modules/media/s3-clients.ts` — `getR2S3Client`, `getBackblazeS3Client`, `getS3ClientForUrl`, `getMediaProxyS3Client` |
| Agenda plan limits | `modules/agenda/plan-limits.ts` — `getAgendaProfile`, `isFreePlan`, límites free, `generateSlots` |
| `index.ts` | ~6.99k → ~6.85k líneas |

## Pasada 11 (mayo 2026)

| Cambio | Detalle |
|--------|---------|
| Lead count panel DB-first | `modules/listings/lead-count.ts` — `mapListingRowToRecord` usa conteo Drizzle en rutas panel |
| MP checkout helpers | `modules/mercadopago/checkout-helpers.ts` extraído de `index.ts` |
| Lead ingest auth | `modules/leads/ingest-auth.ts` extraído de `index.ts` |
| Boost quota por plan | `modules/boost/quota.ts` — `maxFreeBoostsPerMonth` del plan activo |

## Recomendaciones (futuro / ops)

1. Redis o caché compartida con TTL para listings de lectura pública.
2. Órdenes de pago: tabla `payment_orders` como fuente única (parcialmente en DB).
3. Rate limit en edge (Cloudflare) + store compartido para `/api/auth/*` — documentado en `COOLIFY_DEPLOYMENT.md` y comentario en `lib/rate-limit.ts`.
4. Leader election para cron Agenda (`pg_try_advisory_lock` añadido en `agenda/cron.ts`).

## Variables relacionadas

- `AGENDA_CRON_ENABLED=true` — activa cron fuera de producción (una sola instancia recomendada).
- `CORS_ORIGINS` — orígenes extra; defaults en `services/api/src/lib/cors.ts`.
