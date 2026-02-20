# Migration Backend Playbook (Fase 0-2)

**Status:** Active execution guide  
**Owner:** Christian  
**Scope:** Fase 0, Fase 1, Fase 2 (Master Plan 2026)  
**Last update:** 2026-02-17

---

## 1) Purpose

Operational runbook to execute backend modernization without losing current progress.

This is not a design doc.  
This is the step-by-step playbook to run migration safely.

---

## 2) Working rules

1. No full rewrites.
2. No production schema manual edits.
3. Every structural change needs:
   - migration file
   - owner
   - rollback path
4. Every cutover needs:
   - feature flag
   - parity check
   - observability checkpoint

---

## 3) Roles and ownership

Minimum ownership required:

- **Platform owner:** infra, deploy, env, runtime reliability.
- **Data owner:** schema governance, migrations, deprecations.
- **Domain owner (Listings):** contracts, use-cases, parity.
- **Integration owner:** social/email/payment adapters.

No task starts without explicit owner.

---

## 4) Fase 0 runbook - Preparation and control

## 4.1 Objectives

- Freeze chaos.
- Build factual map of what exists.
- Establish baseline to compare improvements.

## 4.2 Tasks

1. Build module map:
   - apps and packages
   - current backend dependencies
   - critical user flows

2. Build data inventory:
   - tables, columns, indexes
   - owner candidate
   - known consumer code

3. Build risk matrix:
   - flow
   - risk
   - impact
   - mitigation
   - rollback note

4. Capture baseline metrics:
   - API error rate
   - p95 latency on critical routes
   - queue failure (if present)
   - cost baseline (VPS + external services)

## 4.3 Artifacts to produce

- `docs/db/DATA-CATALOG-INITIAL.md`
- `docs/meta/MODULE-OWNERSHIP.md`
- `docs/meta/RISK-MATRIX-MIGRATION.md`
- `docs/meta/BASELINE-METRICS-YYYY-MM-DD.md`

## 4.4 Exit criteria

- [ ] Ownership map approved.
- [ ] Data inventory approved.
- [ ] Baseline metrics documented.
- [ ] Risks and rollback notes documented.

---

## 5) Fase 1 runbook - Data governance

## 5.1 Objectives

- Make schema evolution deterministic.
- Prevent duplicated and orphaned structures.

## 5.2 Tasks

1. Enforce migration policy:
   - one migration per scoped change
   - reversible where possible
   - clear naming convention

2. Activate catalog governance:
   - each table/column has owner + purpose + status

3. Enforce deprecation lifecycle:
   - mark -> schedule -> remove

4. Add CI checks:
   - migration docs required
   - drift checks
   - blocked merge on governance violations

## 5.3 Artifacts to produce/update

- `docs/08-DB-MIGRATIONS.md` (policy + index)
- `docs/db/SCHEMA-CONTRACT.md` (authoritative contract)
- `docs/db/DATA-CATALOG-INITIAL.md` -> evolve to current catalog

## 5.4 Exit criteria

- [ ] No unmanaged schema changes.
- [ ] CI governance checks running and blocking.
- [ ] Deprecation process in active use.

---

## 6) Fase 2 runbook - Domain API bootstrap (parallel)

## 6.1 Objectives

- Introduce `services/api` (Fastify) in parallel.
- Start with read-parity on first technical slice.
- Execute directly in production with feature flags and rollback.

## 6.2 First slice definition

`listings + media + publish queue`

Includes:
- listing read models
- listing details
- media references/metadata
- queue endpoint contract for publish flow

## 6.3 Tasks

1. Bootstrap API project:
   - Fastify
   - TypeScript strict
   - Zod validation
   - logging middleware

2. Define contracts:
   - request/response schemas
   - shared types package export

3. Implement read-only endpoints (parity mode):
   - no destructive operations in first pass

4. Build contract tests:
   - compare API outputs vs current behavior

5. Gate frontend usage by feature flag:
   - vertical-by-vertical enablement

## 6.4 Suggested endpoint scope (initial)

- `GET /v1/listings`
- `GET /v1/listings/:id`
- `GET /v1/listings/:id/media`
- `POST /v1/publish/queue` (accepted only, async path)

## 6.5 Exit criteria

- [ ] Endpoints deployed in production (flag-controlled).
- [x] Contract tests green.
- [ ] Parity report approved.
- [x] Feature-flag rollout path ready.

---

## 7) Rollout protocol (feature flags)

1. Deploy API changes dark (flag off).
2. Enable in production only for one flow/vertical.
3. Validate KPI tecnico y UX.
4. Expand progressively.

If errors exceed threshold:
- disable flag
- rollback to previous stable path
- open incident note

---

## 8) Incident and rollback protocol

For each migrated flow, keep:

- rollback command/steps
- owner on-call
- data impact note
- verification checklist after rollback

Mandatory post-incident artifact:
- `docs/meta/INCIDENT-YYYY-MM-DD-<slug>.md`

---

## 9) Execution cadence (continuous)

### Step 1
- Pick one migration slice only.
- Confirm owner + rollback path.

### Step 2
- Implement and validate (`typecheck`, `build`, tests).
- Deploy dark if feature flag applies.

### Step 3
- Activate flag in controlled way.
- Monitor KPI tecnico/UX.

### Step 4
- Close slice (pass/fail), document learnings.
- Move to the next slice immediately.

---

## 10) KPI tracking for Fase 0-2

- `% catalog coverage` (tables/columns with owner/status).
- `% critical routes under typed contracts`.
- `contract test pass rate`.
- `incident count related to migration`.
- `p95 latency delta vs baseline`.

---

## 11) Templates

## 11.1 Migration task template

```md
### Migration Task
- ID:
- Owner:
- Scope:
- Dependencies:
- Feature flag:
- Rollback strategy:
- Observability checkpoints:
- Exit criteria:
```

## 11.2 ADR template (minimum)

```md
# ADR-XXX: <Title>
- Date:
- Status:
- Context:
- Options considered:
- Decision:
- Consequences:
- Rollback plan:
```

## 11.3 Parity report template

```md
# Parity Report - <Slice>
- Date:
- Owner:
- Compared flows:
- Match rate:
- Known deviations:
- Go/No-Go recommendation:
```

---

## 12) Quick start checklist (secuencial)

- [x] Create ownership map artifact.
- [x] Create initial data catalog artifact.
- [x] Publish risk matrix.
- [x] Capture baseline metrics.
- [x] Bootstrap `services/api` skeleton.
- [x] Define first slice contracts.
- [x] Add first contract tests.

---

## 13) References

- `docs/00-MASTER-PLAN.md`
- `docs/06-ROADMAP.md`
- `docs/10-TARGET-ARCHITECTURE-2026.md`
- `docs/08-DB-MIGRATIONS.md`
- `docs/03-BACKEND.md`
