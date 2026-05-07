# Esquema de base de datos — referencia rápida (Serenatas)

Fuente de verdad: [`services/api/src/db/schema.ts`](../services/api/src/db/schema.ts).  
Migraciones: `services/api/drizzle/`. Aplicar con `pnpm db:migrate` desde `services/api` (ver [DATABASE_SETUP.md](./DATABASE_SETUP.md)).

## Tablas verticales Serenatas (prefijo `serenata_` / `serenatas`)

| Tabla Drizzle | Nombre SQL | Rol |
|---------------|------------|-----|
| `serenataMusicians` | `serenata_musicians` | Perfil músico canónico (1 por usuario). |
| `serenataCoordinatorProfiles` | `serenata_coordinator_profiles` | Perfil coordinador. |
| `serenataCoordinatorCrewMemberships` | `serenata_coordinator_crew_memberships` | Cuadrilla músico ↔ coordinador. |
| `serenatas` | `serenatas` | **Serenata operativa** (cliente, coordinador, pago, estados). |
| `serenataRequests` | `serenata_requests` | Modelo **legacy/alternativo** de solicitudes (grupos/rutas antiguos). |
| `serenataGroups` | `serenata_groups` | Grupos por jornada. |
| `serenataGroupMembers` | `serenata_group_members` | Miembros del grupo. |
| `serenataAssignments` | `serenata_assignments` | Asignación serenata ↔ grupo. |
| `serenataRoutes` | `serenata_routes` | Rutas / waypoints. |
| `serenataMusicianLineup` | `serenata_musician_lineup` | Lineup por serenata. |
| `serenataPayments` | `serenata_payments` | Pagos escrow serenata. |
| `serenataSubscriptions` | `serenata_subscriptions` | Suscripción coordinador. |
| `serenataSubscriptionPayments` | `serenata_subscription_payments` | Pagos suscripción. |
| `serenataCoordinatorPreapprovals` | `serenata_coordinator_preapprovals` | Preapproval MP. |
| `serenataMpWebhookEvents` | `serenata_mp_webhook_events` | Auditoría webhooks MP. |
| `serenataAvailability` | `serenata_availability` | Disponibilidad coordinador. |
| `serenataAvailabilitySlots` | `serenata_availability_slots` | Slots semanales músico (legacy naming). |
| `serenataNotifications` | `serenata_notifications` | Notificaciones in-app. |
| `serenataMessages` | `serenata_messages` | Mensajes chat serenata. |
| `serenataReviews` | `serenata_reviews` | Reseñas. |
| `serenataCoordinatorReviews` | `serenata_coordinator_reviews` | Reseñas coordinador. |

## Decisiones de producto

Para nuevos flujos coordinador + pagos, la tabla canónica de evento es **`serenatas`** (ver [SERENATAS_DATA_MODEL.md](./SERENATAS_DATA_MODEL.md)).
