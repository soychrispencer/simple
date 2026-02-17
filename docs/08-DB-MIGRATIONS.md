# DB Migrations Index

Este archivo es **obligatorio** para gobernanza de backend.

Regla de merge:
- Toda migración nueva en `backend/supabase/migrations/*.sql` debe tener su entrada aquí.
- Si una migración no está documentada, falla `npm run db:check-migration-docs`.

## `20260112234802_baseline_schema.sql`
- Tipo: baseline.
- Objetivo: snapshot inicial del schema completo (tablas, constraints, RLS, funciones y triggers base).
- Impacto: estructura principal del ecosistema.

## `20260112234802_baseline_seed.sql`
- Tipo: baseline seed.
- Objetivo: datos base de catálogo/configuración para inicializar entornos.
- Impacto: población inicial de datos de referencia.

## `20260114010000_integrations.sql`
- Tipo: feature.
- Objetivo: integrar modelo de proveedores externos (`integrations`, `integration_instagram`).
- Impacto: soporte de OAuth y tokens por proveedor (Instagram).

## `20260214120000_instagram_publish_log.sql`
- Tipo: feature.
- Objetivo: registrar publicaciones reales a Instagram (`integration_instagram_posts`).
- Impacto: trazabilidad, auditoría y base para métricas.

## `20260215113000_schema_deprecation_registry.sql`
- Tipo: governance.
- Objetivo: crear registro formal de deprecaciones (`schema_deprecations`) antes de eliminar columnas/tablas.
- Impacto: control de lifecycle del schema y limpieza ordenada.

## `20260215130000_instagram_queue_and_refresh.sql`
- Tipo: feature.
- Objetivo: habilitar cola de publicación Instagram con reintentos y enriquecer historial (`permalink`, `attempt_count`, `next_retry_at`, etc.).
- Impacto: publicación resiliente, trazabilidad de errores y base para worker de retries.
