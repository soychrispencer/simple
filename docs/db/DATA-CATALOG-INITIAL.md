# Data Catalog - Initial Snapshot

**Status:** Draft v1  
**Scope:** Sprint 1, Fase 0/Fase 1 baseline  
**Last update:** 2026-02-17  
**Source references:** `docs/db/db-audit-latest.md` (generated 2026-02-15), `docs/db/SCHEMA-CONTRACT.md`

---

## 1) Purpose

Initial catalog of public tables with ownership and lifecycle status.

This file is the starting point for governance.  
Every table/column must eventually include:

- owner
- purpose
- status (`active`, `deprecated`, `scheduled_drop`, `removed`)
- consumer reference

---

## 2) Status legend

- `active`: in use or required by active architecture.
- `active-review`: expected to be active but requires usage verification.
- `support`: governance/infra support table.
- `candidate-review`: unclear usage, requires confirmation.

---

## 3) Table catalog (initial)

| Table | Domain | Rows (audit) | Status | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| `verticals` | platform | 4 | active | backend-data | domain registry for vertical behavior |
| `profiles` | auth/profiles | 2 | active | backend-data | extends identity data for app usage |
| `public_profiles` | profiles | 1 | active-review | backend-data | public profile projection |
| `companies` | companies | 1 | active-review | backend-data | company model for multi-tenant flows |
| `company_users` | companies | 0 | active-review | backend-data | role mapping company-user |
| `user_verticals` | auth/platform | 0 | active-review | backend-data | user-to-vertical access mapping |
| `sso_tokens` | auth/platform | 0 | support | backend-security | sso token exchange table |
| `subscriptions` | billing | 0 | active-review | backend-billing | active but low data volume today |
| `subscription_plans` | billing | 5 | active | backend-billing | productized plan definitions |
| `payments` | billing | 0 | active-review | backend-billing | payment ledger model |
| `integrations` | integrations | 0 | active | backend-integrations | provider parent record |
| `integration_instagram` | integrations | 0 | active | backend-integrations | instagram connection detail |
| `integration_instagram_posts` | integrations | 0 | active | backend-integrations | publish history/retry audit |
| `notifications` | engagement | 6 | active | backend-api | user notification stream |
| `messages` | engagement | 0 | active-review | backend-api | user conversations |
| `favorites` | engagement | 0 | active-review | backend-api | saved listings relation |
| `reviews` | engagement | 0 | active-review | backend-api | public review model |
| `listing_reports` | moderation | 0 | active-review | admin-governance | moderation report workflow |
| `listings` | listings | 1 | active | listings-owner | canonical listing root |
| `listing_metrics` | analytics | 1 | active | analytics-owner | aggregate listing metrics |
| `images` | media | 8 | active | media-owner | listing media references |
| `documents` | media/compliance | 0 | active-review | media-owner | structured docs/attachments |
| `listings_vehicles` | listings/autos | 1 | active | listings-owner | autos detail extension |
| `listings_properties` | listings/properties | 0 | active | listings-owner | properties detail extension |
| `listing_boost_slots` | promotions | 0 | active-review | backend-billing | slot assignment relation |
| `listing_boosts` | promotions | 0 | active-review | backend-billing | applied boosts tracking |
| `boost_slots` | promotions | 11 | active | backend-billing | boost inventory model |
| `vehicle_sale_service_requests` | autos/service | 2 | active-review | frontend-autos | assisted sale request flow |
| `vehicle_sale_service_request_events` | autos/service | 0 | active-review | frontend-autos | event log for service requests |
| `vehicle_types` | autos/catalog | 7 | active | frontend-autos | vehicle type taxonomy |
| `brands` | autos/catalog | 334 | active | frontend-autos | brand taxonomy |
| `models` | autos/catalog | 763 | active | frontend-autos | model taxonomy |
| `features_catalog` | autos/catalog | 102 | active | frontend-autos | normalized feature dictionary |
| `regions` | geo | 16 | active | platform-infra | geo master data |
| `communes` | geo | 346 | active | platform-infra | geo master data |
| `schedules` | availability | 7 | active-review | frontend-properties | business/public schedule model |
| `special_schedules` | availability | 0 | active-review | frontend-properties | special dates and overrides |
| `profile_addresses` | profiles/geo | 0 | active-review | backend-data | normalized address history |
| `schema_deprecations` | governance | 0 | support | backend-data | schema lifecycle registry |

---

## 4) Priority review set (first pass)

These tables need immediate usage validation in Sprint 1:

1. `sso_tokens`
2. `user_verticals`
3. `special_schedules`
4. `profile_addresses`
5. `reviews`
6. `documents`

Reason: low/zero rows and unclear active front usage from current audit.

---

## 5) Column-level initial review candidates

From current heuristic report (`db-audit-latest.md`):

| Table | Column | Status | Action |
| --- | --- | --- | --- |
| `boost_slots` | `key` | candidate-review | trace consumer or mark deprecation |
| `companies` | `rut` | candidate-review | verify legal/compliance requirement |
| `documents` | `url` | candidate-review | validate if replaced by storage path |
| `images` | `url` | active-review | verify canonical media field strategy |
| `listings_vehicles` | `vin` | active-review | keep if legal/verification planned |
| `public_profiles` | `bio` | candidate-review | verify current front usage |
| `vehicle_sale_service_requests` | `ip` | active-review | retention/privacy policy check |
| `verticals` | `key` | active | mandatory registry key |

---

## 6) Governance actions (next)

- [ ] Add `owner` and `purpose` metadata for each critical column in top 15 tables.
- [ ] Mark review outcomes in `schema_deprecations` when applicable.
- [ ] Link each table to code consumers (`apps/*`, `packages/*`, `services/api`).
- [ ] Publish `DATA-CATALOG-v2` after first validation round.

