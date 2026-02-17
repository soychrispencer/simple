# DB Audit Report

- Generated at: 2026-02-15T00:43:17.999Z
- Database: audit target via URL env
- Source scope: frontend
- Tables analyzed (public): 39
- Source files scanned: 474

## Table Inventory

| Table | Rows | Size |
| --- | --- | --- |
| models | 763 | 336.00 KB |
| communes | 346 | 160.00 KB |
| brands | 334 | 152.00 KB |
| features_catalog | 102 | 224.00 KB |
| regions | 16 | 80.00 KB |
| boost_slots | 11 | 64.00 KB |
| images | 8 | 88.00 KB |
| schedules | 7 | 96.00 KB |
| vehicle_types | 7 | 128.00 KB |
| notifications | 6 | 48.00 KB |
| subscription_plans | 5 | 64.00 KB |
| verticals | 4 | 96.00 KB |
| profiles | 2 | 64.00 KB |
| vehicle_sale_service_requests | 2 | 88.00 KB |
| companies | 1 | 64.00 KB |
| listing_metrics | 1 | 56.00 KB |
| listings | 1 | 336.00 KB |
| listings_vehicles | 1 | 80.00 KB |
| public_profiles | 1 | 112.00 KB |
| company_users | 0 | 80.00 KB |
| documents | 0 | 64.00 KB |
| favorites | 0 | 56.00 KB |
| integration_instagram | 0 | 24.00 KB |
| integration_instagram_posts | 0 | 40.00 KB |
| integrations | 0 | 24.00 KB |
| listing_boost_slots | 0 | 72.00 KB |
| listing_boosts | 0 | 48.00 KB |
| listing_reports | 0 | 80.00 KB |
| listings_properties | 0 | 32.00 KB |
| messages | 0 | 72.00 KB |
| payments | 0 | 32.00 KB |
| profile_addresses | 0 | 64.00 KB |
| reviews | 0 | 32.00 KB |
| schema_deprecations | 0 | 32.00 KB |
| special_schedules | 0 | 96.00 KB |
| sso_tokens | 0 | 32.00 KB |
| subscriptions | 0 | 88.00 KB |
| user_verticals | 0 | 40.00 KB |
| vehicle_sale_service_request_events | 0 | 32.00 KB |

## Empty Tables

| Table | Size |
| --- | --- |
| company_users | 80.00 KB |
| documents | 64.00 KB |
| favorites | 56.00 KB |
| integration_instagram | 24.00 KB |
| integration_instagram_posts | 40.00 KB |
| integrations | 24.00 KB |
| listing_boost_slots | 72.00 KB |
| listing_boosts | 48.00 KB |
| listing_reports | 80.00 KB |
| listings_properties | 32.00 KB |
| messages | 72.00 KB |
| payments | 32.00 KB |
| profile_addresses | 64.00 KB |
| reviews | 32.00 KB |
| schema_deprecations | 32.00 KB |
| special_schedules | 96.00 KB |
| sso_tokens | 32.00 KB |
| subscriptions | 88.00 KB |
| user_verticals | 40.00 KB |
| vehicle_sale_service_request_events | 32.00 KB |

## Tables Without Direct Code Reference

| Table | Rows | Notes |
| --- | --- | --- |
| integration_instagram | 0 | Puede ser tabla de soporte, seed o no usada |
| integration_instagram_posts | 0 | Puede ser tabla de soporte, seed o no usada |
| integrations | 0 | Puede ser tabla de soporte, seed o no usada |
| profile_addresses | 0 | Puede ser tabla de soporte, seed o no usada |
| schema_deprecations | 0 | Puede ser tabla de soporte, seed o no usada |
| sso_tokens | 0 | Puede ser tabla de soporte, seed o no usada |
| user_verticals | 0 | Puede ser tabla de soporte, seed o no usada |

## Possible Unused Columns (Heuristic)

| Table | Column | Type |
| --- | --- | --- |
| boost_slots | key | text |
| companies | rut | text |
| company_users | joined_at | timestamp with time zone |
| documents | url | text |
| images | url | text |
| integration_instagram | token_type | text |
| integration_instagram_posts | image_url | text |
| integrations | connected_at | timestamp with time zone |
| listings_properties | orientation | text |
| listings_vehicles | vin | text |
| message_threads | unread_for_owner | bigint |
| message_threads | unread_for_counterparty | bigint |
| profile_addresses | line1 | text |
| profile_addresses | line2 | text |
| profile_addresses | postal_code | text |
| profile_addresses | is_default | boolean |
| profiles | timezone | text |
| profiles | selected_public_mode | text |
| public_profiles | bio | text |
| public_profiles | profession | text |
| public_profiles | verification_status | text |
| public_profiles | business_kind | text |
| schema_deprecations | schema_name | text |
| schema_deprecations | table_name | text |
| schema_deprecations | column_name | text |
| schema_deprecations | migration_marked | text |
| schema_deprecations | migration_removed | text |
| schema_deprecations | remove_after | timestamp with time zone |
| sso_tokens | target_domain | text |
| sso_tokens | used_at | timestamp with time zone |
| subscription_plans | target_type | text |
| subscription_plans | price_yearly | numeric |
| subscriptions | target_type | text |
| vehicle_sale_service_requests | ip | text |
| verticals | key | text |

## High Overlap Table Pairs

No table pairs above overlap threshold.

## Active Deprecations

No active deprecations registered.

