# Control backend — `@simple/api`

Mapa mental para mantener API, PostgreSQL y migraciones alineados. **No sustituye** `docs/DATABASE_SETUP.md` (detalle SQL/probes); aquí va el **qué ejecutar** y **qué no tocar**.

---

## Arquitectura en una página

```
services/api/
├── src/db/schema.ts          ← fuente de verdad Drizzle (63 tablas)
├── drizzle/
│   ├── 0000…0045_*.sql       ← journal (_journal.json, 46 entradas)
│   ├── 0046…0059_*.sql       ← post-journal (14 archivos, NO en journal)
│   └── meta/_journal.json
├── src/index.ts              ← orquestador (~2.2k líneas) + migrate() al arranque
└── src/modules/*/            ← routers Hono montados desde index.ts
```

**Runtime:** PostgreSQL + cachés en memoria (`domain-maps.ts`) hidratados con `loadDataFromDB()`. Serenatas, agenda, listings y CRM usan **DB directa** además del caché donde aplica.

**Doble registro de migraciones:** `drizzle.__drizzle_migrations` guarda hashes SHA-256 del contenido de cada `.sql`. El journal llega hasta **0045**; **0046–0059** se aplican con `db:apply:post-journal` (misma tabla de hashes).

---

## Comandos canónicos (copiar/pegar)

### Reset local alineado (DB vacía o nueva)

```bash
# Desde la raíz del monorepo
cd services/api
# Asegurar DATABASE_URL en .env.local (misma URL que usa `pnpm dev:api`)

pnpm run db:setup
# equivalente manual:
# pnpm run db:migrate && pnpm run db:apply:post-journal && pnpm run db:sync:migration-hashes
pnpm --filter @simple/api run db:seed:marketplace    # opcional QA marketplace
```

### Verificación sin DDL destructivo

```bash
pnpm --filter @simple/api typecheck
pnpm --filter @simple/api test
pnpm --filter @simple/api run db:sync:migration-hashes
pnpm --filter @simple/api exec tsx scripts/apply-post-journal-migrations.ts -- --dry-run
```

### Arranque API

```bash
pnpm dev:api   # o desde services/api: pnpm dev
```

Al arrancar: `migrate()` (journal 0000–0045) y luego `applyPostJournalMigrations()` (0046–0059). Si post-journal falla, la API **sigue** arrancando (solo `console.warn`). En deploy/CI preferir `db:setup` explícito.

---

## Scripts `package.json` — canónicos vs reparación

| Script | Rol |
|--------|-----|
| `db:migrate` | Aplica journal vía drizzle-kit |
| `db:generate` | Genera SQL desde `schema.ts` (revisar diff; snapshots meta van hasta ~0042) |
| `db:push` | Push esquema sin migración (solo dev exploratorio) |
| `db:studio` | UI Drizzle |
| `db:setup` | `db:migrate` + `db:apply:post-journal` + `db:sync:migration-hashes` |
| `db:apply:post-journal` | **Canónico** para 0046–0059 |
| `db:sync:migration-hashes` | Registra hashes del **journal** si el esquema ya coincide (probes) |
| `db:repair:marketplace` | One-off: DDL idempotente 0049–0052 + hashes |
| `db:seed` / `db:seed:marketplace` / `db:seed:serenatas-e2e` / `db:seed:smoke-toyota` | Datos demo / E2E |
| `db:clean` | Limpia datos (no DROP schema) |
| `seed:admins` / `user:promote-admin` | Ops usuarios admin |
| `smoke:marketplace` | HTTP smoke (API levantada) |

**Scripts archivados** (`scripts/archive/`, sin entrada en package.json): ops y one-off (`seed-superadmin.mjs`, `promote-to-superadmin.mjs`, `reset-password.ts`, `cleanup-users.ts`, `migrate-admin-accounts.ts`, `apply-pending-migrations.ts`, `apply-0041-check-only.ts`, `run-single-migration-file.ts`). Ver `scripts/archive/README.md`.

**Scripts en `scripts/` sin package.json** (canónicos de reparación):

- `repair-marketplace-schema.ts` — alias de reparación 0049–0052 (también `db:repair:marketplace`)

