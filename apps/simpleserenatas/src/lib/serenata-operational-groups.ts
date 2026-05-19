/**
 * Modelo dual de “grupos” en Simple Serenatas (auditoría técnica — Anexo A).
 *
 * **Grupo comercial / plantel (marketplace, migración 0049)**
 * - Tablas: `serenata_provider_groups`, `serenata_provider_group_members`
 * - UI: Mi Negocio → Perfil / Servicios / Plantel (`provider-group-view`, `groups-view`)
 * - API: `/provider-groups/*`, `/marketplace/*`
 *
 * **Jornada operativa (evento del día)**
 * - Tablas: `serenata_groups` (+ `provider_group_id` desde 0057), `serenata_group_members`
 * - UI: asignación en Solicitudes (`SerenataGroupAssignment`) crea o reutiliza jornada del proveedor
 * - API: `GET /groups`, `POST /serenatas/:id/assign-group`
 *
 * Marketplace: la serenata lleva `providerGroupId`. `assign-group` valida plantel activo, vincula la jornada
 * al mismo `provider_group_id` y reutiliza jornada activa del mismo día cuando existe. Legacy sin proveedor
 * sigue usando jornadas sin `provider_group_id`.
 *
 * KPIs admin: plantel → `myProviderGroups` + members; jornadas del día → `GET /groups` (filtrar por proveedor en UI).
 */

export type SerenataOperationalGroupKind = 'provider_commercial' | 'event_jornada';
