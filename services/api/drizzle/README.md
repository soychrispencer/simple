# Drizzle migrations

This directory is the source of truth for database schema changes.

## Doble pipeline en runtime

1. **`migrate()`** (drizzle-orm): aplica migraciones registradas por el CLI según el journal.
2. **`applyPendingJournalMigrations()`** (`src/db/apply-pending-migrations.ts`): aplica SQL del journal cuyo **hash** aún no está en `drizzle.__drizzle_migrations` (útil si el journal y la tabla divergieron).

Al arrancar `simple-api`: `migrate()` (journal) y luego `applyPostJournalMigrations()` (0046–0177, incluido el preflight `0167a`). En producción, un fallo en cualquiera de las dos rutas detiene el contenedor y la API no acepta tráfico con el esquema incompleto. En desarrollo se registra la falla para poder corregir la base local. `applyPendingJournalMigrations()` sigue disponible vía CLI para journal por hash.

Notes:

- `0030_placeholder.sql` through `0037_placeholder.sql` are intentionally empty historical migrations. Keep them because existing databases may already have those journal entries.
- `0041_remove_discontinued_vertical.sql` removes the discontinued serenatas schema surface.
- El bootstrap no debe crear ni modificar tablas de negocio. El runner post-journal solo crea la tabla de control de migraciones; el DDL de producto va en una migración numerada.

## Migraciones post-journal (0046–0177)

El journal Drizzle termina en **`0045_serenata_booking_payments`**. Los archivos **`0046`** en adelante existen en disco pero **no** están en `_journal.json` para no romper `drizzle-kit migrate` en bases que ya aplicaron DDL fuera del CLI. La lista exacta que aplica el runtime vive en `src/db/apply-post-journal-migrations.ts` (`POST_JOURNAL_TAGS`). La migración `0141_agenda_existing_accounts_to_free` coloca los perfiles existentes de SimpleAgenda en Gratis, conserva sus perfiles públicos y marca canceladas las suscripciones internas que aún figuren activas.

La migración `0143_account_vertical_settings` guarda la actividad por cuenta y producto, y prepara los datos actuales desde los perfiles públicos.

La migración `0144_account_subscription_scope` permite más de una suscripción de producto por persona, mantiene una clave de búsqueda para el pagador y otra para la cuenta, y asocia las suscripciones existentes a la cuenta predeterminada del usuario.

La migración `0145_account_invitations` agrega invitaciones de un solo uso y con vencimiento para incorporar integrantes a un espacio.

La migración `0146_team_marketplace_threads` vincula las conversaciones de publicaciones al mismo espacio que las publica para que el equipo las pueda atender de forma compartida.

La migración `0147_relationship_notes_account_scope` mueve las notas de contacto existentes a la cuenta asociada y permite compartir su historial dentro del mismo espacio.

La migración `0148_account_relationship_assignments` permite asignar cada contacto de marketplace a un integrante del espacio empresarial.

La migración `0149_agenda_account_property_visits` agrega visitas inmobiliarias compartidas por cuenta, con propiedad, contacto y agente asignado; se mantienen separadas de las citas profesionales privadas.

La migración `0150_account_relationship_stage` agrega una etapa de seguimiento por contacto al espacio empresarial.

La migración `0151_account_relationship_tasks` permite crear seguimientos con fecha, responsable y estado vinculados a cada contacto empresarial.

La migración `0152_account_listing_assignments` permite asignar publicaciones de una cuenta empresarial a sus integrantes para limitar la cartera de cada agente.

La migración `0153_account_relationship_task_reminders` registra el envío del aviso interno previo al vencimiento de cada seguimiento para evitar duplicados.

La migración `0154_account_public_profiles` permite un perfil público compartido por cuenta y vertical, conserva los perfiles duplicados como perfiles personales y separa las claves únicas personales y empresariales.

La migración `0155_agenda_account_visit_reminders` agrega el registro de recordatorios internos para visitas inmobiliarias compartidas y su índice de búsqueda.

La migración `0156_agenda_account_visit_google_calendar` guarda el identificador de evento y al responsable del calendario para sincronizar visitas del equipo sin exponer esos datos internos en la API.