---

## Routers montados (`index.ts`)

| Prefijo | Módulo |
|---------|--------|
| `/` | system, leads |
| `/api/auth` | auth |
| `/api/listings`, `/api/listing-draft` | listings |
| `/api/boost`, `/api/valuation`, `/api/vehicle-valuation` | boost, valuation |
| `/api/address-book`, `/api/account/address-book` | address-book |
| `/api` | payments, social |
| `/api/admin`, `/api/crm`, `/api/accounts`, `/api/account` | admin, crm, accounts, public-profile |
| `/api/advertising` | advertising |
| `/api/messages`, `/api/panel` | messages |
| `/api/integrations/instagram`, `/api/public` | instagram, public |
| `/api/media`, `/api/storage` | media |
| `/api/serenatas` | serenatas |
| `/api/agenda`, `/api/public/agenda` | agenda |

**Sin router propio:** `mercadopago`, `whatsapp`, `subscriptions` — usados desde payments, agenda/cron e index.

---

## Flags y legacy

| Variable | Default | Efecto |
|----------|---------|--------|
| `SERENATAS_LEGACY_PACKAGES` | `false` | Si `true`/`1`/`yes`, habilita POST cliente por paquetes legacy; marketplace sigue activo |

---

## Maps en memoria (`domain-maps.ts`)

Cargados al inicio: users, accounts, listings, saved, follows, boost, address book, payment orders, subscriptions activas, Instagram, perfiles públicos, lead counts.

**No en caché global:** serenatas, CRM pipeline, agenda, mensajes, campañas ads — van a PostgreSQL en cada request/módulo.

---

## Qué NO hacer (sin confirmación explícita)

- `DROP TABLE` / borrar archivos `.sql` de `drizzle/`
- Rotar `SESSION_SECRET` o claves MP/Instagram en prod sin plan de sesiones
- `db:push` en staging/prod como sustituto de migraciones
- Confiar solo en `migrate()` en deploy sin `db:apply:post-journal` / `db:setup` (el arranque intenta post-journal pero no debe ser el único mecanismo)
- Confiar en cifras «51/53/58 migraciones» en docs antiguos — **canónico: 46 journal + 14 post-journal = 60 SQL**

---

## Drift conocido (documentar, no borrar)

1. **`drizzle/meta` snapshots** solo hasta `0042_*` — `db:generate` puede proponer migraciones grandes; revisar siempre contra `schema.ts`.
2. **`0053` y 0046–0059** están fuera del journal a propósito (`drizzle/README.md`).
3. **`index.ts`** sigue siendo monolito de composición; extracción modular es deuda, no bloquea migraciones.

**Cerrado (mayo 2026):** `mortgage_rates.highest_rate` (`0058`), tabla `admin_audit_logs` (`0059` + `schema.ts`).

---

## Limpieza código (2026-05-19)

| Eliminado / movido | Motivo |
|--------------------|--------|
| `scripts/fix-mojibake.mjs`, `patch-*.mjs`, `_append-autos-css.mjs`, `_patch-crm-inline.mjs`, `refactor-ui.js` | One-off de parcheo ya aplicados; sin referencias en `package.json` ni docs operativos |
| `services/api/scripts/archive/*` (antes en `scripts/`) | Ops documentados; imports actualizados a `../../src` |
| `buildBookingEmailHtml`, `getEmailLogoPngDataUri` | Exports `@deprecated` sin consumidores en monorepo |
| `publishPaidSerenataToAdmins`, `listAdminSerenatas`, `export { authUser }` | Alias/export público sin uso externo |
| `packages/ui` `export *` duplicado de `theme-provider` | Re-export redundante (quedan exports explícitos) |

**No tocado:** `drizzle/*.sql`, `SERENATAS_LEGACY_PACKAGES`, redirects `LegacySectionRedirect` / `panel-query-redirect`, componentes panel Serenatas en uso dinámico.

---

## Referencias

- `docs/DATABASE_SETUP.md` — protocolo local paso a paso, probes, seeds
- `services/api/drizzle/README.md` — post-journal y placeholders
- `docs/API_MEMORY_MAPS.md` — detalle de cachés
