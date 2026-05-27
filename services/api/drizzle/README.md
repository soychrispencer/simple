# Drizzle migrations

This directory is the source of truth for database schema changes.

## Doble pipeline en runtime

1. **`migrate()`** (drizzle-orm): aplica migraciones registradas por el CLI según el journal.
2. **`applyPendingJournalMigrations()`** (`src/db/apply-pending-migrations.ts`): aplica SQL del journal cuyo **hash** aún no está en `drizzle.__drizzle_migrations` (útil si el journal y la tabla divergieron).

Al arrancar `simple-api`: `migrate()` (journal) y luego `applyPostJournalMigrations()` (0046–0086; si falla, warn y la API sigue). En deploy/CI usar `pnpm run db:setup` o `db:apply:post-journal` explícito. `applyPendingJournalMigrations()` sigue disponible vía CLI para journal por hash.

Notes:

- `0030_placeholder.sql` through `0037_placeholder.sql` are intentionally empty historical migrations. Keep them because existing databases may already have those journal entries.
- `0041_remove_discontinued_vertical.sql` removes the discontinued serenatas schema surface.
- Runtime bootstrap code must not create or mutate schema. New DDL belongs in a numbered migration.

## Migraciones post-journal (0046–0086)

El journal Drizzle termina en **`0045_serenata_booking_payments`**. Los archivos **`0046` … `0086`** existen en disco pero **no** están en `_journal.json` para no romper `drizzle-kit migrate` en bases que ya aplicaron DDL fuera del CLI. La lista exacta que aplica el runtime vive en `src/db/apply-post-journal-migrations.ts` (`POST_JOURNAL_TAGS`).

**Aplicar en staging/prod (idempotente):**

```bash
pnpm --filter=@simple/api run db:apply:post-journal
# o solo registrar hashes si el esquema ya coincide:
pnpm --filter=@simple/api run db:sync:migration-hashes -- --tags 0060,0070,0086
```

`migrate()` al arranque recorre el journal; las post-0045 se aplican con el script anterior, `db:setup`, o el intento no bloqueante en `index.ts`. `db:repair:marketplace` queda como reparación histórica para instalaciones que quedaron a medio camino antes del pipeline post-journal.
