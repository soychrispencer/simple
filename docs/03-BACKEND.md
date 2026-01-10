# Backend Reference

> Single source of truth for the Supabase/PostgreSQL backend that powers every vertical (SimpleAutos, SimplePropiedades, SimpleTiendas y SimpleFood).

## 1. Stack & Principles
- **Engine:** PostgreSQL 15 managed by Supabase with Row Level Security en todas las tablas.
- **Language:** Todo el dominio backend está en inglés para mantener consistencia con el frontend y los packages compartidos.
- **Access:** Next.js Route Handlers y funciones server-only usan el Supabase Service Key; los clientes usan el browser client con RLS.
- **Migrations:** Se crean con `npm run supabase:migration:new -- --name <nombre>` y se aplican con `npm run supabase:db:push`. Todos los archivos viven en `backend/supabase/migrations` con timestamp y nombre descriptivo.
- **Environments:** Local (Supabase CLI), Staging y Production. Siempre aplicar migraciones primero en staging.

## 2. Schema Snapshot (resumen)
| Bloque | Tablas clave | Notas |
| --- | --- | --- |
| **Identidad** | `profiles`, `verticals`, `companies`, `company_users`, `subscriptions`, `user_verticals`, `sso_tokens` | `profiles` extiende `auth.users`. `verticals` define las verticales disponibles. `company_users` (user↔company) controla roles/permissions y una compañía puede operar en varias verticales. `subscriptions` se asocia a usuario/compañía según el plan. `user_verticals` y `sso_tokens` habilitan el intercambio SSO entre dominios. |
| **Marketplaces** | `listings`, `listings_vehicles`, `listings_properties`, `listing_images`, `listing_metrics` | `listings` referencia `vertical_id`, `company_id` y `user_id`. Las tablas específicas agregan campos domain-specific (vehículos vs propiedades) con FK 1:1. `listing_metrics` concentra views/clics/favorites. |
| **Monetización** | `payments`, `promotions`, `boosts` (dentro de `listings`) | Compatible con MercadoPago; pagos apuntan a `listings` u órdenes stand-alone. |
| **Engagement** | `favorites`, `messages`, `notifications`, `saved_searches`, `reports` | Gestionan interacción usuario ↔ anuncio. |
| **Compliance** | `vehicle_selected_equipment`, `vehicle_documentation`, `vehicle_history` | Capturan equipamiento, documentos legales y eventos históricos. |
| **Analytics** | `listing_metrics`, `vehicle_price_history` | Alimentan dashboards y reportes en el panel Pro. |

> Para ver la definición exacta ejecutar `supabase db dump --linked` o revisar las migraciones `20251113*.sql`.

