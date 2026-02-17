# Docs

Este directorio contiene la documentación del ecosistema Simple.

## Guías principales (fuente de verdad)

- [00-MASTER-PLAN.md](00-MASTER-PLAN.md) — visión, fases y objetivos
- [01-ARCHITECTURE.md](01-ARCHITECTURE.md) — arquitectura técnica del monorepo
- [02-MIGRATION-GUIDE.md](02-MIGRATION-GUIDE.md) — guía de migración / convenciones
- [03-BACKEND.md](03-BACKEND.md) — referencia del backend (Supabase/Postgres)
- [04-COMPONENT-GUIDE.md](04-COMPONENT-GUIDE.md) — guía de componentes compartidos
- [05-DEVELOPMENT-GUIDE.md](05-DEVELOPMENT-GUIDE.md) — guía de desarrollo (DX, tooling)
- [06-ROADMAP.md](06-ROADMAP.md) — roadmap operativo
- [07-LOGO-SYSTEM.md](07-LOGO-SYSTEM.md) — identidad visual
- [09-DEPLOYMENT-COOLIFY.md](09-DEPLOYMENT-COOLIFY.md) — despliegue en VPS/Coolify

## Operativo (SQL + outputs)

Carpeta: [catalog/](catalog/)

- [catalog/catalog-audit.sql](catalog/catalog-audit.sql) — queries para auditar catálogo
- [catalog/catalog-moderation.sql](catalog/catalog-moderation.sql) — queries de moderación
- [catalog/catalog-audit-output.md](catalog/catalog-audit-output.md) — salida generada por `npm run catalog:audit`

## Meta (reglas internas / notas)

Carpeta: [meta/](meta/)

- [meta/CONTACT-RULES.md](meta/CONTACT-RULES.md) — regla de contacto seguro
- [meta/ONBOARDING-STATES.md](meta/ONBOARDING-STATES.md) — estados de onboarding
- [meta/IMPLEMENTATION-SUMMARY.md](meta/IMPLEMENTATION-SUMMARY.md) — resumen/acta de fase
- [meta/backend_front_mapping.csv](meta/backend_front_mapping.csv) — mapeo backend ↔ frontend (referencial)

## Archivo

Carpeta: [archive/](archive/)

- Contiene documentos históricos que no son la fuente principal.
