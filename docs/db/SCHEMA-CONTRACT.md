# Schema Contract

Contrato operativo del backend PostgreSQL/Supabase para mantener coherencia, control y trazabilidad.

## 1. Modelo de Integraciones

### `public.integrations`
- Rol: entidad padre por `user_id + provider`.
- Clave única: `integrations_user_provider_unique`.
- Uso: estado global de conexión (`connected`, timestamps).

### `public.integration_instagram`
- Rol: datos sensibles/específicos de Instagram (token, page, ig user).
- Relación: 1:1 con `integrations` vía `integration_id`.
- Uso: publicación y estado de conexión.

### `public.integration_instagram_posts`
- Rol: historial de publicaciones realizadas en Instagram.
- Relación: N:1 con `integrations`; opcional N:1 con `listings`.
- Uso: auditoría, diagnóstico, analítica de canal y cola de publicación/reintentos (`status`, `attempt_count`, `next_retry_at`).

## 2. Convenciones de Diseño
- Base + provider detail: todas las integraciones nuevas siguen patrón `integrations` + `integration_<provider>`.
- Historial de eventos: se modela en tabla separada (`integration_<provider>_posts`, logs, etc.), no en columnas sueltas.
- RLS: tablas de integración sin policies públicas, acceso server-only con service role.
- Nombres: inglés, `snake_case`, timestamps `created_at`/`updated_at`.

## 3. Lifecycle de Schema
- No se borra una columna o tabla directamente en una primera migración.
- Primero se registra deprecación en `public.schema_deprecations`.
- Luego se agenda migración de eliminación con ventana de seguridad.

Estados permitidos en `schema_deprecations`:
- `deprecated`
- `scheduled_drop`
- `removed`
- `cancelled`

## 4. Regla de Gobernanza
- Cada archivo en `backend/supabase/migrations/*.sql` debe estar documentado en `docs/08-DB-MIGRATIONS.md`.
- Validación automática: `npm run db:check-migration-docs`.

## 5. Auditoría Periódica
- Ejecutar: `npm run db:audit`.
- Salida: `docs/db/db-audit-latest.md`.
- El reporte identifica:
  - tablas vacías,
  - tablas sin referencia en código,
  - columnas sospechosas sin uso (heurístico),
  - solapamiento fuerte entre tablas,
  - deprecaciones activas.
