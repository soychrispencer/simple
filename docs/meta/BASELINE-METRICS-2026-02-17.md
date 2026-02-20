# Baseline Metrics - 2026-02-17

**Status:** Baseline v1  
**Purpose:** Reference point for migration impact comparisons  
**Scope:** Fase 0

---

## 1) Data source references

- DB inventory source: `docs/db/db-audit-latest.md` (generated 2026-02-15).
- Migration strategy source: `docs/00-MASTER-PLAN.md`.
- Roadmap source: `docs/06-ROADMAP.md`.

---

## 2) Database baseline snapshot

### 2.1 Summary

- Public tables analyzed: `39`
- Empty tables: `20`
- Tables with direct non-zero activity focus:
  - `listings`
  - `listings_vehicles`
  - `images`
  - `notifications`
  - `models`, `brands`, `regions`, `communes`, `features_catalog`

### 2.2 Core row counts (selected)

| Table | Rows |
| --- | ---: |
| `listings` | 1 |
| `listings_vehicles` | 1 |
| `listings_properties` | 0 |
| `images` | 8 |
| `profiles` | 2 |
| `public_profiles` | 1 |
| `verticals` | 4 |
| `companies` | 1 |
| `company_users` | 0 |
| `integration_instagram` | 0 |
| `integration_instagram_posts` | 0 |
| `subscriptions` | 0 |
| `payments` | 0 |
| `listing_metrics` | 1 |

---

## 3) Runtime baseline (to be instrumented)

Current observability is partial.  
These values are baseline placeholders and must be replaced by measured telemetry in Sprint 1.

| Metric | Baseline Value | Source | Status |
| --- | --- | --- | --- |
| API availability | N/A | not centrally measured | pending |
| API p95 latency (critical reads) | N/A | not centrally measured | pending |
| Publish flow error rate | N/A | no central dashboard | pending |
| Queue lag/failure rate | N/A | worker telemetry partial | pending |
| Auth failure rate | N/A | no central dashboard | pending |
| Deployment failure rate | N/A | no consolidated metric | pending |

---

## 4) Quality baseline (local checks)

Latest known validation in current cycle:

- `@simple/ui` typecheck: `pass`
- `simpleautos` typecheck: `pass`
- `simplepropiedades` typecheck: `pass`

Note: this is a developer baseline, not production reliability telemetry.

---

## 5) Cost baseline (VPS-first model)

| Cost Item | Baseline |
| --- | --- |
| VPS runtime | active (manual tracking required) |
| Domain + SSL | active |
| Managed backend services | Supabase currently in use |
| Planned self-hosted target | PostgreSQL + Redis + MinIO on VPS |

Action: include monthly numeric cost sheet from next finance review cycle.

---

## 6) Baseline gaps to close in Sprint 1

- [ ] Add centralized API metrics (latency/error by route).
- [ ] Add queue metrics (lag, retries, DLQ count).
- [ ] Add auth/login success-failure metrics.
- [ ] Add deployment success/failure dashboard.
- [ ] Add monthly infrastructure cost ledger.

---

## 7) Next baseline checkpoint

Target next checkpoint: after completion of Fase 1 governance controls.

Suggested file:

- `docs/meta/BASELINE-METRICS-2026-03-XX.md`

