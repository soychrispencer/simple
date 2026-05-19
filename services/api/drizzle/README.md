# Drizzle migrations

This directory is the source of truth for database schema changes.

## Doble pipeline en runtime

1. **`migrate()`** (drizzle-orm): aplica migraciones registradas por el CLI según el journal.
2. **`applyPendingJournalMigrations()`** (`src/db/apply-pending-migrations.ts`): aplica SQL del journal cuyo **hash** aún no está en `drizzle.__drizzle_migrations` (útil si el journal y la tabla divergieron).

Al arrancar `simple-api`: `migrate()` (journal) y luego `applyPostJournalMigrations()` (0046–0059; si falla, warn y la API sigue). En deploy/CI usar `pnpm run db:setup` o `db:apply:post-journal` explícito. `applyPendingJournalMigrations()` sigue disponible vía CLI para journal por hash.

Notes:

- `0030_placeholder.sql` through `0037_placeholder.sql` are intentionally empty historical migrations. Keep them because existing databases may already have those journal entries.
- `0041_remove_discontinued_vertical.sql` removes the discontinued serenatas schema surface.
- Runtime bootstrap code must not create or mutate schema. New DDL belongs in a numbered migration.

## Migraciones post-journal (0046–0059)

El journal Drizzle termina en **`0045_serenata_booking_payments`**. Los archivos **`0046` … `0059`** (incl. serenatas 0053–0057, `0058_mortgage_rates_highest_rate.sql`, `0059_admin_audit_logs.sql`) existen en disco pero **no** están en `_journal.json` para no romper `drizzle-kit migrate` en bases que ya aplicaron DDL fuera del CLI.

**Aplicar en staging/prod (idempotente):**

```bash
pnpm --filter=@simple/api run db:apply:post-journal
# o solo registrar hashes si el esquema ya coincide:
pnpm --filter=@simple/api run db:sync:migration-hashes -- --tags 0053,0054,0055
```

`migrate()` al arranque recorre el journal; las post-0045 se aplican con el script anterior, `db:setup`, o el intento no bloqueante en `index.ts`. `db:repair:marketplace` cubre 0049–0052 si hace falta.
