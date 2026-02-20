# Roadmap 2026 - Ejecucion Directa (Sin Staging Formal)

**Estado:** Activo  
**Owner tecnico:** Christian  
**Alineado con:** `docs/00-MASTER-PLAN.md` (version 2026.03)  
**Ultima actualizacion:** 20 de febrero de 2026

---

## 1) Objetivo del roadmap

Ejecutar modernizacion + monetizacion con velocidad de negocio, manteniendo control tecnico.

Estrategia: un entorno productivo controlado con feature flags y rollback rapido.

---

## 2) Horizonte operativo

## Bloque 0 (Ahora)

- `simple-api` estable en VPS.
- CORS/configuracion final para `www.simpleautos.app`.
- Flag de lectura API en Autos activado.
- Secrets rotados.

## Bloque 1 (Siguiente)

- Propiedades migra lectura al mismo backend (`simple-api`) con fallback.
- Unificacion de contratos de listados/media entre verticales.
- Dashboard basico de errores/latencia/jobs.

## Bloque 2 (Monetizacion)

- Monetizacion MVP completa:
  - planes
  - destacados
  - flujo de pago manual operable
- CRM minimo de leads con pipeline y estados.

## Bloque 3 (Escala)

- Desacople por adapters.
- Jobs async robustos (reintentos, DLQ, auditoria).
- Endurecimiento de seguridad y backups.

---

## 3) Backlog por prioridad

## P0 - Critico (hacer ya)

1. Rotacion de `SUPABASE_SERVICE_ROLE_KEY` y secretos relacionados.
2. Definir `NEXT_PUBLIC_SIMPLE_API_BASE_URL` en Autos (la lectura API se activa automaticamente con esa URL, salvo override manual).
3. Verificar CORS/API base URL en produccion.
4. Checklist de deploy directo documentado y obligatorio.

## P1 - Alta (siguiente)

1. Implementar helper API equivalente en Propiedades.
2. Migrar slider/listado principal de Propiedades al backend nuevo.
3. Consolidar envs y eliminar configuraciones ambiguas.
4. Instrumentar logs de negocio (publicacion, lead, pago).

## P2 - Crecimiento

1. Flujos de cobro/upgrade completos en panel.
2. Pipeline CRM de conversion y seguimiento.
3. Reporteria de conversion por vertical.

## P3 - Hardening

1. Providers desacoplados (auth/storage/payments/social).
2. Jobs avanzados con observabilidad completa.
3. Plan de datos self-hosted final.

---

## 4) Regla de release directa

Cada release debe cumplir:

1. `typecheck` verde.
2. `build` verde.
3. Test minimo del modulo afectado verde.
4. Feature flag disponible para rollback logico.
5. Monitoreo post deploy 30 min.

Si falla cualquiera, rollback inmediato.

---

## 5) KPI semanal

- Error rate frontend y API.
- Latencia p95 en home/listings.
- Publicaciones creadas por vertical.
- Leads generados y respondidos.
- Conversion a plan pago.

---

## 6) Siguiente bloque ejecutable

1. Activar API nueva en Autos (ya lista).
2. Replicar patron en Propiedades.
3. Cerrar monetizacion MVP en panel.
4. Publicar playbook de operacion diaria (deploy + incidentes).

---

## 7) Dependencias de documentacion

- `docs/00-MASTER-PLAN.md`
- `docs/09-DEPLOYMENT-COOLIFY.md`
- `docs/10-TARGET-ARCHITECTURE-2026.md`
- `docs/11-MIGRATION-BACKEND-PLAYBOOK.md`
