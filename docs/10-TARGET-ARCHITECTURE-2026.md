# Target Architecture 2026

**Status:** Active target  
**Owner:** Platform/Backend  
**Aligned with:** `docs/00-MASTER-PLAN.md`, `docs/06-ROADMAP.md`  
**Last update:** 2026-02-17

---

## 1) Purpose

Define the target architecture for Simple Ecosystem in 2026:

- Full control from VPS.
- Progressive migration, no full rewrite.
- Reduced vendor coupling.
- Strong data governance.

This document is the technical north star.  
Execution steps live in `docs/11-MIGRATION-BACKEND-PLAYBOOK.md`.

---

## 2) Architecture style

### 2.1 Core style

- **Modular Monolith** (single deployable API, internal domain boundaries).
- **Hexagonal Architecture** (ports/adapters).
- **Event-driven async** for non-immediate workflows.

### 2.2 Why this style

- Faster delivery than microservices for current team size.
- Better control and consistency than mixed ad-hoc server actions.
- Enables future extraction of modules if scale requires it.

---

## 3) Logical topology

```text
apps/* (Next.js verticals)
    |
    | HTTPS (typed contracts)
    v
services/api (Fastify modular monolith)
    |
    +--> PostgreSQL (primary source of truth)
    +--> Redis (cache + queues)
    +--> BullMQ workers (async jobs)
    +--> MinIO (objects/media)
    +--> Optional Meilisearch (catalog search)
    +--> External providers via adapters (payments/maps/social/email)
```

---

## 4) Module boundaries (domain-first)

The API must be organized by domains, not by pages:

1. `auth`
2. `profiles`
3. `companies`
4. `listings`
5. `media`
6. `integrations` (instagram/meta/email/webhooks)
7. `billing` (manual first, provider-ready)
8. `analytics`
9. `admin-governance`

### Boundary rules

- Each module owns:
  - routes
  - service/use-cases
  - repository layer
  - validation schemas (Zod)
  - tests
- Cross-module calls only through application services/contracts.
- No direct provider SDK imports inside domain use-cases.

---

## 5) Ports and adapters

### 5.1 Required ports

- `AuthProvider`
- `StorageProvider`
- `PaymentsProvider`
- `MapsProvider`
- `SocialPublishProvider`
- `EmailProvider`

### 5.2 Adapter strategy

- Keep current adapter(s) for migration continuity.
- Add self-hosted/target adapter implementations.
- Switch by configuration/feature flag, not by code fork.

### 5.3 Mandatory pattern

```text
UseCase -> Port Interface -> Adapter Implementation -> External system
```

Never:

```text
UseCase -> External SDK directly
```

---

## 6) Data architecture

### 6.1 Source of truth

- PostgreSQL is the system of record.
- Drizzle schema + migrations are the only schema source.
- No manual SQL changes in production.

### 6.2 Governance layer

- Data catalog required for every table/column:
  - owner
  - purpose
  - status (`active`, `deprecated`, `scheduled_drop`, `removed`)
- Deprecation registry required before removal.
- CI checks for schema drift and undocumented migrations.

### 6.3 Migration model

- Strangler pattern:
  - coexist
  - parity
  - switch
  - retire
- Optional dual-write only for high-risk flows.

---

## 7) Async and integration model

### 7.1 Queue-first for external operations

All non-trivial external operations run via queue:

- social publishing
- token refresh
- email dispatch
- heavy media processing
- retries/reconciliation

### 7.2 Reliability requirements

- Exponential backoff retries.
- Dead-letter queue.
- Job-level audit trail.
- Idempotency keys for publish/payment actions.

---

## 8) Deployment topology (VPS/Coolify)

### 8.1 Runtime components

- `apps/simpleautos` (Next.js)
- `apps/simplepropiedades` (Next.js)
- `services/api` (Fastify)
- `worker` (BullMQ consumers)
- `postgres`
- `redis`
- `minio`
- reverse proxy + TLS

### 8.2 Environments

- `local`
- `staging`
- `production`

Promotion rule:

```text
local -> staging -> production
```

No direct production-first structural changes.

---

## 9) Observability target

### 9.1 Minimum required

- Structured logs (`request_id`, `user_id`, `company_id`, `vertical`, `module`).
- Metrics:
  - p50/p95 latency by route
  - error rate by module
  - queue lag/failures
  - DB query timings
- Tracing for cross-boundary operations.

### 9.2 SLO baseline

Initial target (to refine after baseline):

- Availability: 99.5%
- API p95 latency: < 500ms on critical reads
- Queue success rate: > 99% (after retries)

---

## 10) Security target

- Secrets only in runtime env, never committed.
- Secret rotation policy documented.
- Least-privilege DB users.
- Audit trail for admin actions.
- Signed webhooks and replay protection.
- Input validation at boundaries (Zod).

---

## 11) Compatibility with current codebase

This target is explicitly designed to preserve current progress:

- UI packages stay valid.
- Existing vertical flows stay operational.
- Current provider-backed logic is wrapped before replacement.
- Migration happens by slices (e.g. `listings + media + publish queue`).

---

## 12) Architecture decision gates

Before moving from one phase to the next, answer:

1. Is parity objectively measured?
2. Is rollback tested?
3. Is data ownership clear?
4. Are contracts versioned and validated?
5. Is observability sufficient to detect regressions?

If any answer is "no", do not promote.

---

## 13) Out of scope (for now)

- Full microservices split.
- Multi-region active-active topology.
- Early over-optimization for ultra scale.

Focus is controlled modernization and operational reliability.