### 2.1 Columnas esenciales por tabla
- **profiles**: `public_name`, `plan`, `avatar_url`, `phone`, toggles `email_verified`/`phone_verified`, `preferences` JSONB. Ya no guarda `company_id`; la relación es indirecta mediante `company_users`.
- **verticals**: `id`, `key`, `name`, `description`, `is_active`. Usado para poblar `verticalThemes` y validar `vertical_id` en `listings`.
- **companies**: `name`, `slug`, `logo_url`, `region_id`, `commune_id`, `industry`, `is_verified`, `visits`. La FK hacia listados es `company_id`.
- **company_users**: `company_id`, `user_id`, `role (owner|admin|member)`, `permissions` JSONB, `is_active`. Toda la lógica del panel depende de esta tabla.
- **listings**: `vertical_id` (FK a `verticals`), `company_id`, `user_id`, `listing_type`, `status`, `price/currency`, geodatos, flags (`is_featured`, `is_urgent`), `metadata` JSONB, `search_vector`.
- **listings_vehicles**: `vehicle_type_id`, `brand_id`, `model_id`, `year`, `mileage`, `transmission`, `fuel_type`, `traction`, `features` JSONB, `condition`, `state`, `warranty`, etc.
- **listings_properties**: `property_type`, `operation_type`, `bedrooms`, `bathrooms`, `parking_spaces`, `total_area`, `built_area`, `land_area`, `floor`, `year_built`, `features`, `amenities`.
- **subscriptions**: `user_id`, `plan`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`. Próximo paso: asociar `company_id` cuando se activen planes multiusuario.
- **user_verticals**: `user_id`, `vertical`, `permissions` JSONB, `active`. Fuente única para saber qué verticales puede administrar cada usuario fuera del panel clásico.
- **sso_tokens**: `token`, `user_id`, `target_domain`, `expires_at`, `used_at`, `metadata`. Tokens one-time que permiten saltar entre dominios con RPCs `init_sso_token` y `validate_sso_token`.
- **listing_metrics**: `views`, `clicks`, `favorites`, `shares` + timestamps para snapshot.

## 3. Audit & Fix Log
Las auditorías de noviembre 2025 detectaron faltantes críticos (campos adicionales, tablas auxiliares y políticas). Todo fue integrado en los dos archivos principales:

1. `20251113000000_complete_backend_schema.sql`
   - Agrega columnas nuevas (`profiles.public_name`, `vehicles.version`, etc.).
   - Crea tablas auxiliares (`vehicle_selected_equipment`, `subscriptions`, ...).
   - Declara constraints, defaults y checks.
2. `20251113000001_complete_backend_data_and_policies.sql`
   - Índices adicionales (`idx_vehicles_transmission`, `idx_properties_hoa_fee`, ...).
   - Vistas `vehicles_detailed` y `properties_detailed` actualizadas.
   - Triggers (`sync_profile_plan`, `update_vehicle_documentation_timestamp`).
   - Políticas RLS completas para cada tabla nueva.

3. `20251204090000_add_sso_support.sql`
   - Crea `user_verticals` y `sso_tokens` + índices/RLS.
   - Publica funciones `generate_sso_token`, `init_sso_token`, `validate_sso_token` para el paquete `packages/auth/src/sso`.

> Resultado: backend 100% alineado con el frontend y las shared types. Las migraciones posteriores a noviembre 2025 sólo agregan capacidades SSO y cualquier cambio nuevo debe partir desde estos archivos.

## 4. Operativa

### 4.1 Aplicar cambios localmente
```bash
npm run supabase:start        # inicia stack local (docker)
npm run supabase:db:reset     # recrea esquema usando migrations + seed.sql
npm run supabase:db:push      # aplica migraciones pendientes en el proyecto vinculado
```

> Ejecuta `npm run supabase:login` una sola vez por máquina y luego `npm run supabase:link` para asociar el proyecto local al ref `ogmbjczfqvkpmodhsfjp`. A partir de ahí cualquier `supabase:db:*` usa esa referencia. Los comandos que necesitan base local (`supabase:db:diff`, `supabase:start`, `supabase:db:reset`) requieren Docker Desktop activo, pero los pushes remotos descritos abajo no dependen de Docker.

### 4.2 Despliegue
1. **Revisar migraciones:** `cat backend/supabase/migrations/*.sql` (orden cronológico). Si tienes Docker disponible puedes correr `npm run supabase:db:diff` para comparar contra una shadow DB local.
2. **Staging:** `npm run supabase:db:push:staging` (requiere definir `SUPABASE_STAGING_DB_URL` en `.env`).
3. **Producción:** `npm run supabase:db:push:prod` (requiere `SUPABASE_PROD_DB_URL`).

### 4.3 Troubleshooting rápido
- `profiles` vacíos en local → ejecutar `npm run supabase:db:reset` para cargar `seed.sql` nuevamente (requiere Docker).

### 4.4 Conexión directa a Supabase (sin Docker)
- Copia `.env.example` → `.env` (en la raíz o dentro de `backend/supabase/`) y completa `SUPABASE_STAGING_DB_URL` / `SUPABASE_PROD_DB_URL` con las cadenas que entrega Supabase (Project Settings → Database → Connection string → `psql`). Los scripts leen ambos archivos si existen, sin necesidad de `dotenv` manual.
- Usa `npm run supabase:db:push:staging` o `npm run supabase:db:push:prod` para aplicar las migraciones directamente sobre el entorno remoto real. El script valida que la variable necesaria esté definida y ejecuta `supabase db push --db-url=<...>` desde `backend/supabase`.
- **Advertencia:** el archivo `20251114000000_complete_backend_migration.sql` hace un wipe completo (`DROP TABLE ... CASCADE`). Asegúrate de tener backups y de estar apuntando al entorno correcto antes de lanzar los comandos de producción.
- Error RLS al leer listados → confirmar que `status = 'active'` o que el token pertenece al owner.
- Campos faltantes en API → chequear versión de `packages/shared-types` y regenerar build.

## 5. Futuras Iteraciones
- **Observability:** agregar ingestión de logs a Logflare / Sentry Performance para queries pesadas.
- **Data retention:** mover `vehicle_history` antiguos a tabla particionada cada 12 meses.
- **Automation:** publicar dashboard cron `listing_metrics` → `analytics.listing_daily_snapshot`.

---
Última actualización: 30 de noviembre de 2025
