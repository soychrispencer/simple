# Plan: Un músico — una tabla (`serenata_musicians`)

## Principios (alineados al producto)

1. **Un solo registro de “músico”** por usuario (`serenata_musicians`), con avatar, ubicación, disponibilidad, experiencia, instrumentos y métricas.
2. **Coordinador = upgrade** sobre el mismo `users`: tabla `serenata_coordinator_profiles` solo añade campos/suscripción; no es otro tipo de música.
3. **Cuadrilla = relación**, no otro músico duplicado: tabla puente músico ↔ coordinador con estado `invited|requested|active|declined|removed`.
4. **Lineup de serenata** referencia **`serenata_musicians.id`**, igual que grupos legacy.
5. **Sin correo como flujo crítico**: notificaciones in-app/API (email solo respaldo cuando SMTP exista).

## Fase A — Inventario y riesgos

| Antes | Problema |
|-------|-----------|
| `serenata_musicians` | Correcto como perfil pero lineup apuntaba a perfiles copia. |
| `serenata_musician_profiles` | Misma persona por coord; duplicidad y huevo–gallo con lineup. |

**Riesgos de migración:** filas `lineup.musician_id` apuntaban a IDs de perfil; hay que remap a `musician_id` real vía `user_id`.

## Fase B — Modelo objetivo en BD

- **`serenata_musicians`**: ampliar opcionalmente con `instruments` (array); mantener `instrument` obligatorio como principal (compatibilidad).
- **`serenata_coordinator_crew_memberships`** (nueva): `{ id, musicianId, coordinatorProfileId, membershipStatus, membershipInitiator, membershipInvitedAt, membershipRespondedAt, membershipMessage, createdAt, updatedAt }`; `UNIQUE (musician_id, coordinator_profile_id)`.
- **`serenata_musician_lineup.musician_id`** → FK a `serenata_musicians.id`.
- **`serenata_musician_profiles`**: eliminar tras migrar datos.

## Fase C — Migración única (`0047_…sql`)

Orden ejecutable sin pérdida de datos:

1. `ALTER TABLE serenata_musicians` añadir `instruments text[]`, `phone` opcional si hace falta unificar desde perfiles antiguos.
2. Backfill `instruments`: `ARRAY[instrument]::varchar[]` donde null.
3. `CREATE TABLE serenata_coordinator_crew_memberships`.
4. `INSERT … SELECT` desde `serenata_musician_profiles` + join `serenata_musicians` por `user_id`.
5. Para `user_id` sin fila en `serenata_musicians`: `INSERT INTO serenata_musicians` mínimo (instrumento desde primer elemento de instruments o `'Voz'`, bio, teléfono).
6. **Lineup:** columna provisional `canonical_musician_id` → UPDATE join profile→musician por `user_id` → DROP FK viejo → DROP `musician_id` → rename → NOT NULL → FK nueva.
7. `DROP TABLE serenata_musician_profiles` (solo tras verificar FKs).
8. Índices en crew: `(coordinator_profile_id)`, `(musician_id)`, `(membership_status)`.

Rollback: desde backup antes de DROP; este plan está pensado para **forward-only** en entornos con datos escasos/dev.

## Fase D — API (`services/api`)

1. Eliminar todas las queries a `tables.serenataMusicianProfiles` en `serenatas/router.ts`.
2. Crew: rutas siguen igual en URL donde sea viable; internamente usar `serenata_coordinator_crew_memberships`; IDs en respuestas = `crewMembership.id` (reemplazo de `profileId`).
3. **Perfil:**
   - `GET /musicians/me/profile` — lectura desde `serenata_musicians` + usuario.
   - `PATCH /musicians/me/profile` — actualiza musicians (+ opcional nombre en users si coincide con diseño actual).
   - `PATCH /musicians/me/availability` — `is_available`, `available_now`.
4. Lineup y `POST /:id/accept`: resolver músico solo con `serenata_musicians` por `user_id`; insert con `status='accepted'`, `initiator='musician'` cuando es auto-sumarse.
5. `useSerenatasRouterDeps`: quitar tabla `serenataMusicianProfiles`, añadir `serenataCoordinatorCrewMemberships`; actualizar scripts admin/seed/delete user.

## Fase E — Frontend (`apps/simpleserenatas`)

1. `musicians/me/memberships/:id/respond`: usar nuevo id de membresía (respuesta API desde invitaciones/crew).
2. Páginas `/cuadrilla`, `/invitaciones`, `/grupos`: donde se use `profileId` de membresía, renombrar a `crewMembershipId` o mapear desde payload unificado del API.
3. `musician/edit` y `AuthContext`: asegurar que `me/profile` y disponibilidad apunten a endpoints que existan (Fase D).
4. README `simpleserenatas`: alinear rutas documentadas.

## Fase F — Verificación

- `pnpm --filter @simple/api exec tsc --noEmit`
- `pnpm --filter @simple/serenatas exec tsc --noEmit`
- Migración local contra DB de desarrollo antes de prod.

## Fase G — Post–MVP (no en este mismo PR necesariamente)

- Listado geográfico de serenatas para músicos (`serenatas` + coords).
- Búsqueda de músicos para coordinador sin depender solo de email.
- Unificación UX “un solo perfil” con toggle coordinador cuando exista subscription activa.

---

**Estado:** plan aprobado para implementación; ejecución: Fases C→D→E→F.
