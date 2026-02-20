# Risk Matrix - Backend Migration

**Status:** Active v1  
**Owner:** Christian  
**Scope:** Sprint 1 baseline (Fase 0)  
**Last update:** 2026-02-17

---

## 1) Purpose

Track migration risks with explicit mitigations and rollback triggers.

Scale:

- Probability: `Low`, `Medium`, `High`
- Impact: `Low`, `Medium`, `High`, `Critical`

---

## 2) Risk matrix

| ID | Status | Flow | Risk | Probability | Impact | Mitigation | Rollback Trigger (Threshold) | Owner | Playbook Ref |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | open | Auth/session | auth break during provider abstraction | Medium | Critical | keep current auth path behind flag, contract tests, staging soak | login failure rate > 2% for 10 min | backend-api | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#8-incident-and-rollback-protocol` |
| R-002 | open | Listing publish | inconsistency between legacy path and new API path | Medium | High | parity tests, idempotency keys, one-way canary | publish error rate > baseline + 1.5% for 15 min | backend-api | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#6-fase-2-runbook---domain-api-bootstrap-parallel`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags` |
| R-003 | open | Media upload | broken object URLs after storage switch | Medium | High | dual URL validation, fallback resolver, migration script dry-run | media 404 rate > 0.5% for 15 min | backend-api | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#6-fase-2-runbook---domain-api-bootstrap-parallel`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags` |
| R-004 | open | DB schema | drift from unmanaged changes | High | High | CI blocking for migrations/docs, no manual prod SQL | any detected drift in release branch | backend-data | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#5-fase-1-runbook---data-governance`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#9-weekly-execution-cadence` |
| R-005 | open | Integrations | Instagram publish retries storm | Medium | Medium | queue throttling, backoff, DLQ caps | queue lag > 15 min or retry burst > 3x baseline | backend-integrations | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#6-fase-2-runbook---domain-api-bootstrap-parallel`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags` |
| R-006 | open | Payments | manual payment state mismatch | Medium | High | explicit state machine, admin audit log, reconciliation job | approved vs activated mismatch > 1% daily | backend-billing | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#6-fase-2-runbook---domain-api-bootstrap-parallel`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#8-incident-and-rollback-protocol` |
| R-007 | open | Search/listing read | API parity mismatch affects catalog pages | Medium | High | response diff tests, read-only rollout first | p95 latency +50% and payload mismatch > 1% | backend-api | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#6-fase-2-runbook---domain-api-bootstrap-parallel`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags` |
| R-008 | open | Deployment | bad release to both verticals simultaneously | Medium | High | blue/green or staggered deploy, one vertical at a time | error rate in first vertical > baseline + 2% | platform-infra | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#8-incident-and-rollback-protocol` |
| R-009 | open | Secrets/security | leaked provider keys in repo/env | Low | Critical | secret scanning, env-only policy, key rotation | any confirmed credential exposure | platform-security | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#2-working-rules`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#8-incident-and-rollback-protocol` |
| R-010 | open | Observability | blind migration (no telemetry) | Medium | High | logging/metrics checklist before cutover | missing telemetry in critical endpoints > 5 min | observability | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#9-weekly-execution-cadence` |
| R-011 | open | Data migration | incomplete data copy to self-hosted DB | Medium | Critical | checksum comparison, row count diff, controlled cutover window | count/hash mismatch in critical tables | backend-data | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#6-fase-2-runbook---domain-api-bootstrap-parallel`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#8-incident-and-rollback-protocol` |
| R-012 | mitigated | Team process | unclear ownership blocks decisions | Medium | Medium | ownership map + weekly review cadence | unresolved decision > 3 business days | platform-infra | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#3-roles-and-ownership`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#9-weekly-execution-cadence` |
| R-013 | open | Feature flags | flag misconfiguration enables unfinished path | Medium | High | env validation at startup, safe defaults OFF | unknown flag state in production at deploy | qa-release | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#8-incident-and-rollback-protocol` |
| R-014 | open | User impact | UI contract mismatch (types vs API) | Medium | High | shared schema package + contract CI | runtime validation error rate > 1% | frontend-platform | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#6-fase-2-runbook---domain-api-bootstrap-parallel`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#7-rollout-protocol-feature-flags` |
| R-015 | open | Compliance/privacy | retention misuse in sensitive columns (ip, personal data) | Low | High | retention policy + data minimization review | non-compliant retention finding in audit | platform-security | `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#5-fase-1-runbook---data-governance`, `docs/11-MIGRATION-BACKEND-PLAYBOOK.md#8-incident-and-rollback-protocol` |

---

## 3) Critical risk watchlist (always on)

1. `R-001` Auth/session
2. `R-004` Schema drift
3. `R-009` Secret exposure
4. `R-011` Data migration integrity

These four are hard blockers for cutover decisions.

---

## 4) Weekly review protocol

- Review all `High` and `Critical` impact items weekly.
- Update risk status:
  - `open`
  - `mitigated`
  - `accepted`
  - `closed`
- Add incident references when applicable.

---

## 5) Open actions

- [x] Add current status column per risk.
- [x] Attach metric thresholds to each rollback trigger.
- [x] Link each risk to runbook section in `docs/11-MIGRATION-BACKEND-PLAYBOOK.md`.
- [ ] Validate thresholds against real telemetry after first metric collection cycle.
