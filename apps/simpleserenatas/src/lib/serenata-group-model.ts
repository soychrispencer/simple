/**
 * Modelo dual en Simple Serenatas (ver `serenatas-terminology.ts` para copy UI).
 *
 * **Mariachi / marca comercial (marketplace, migración 0049)**
 * - Tablas: `serenata_provider_groups`, `serenata_provider_group_members`
 * - UI: Mi Negocio → Perfil comercial / Servicios / Disponibilidad / Configuraciones
 * - API: `/provider-groups/*`, `/marketplace/*`
 *
 * **Grupo de músicos**
 * - Tablas: `serenata_groups` (+ `provider_group_id` desde 0057), `serenata_group_members`
 * - UI: Mi Negocio → Grupos (músicos disponibles + grupos de músicos) y asignación en Solicitudes
 * - API: `GET /groups`, `POST /serenatas/:id/assign-group`
 *
 * Marketplace: la serenata lleva `providerGroupId`. `assign-group` arma el grupo de músicos con
 * integrantes activos del mariachi y valida el mínimo definido por el servicio contratado.
 */

export type SerenataGroupModelLayer = 'mariachi_profile' | 'service_catalog' | 'musician_group';
