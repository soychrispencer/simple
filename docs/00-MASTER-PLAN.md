# Simple Ecosystem - Master Plan 2026 (Go-To-Market)

**Autor:** Christian  
**Owner tecnico:** Christian  
**Estado:** Activo  
**Version:** 2026.03  
**Ultima actualizacion:** 20 de febrero de 2026

---

## 1) Meta del plan

Construir una plataforma marketplace + CRM multi-vertical moderna, operable desde VPS propio y lista para monetizar rapido.

La meta no es una reescritura total.  
La meta es mover el sistema actual a una base tecnica mas robusta, con cambios directos en entorno productivo controlado.

---

## 2) Decisiones de ejecucion (vigentes)

1. **Modo de despliegue:** Direct-to-Production (sin staging formal por ahora).
2. **Control de riesgo:** feature flags + rollback + backup antes de cada cambio critico.
3. **Arquitectura objetivo:** modular monolith + contracts + ports/adapters.
4. **Prioridad de negocio:** time-to-market y monetizacion antes que perfeccion academica.
5. **No perder avance:** se conserva todo lo construido y se migra por capas.

---

## 3) Principios no negociables

1. Ningun cambio estructural sin plan de rollback.
2. Ninguna tabla/columna nueva sin owner y uso definido.
3. Ninguna integracion externa sin trazabilidad (logs + estado + error).
4. Ningun cambio de frontend sin fallback cuando sea sensible.
5. Monorepo limpio: menos duplicidad, menos ramas de logica paralela.
6. Documentacion breve, actualizada y accionable.

---

## 4) Arquitectura objetivo 2026

### 4.1 Stack base

- Frontend: Next.js App Router + TypeScript + Tailwind + TanStack Query.
- API de dominio: Fastify + Zod + contratos tipados.
- Datos: PostgreSQL + migraciones disciplinadas.
- Jobs: Redis + BullMQ.
- Media: S3-compatible (MinIO objetivo).
- Infra: Coolify en VPS, healthchecks, backups, observabilidad.

### 4.2 Modelo de plataforma

- Un backend de dominio (`services/api`) para todas las verticales.
- Apps verticales consumen API por contrato.
- Integraciones (Meta, pagos, email, etc.) pasan por adapters.
- Supabase se usa como puente temporal, no como acoplamiento final.

---

## 5) Plan de ejecucion rapido (sin staging)

## Fase A - Base operativa unica (actual)

**Objetivo:** dejar una sola ruta de despliegue estable en produccion.

**Entregables:**
- `simple-api` desplegado y saludable en VPS.
- Feature flags operativos en frontend.
- Variables de entorno unificadas y ordenadas.
- Rotacion de secretos expuestos.

**Salida:**
- Plataforma estable para seguir iterando sin bloqueos de entorno.

## Fase B - Migracion de lectura (Autos -> Propiedades)

**Objetivo:** mover lectura de catalogo al backend nuevo sin romper UX.

**Entregables:**
- Autos consume `GET /v1/listings` por flag.
- Propiedades replica el mismo patron (flag + fallback).
- CORS y contratos validados.

**Salida:**
- Frontends desacoplados del acceso directo legacy.

## Fase C - Flujos de negocio y monetizacion

**Objetivo:** convertir uso en ingresos cuanto antes.

**Entregables:**
- Planes/suscripciones operativos.
- Publicaciones destacadas y upgrade de visibilidad.
- Flujo de solicitud/aprobacion de pagos usable en admin.
- Embudo de leads medible (captura, estado, conversion).

**Salida:**
- Base de monetizacion real funcionando.

## Fase D - Desacople por adapters

**Objetivo:** evitar lock-in tecnico.

**Entregables:**
- `AuthProvider`, `StorageProvider`, `PaymentsProvider`, `SocialProvider`.
- Dominio sin imports directos a SDKs externos.

**Salida:**
- Plataforma portable y mantenible.

## Fase E - Escala y hardening

**Objetivo:** preparar crecimiento sostenido.

**Entregables:**
- Observabilidad completa (errores, latencia, jobs).
- Backups y restore probados.
- Politica de seguridad y rotacion de secretos.

**Salida:**
- Operacion confiable para escalar ventas y volumen.

---

## 6) Regla de despliegue directo (sin staging)

Antes de cada cambio critico en produccion:

1. Backup/snapshot de DB (o punto de recuperacion).
2. Validacion local minima (typecheck + build + test de contrato).
3. Deploy con feature flag apagado por defecto si aplica.
4. Activacion controlada.
5. Monitoreo 30-60 min.
6. Rollback inmediato si rompe KPI tecnico o UX.

Esta regla reemplaza la necesidad de staging formal mientras no haya usuarios activos masivos.

---

## 7) KPIs de exito (negocio + tecnica)

- Tiempo de publicacion completa por usuario.
- Conversion a plan pago.
- Tiempo medio de respuesta de lead.
- Error rate API.
- Latencia p95 rutas criticas.
- Incidentes por release.

---

## 8) Siguientes pasos inmediatos (secuenciales)

1. Rotar credenciales sensibles expuestas y actualizar Coolify.
2. Dejar `simple-api` como fuente activa en Home Autos (flag ON).
3. Aplicar el mismo patron en Home Propiedades.
4. Cerrar flujo de monetizacion MVP (destacados/planes/solicitud pago).
5. Publicar checklist operativo de deploy directo en `docs/09-DEPLOYMENT-COOLIFY.md`.

---

## 9) Definicion de exito del plan

Se considera cumplido cuando:

- El backend de dominio es la ruta principal para las verticales clave.
- El sistema vende y cobra de forma operativa.
- Los cambios se despliegan rapido sin generar caos tecnico.
- La arquitectura queda lista para escalar nuevas verticales y funciones.

---

## 10) Referencias cruzadas

- `docs/06-ROADMAP.md`
- `docs/09-DEPLOYMENT-COOLIFY.md`
- `docs/10-TARGET-ARCHITECTURE-2026.md`
- `docs/11-MIGRATION-BACKEND-PLAYBOOK.md`