La migración `0157_agenda_ai_landing_page` agrega los campos de configuración para generar y editar la página de presentación profesional de SimpleAgenda.

La migración `0158_agenda_account_visit_type` permite distinguir visitas a propiedades de reuniones comerciales dentro de la misma agenda de negocio. Los registros existentes quedan como visitas a propiedades.

La migración `0159_payment_orders_account_idx` agrega un índice para consultar el historial de pagos de una suscripción compartida por cuenta.

La migración `0160_listing_drafts_account_scope` asocia los borradores de publicación a la cuenta de trabajo para separarlos entre espacios del mismo usuario.

La migración `0161_agenda_profile_account_scope` permite un perfil de SimpleAgenda por persona y espacio de trabajo. Los perfiles antiguos se asignan primero a la cuenta personal; los perfiles sin una cuenta disponible conservan el índice de compatibilidad.

La migración `0162_account_invitation_vertical` vincula las invitaciones de equipo a Autos o Propiedades. Las invitaciones antiguas se conservan como invitaciones de Propiedades.

Las migraciones `0163`–`0168` agregan integraciones de redes sociales por espacio, idempotencia de eventos y conservación del historial compartido de mensajes.

La migración `0167a_social_workspace_unique_preflight` simula la asociación de integraciones heredadas al espacio predeterminado y detecta duplicados por producto y vertical antes de que la migración `0168` consolide conexiones. Si detecta más de una conexión para un mismo espacio, revierte y detiene el arranque; no elimina conexiones. Ejecutar primero `pnpm --filter @simple/api run db:audit:social-workspace-integrations` para ver conteos agregados.

La migración `0169_serenatas_individual_billing` asigna los planes de SimpleSerenatas y sus órdenes de suscripción a la cuenta personal del músico o proveedor. No modifica reservas, pagos de serenatas contratadas ni las comisiones configuradas.

La migración `0170_serenatas_commission_zero_default` deja en 0% la comisión predeterminada para nuevos perfiles de proveedor, de acuerdo con la configuración comercial actual. Conserva los valores individuales existentes.

La migración `0171_serenatas_musician_billing_profile` agrega al perfil de músico sus campos de comisión y la fecha de término de la prueba, para que el perfil pueda consultar la facturación individual de SimpleSerenatas.

La migración `0172_serenatas_profile_billing_scope` separa el plan de SimpleSerenatas por perfil proveedor o músico, de modo que puedan convivir bajo un mismo acceso. Antes de crear índices únicos, aborta si detecta suscripciones duplicadas por perfil o por espacio/producto; no elimina historial.

La migración `0173_remove_legacy_featured_listing_limit` elimina de `subscription_plans` el campo que aparentaba incluir cupos de avisos destacados por plan. La visibilidad se administra mediante impulsos.

Las migraciones `0174_account_single_owner_membership`, `0175_account_membership_role_check` y `0176_account_invitation_role_check` garantizan un solo dueño que coincide con el titular y restringen los roles válidos de integrantes e invitaciones.

La migración `0177_account_team_list_indexes` agrega índices para cargar equipos e invitaciones en páginas ordenadas, sin imponer un cupo de integrantes.

La migración `0166_shared_message_history` permite conservar las conversaciones de una cuenta compartida cuando se elimina a un integrante, anonimizando su identificador personal sin borrar el historial del equipo.

**Aplicar con auditoría previa y respaldo recuperable:**

Con `NODE_ENV=production`, la API y los scripts operativos no leen `.env` ni `.env.local`; configura `DATABASE_URL` y los secretos productivos en Coolify o en el entorno seguro del operador. En desarrollo local, los archivos dotenv siguen disponibles.

```bash
pnpm --filter=@simple/api run db:apply:post-journal
# o solo registrar hashes si el esquema ya coincide:
pnpm --filter=@simple/api run db:sync:migration-hashes -- --tags 0060,0070,0086
```

`migrate()` al arranque recorre el journal; las post-0045 se aplican con el script anterior o `db:setup`. Cada archivo post-journal se ejecuta en una transacción con bloqueo advisory; `--dry-run` solo consulta el estado. `db:repair:marketplace` queda como reparación histórica para instalaciones que quedaron a medio camino antes del pipeline post-journal.
