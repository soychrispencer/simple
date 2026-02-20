# Module Ownership (Initial)

**Status:** Active v1  
**Owner:** Christian  
**Scope:** Sprint 1, Fase 0  
**Last update:** 2026-02-17

---

## 1) Purpose

Define clear ownership for technical modules to avoid orphan decisions, duplicated work and unclear accountability.

This is the initial map and must be reviewed weekly during migration.

---

## 2) Ownership model

- `Module Owner`: accountable for architecture and delivery.
- `Technical Backup`: secondary owner for continuity.
- `Decision scope`: what this module can decide without escalation.
- `Escalation`: when to escalate to platform-level decision.

### Solo-owner mode (current)

Until a second technical owner is assigned, the project operates in solo-owner mode:

- Module owner: Christian
- Technical backup: Christian (acting backup)
- On-call: Christian

This is temporary and must be replaced by explicit backups when team capacity expands.

---

## 3) Owners by module

| Module | Scope | Module Owner | Technical Backup | Decision Scope | Escalation Trigger |
| --- | --- | --- | --- | --- | --- |
| `platform-infra` | Coolify, VPS runtime, DNS, TLS, deploy topology | Christian | Christian (acting backup) | Runtime configs, service topology, resource limits | Incident > P1, downtime > 15 min |
| `platform-security` | secrets, env policy, access controls | Christian | Christian (acting backup) | Secret lifecycle and exposure policy | leaked credentials, auth breach risk |
| `backend-data` | schema, migrations, deprecations, governance | Christian | Christian (acting backup) | DB changes, contracts, deprecation schedule | destructive migration risk |
| `backend-api` | `services/api`, contracts, module boundaries | Christian | Christian (acting backup) | route conventions, use-case boundaries | cross-module coupling conflict |
| `backend-async` | Redis/BullMQ workers, retries, DLQ | Christian | Christian (acting backup) | retry policies, queue throughput controls | queue backlog saturation |
| `backend-integrations` | Instagram/Meta, external APIs, webhooks | Christian | Christian (acting backup) | provider adapters and delivery flow | provider API breaking change |
| `backend-billing` | manual payments, subscription workflows | Christian | Christian (acting backup) | payment process states and audit fields | reconciliation mismatch |
| `frontend-platform` | shared UX conventions, app shell consistency | Christian | Christian (acting backup) | shared UI/UX rules | breaking shared component behavior |
| `frontend-autos` | Autos vertical features and flows | Christian | Christian (acting backup) | autos-specific business logic | cross-vertical contract break |
| `frontend-properties` | Propiedades vertical features and flows | Christian | Christian (acting backup) | properties-specific business logic | cross-vertical contract break |
| `shared-packages` | `packages/*` (ui, auth, config, panel, types) | Christian | Christian (acting backup) | API surface and semver policy | package API breaking change |
| `observability` | logs, metrics, tracing, alerting | Christian | Christian (acting backup) | instrumentation standards | no visibility on critical flow |
| `qa-release` | parity checks, migration readiness gates | Christian | Christian (acting backup) | release gate definitions | parity fail in critical flow |

---

## 4) Domain boundaries (authoritative)

These boundaries are mandatory for architecture decisions:

1. `auth`
2. `profiles`
3. `companies`
4. `listings`
5. `media`
6. `integrations`
7. `billing`
8. `analytics`
9. `admin-governance`

Any new feature must map to one of these domains before implementation.

---

## 5) RACI (minimum)

| Activity | Responsible | Accountable | Consulted | Informed |
| --- | --- | --- | --- | --- |
| New migration proposal | backend-data | Christian | backend-api | all module owners |
| Critical flow API change | backend-api | Christian | frontend vertical owner | qa-release |
| New provider integration | backend-integrations | Christian | backend-async, backend-security | frontend owners |
| Deploy/cutover | platform-infra | Christian | qa-release, backend-api | all module owners |
| Incident triage P1 | platform-infra | Christian | affected module owner | all |

---

## 6) Immediate action items

- [x] Confirm backups for each module (solo-owner mode).
- [x] Assign primary on-call rotation for `platform-infra` and `backend-api` (Christian).
- [x] Add ownership metadata to major docs (`owner` header).
- [ ] Validate ownership map in weekly architecture review.
