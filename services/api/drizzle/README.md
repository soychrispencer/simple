# Drizzle migrations

This directory is the source of truth for database schema changes.

Notes:

- `0030_placeholder.sql` through `0037_placeholder.sql` are intentionally empty historical migrations. Keep them because existing databases may already have those journal entries.
- `0041_remove_discontinued_vertical.sql` removes the discontinued serenatas schema surface.
- Runtime bootstrap code must not create or mutate schema. New DDL belongs in a numbered migration.
