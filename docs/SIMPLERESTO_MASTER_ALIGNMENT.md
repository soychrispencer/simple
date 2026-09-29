# SimpleResto — Alineación Documento Maestro vs estado actual

> **Estado:** Fases 0–8 del maestro **hechas** en modelo lean (satélite `resto_*` + seams Core).  
> **Fecha de corte:** 2026-07-24.  
> **Decisión:** reconciliación incremental confirmada (sin migrar catálogo a `listings` ni reescribir Order/Settlement).

Este documento es la salida de la **ruta 1 (Auditoría)** del plan de alineación, actualizada tras ejecutar las fases.

Complementa:

- [`SIMPLERESTO_PRINCIPLES.md`](./SIMPLERESTO_PRINCIPLES.md)
- [`SIMPLERESTO_ARCHITECTURE.md`](./SIMPLERESTO_ARCHITECTURE.md)
- [`SIMPLERESTO_WAVES.md`](./SIMPLERESTO_WAVES.md) — oleadas 1–8 hechas en modelo satélite
- [`SIMPLE_PLATFORM_LANGUAGE.md`](./SIMPLE_PLATFORM_LANGUAGE.md)

---

## 1. Checklist Fase 0 (setup)

| Ítem | Maestro | Actual | Estado |
|------|---------|--------|--------|
| App `apps/simpleresto` | Crear boilerplate | Existe (`@simple/resto`) | **Hecho** |
| Workspace pnpm | Registrar | Cubierto por `apps/simple*` | **Hecho** |
| Script `dev:resto` | Sí | Root `package.json` + `dev:all` | **Hecho** |
| Puerto | 3006 sugerido | **3007** (3006 = SimpleTickets) | **OK — no cambiar** |
| `@simple/ui` / `@simple/auth` | Compartir | Auth `appId="simpleresto"`, panel UI | **Hecho** |
| README tabla Apps | Visible | Corregido | **Hecho** |
| Corre en local | `localhost` | `pnpm run dev:resto` → :3007 | **Hecho** |
| `resto` en `vertical-config.ts` | Fase 1 | `VERTICAL_CONFIG_RESTO` + capabilities | **Hecho** |

**Veredicto Fase 0:** setup listo. Puerto **3007**.

---

## 2. Matriz de gap (Core-first) — post-fases

Leyenda: **reuse** / **keep_satellite** / **migrate** / **missing** / **discard**

| Concepto | Maestro | Actual | Veredicto |
|----------|---------|--------|-----------|
| Shell + API `/api/resto` | App + módulo | `apps/simpleresto`, `modules/resto` | **reuse** |
| Auth / Identity | Core | `@simple/auth` | **reuse** |
| UI design system | `@simple/ui` | Panel tokens | **reuse** |
| Business / Account | `accounts` | `businessId` → `accounts.id` | **reuse** |
| Vertical registry | capabilities | `vertical-config.ts` resto | **reuse** (Fase 1) |
| Media (fotos menú) | Media Core | `resto_products.image_url` lean | **keep_satellite** (Fase 2) |
| Publication / listings | Menú = Publication | `resto_products` / categories / addons | **keep_satellite** |
| Offer por Location | Offer | `resto_offers` | **keep_satellite** |
| Mercado Pago | Reutilizar | `modules/mercadopago` | **reuse** |
| Payment ledger Core | Unificar | `resto_payments` POS | **keep_satellite** |
| Billing / subscriptions | Plan resto | Mi cuenta → Suscripción (`launchVertical=resto`) | **reuse** lean (Fase 7) |
| Timeline Core | TimelineEvent | `emitRestoTimeline` + outbox | **reuse** seam (Fase 2) |
| Relationship / clientes | Person + Relationship | `resto_customers` | **keep_satellite** → migrate later |
| public-profile | Portal Core | `/m/[slug]` | **keep_satellite** |
| Ordering | Order + cocina | `resto_orders` | **keep_satellite** |
| Settlement / caja | Shift + Payment | shifts, cash, payments | **keep_satellite** |
| Delivery aggregators | Hub | `resto_delivery_orders` | **keep_satellite** |
| Uber Direct | Despacho | `modules/uber-direct` + tablas | **reuse** lean (Fase 6) |
| Print / fiscal | Satélites | print_jobs, fiscal_documents | **keep_satellite** |
| Reportes UX | Hoy vs Reportes | Reportes fuera del nav; resumen 7d en Hoy | **Hecho** (Fase 8) |

---

## 3. Fases del maestro — estado

| Fase | Entrega | Estado |
|------|---------|--------|
| 0 | Setup app / puerto 3007 | **Hecho** |
| 1 | `vertical-config` + capabilities `menu\|orders\|tables\|kitchen\|delivery\|pos` | **Hecho** |
| 2–5 seams | Timeline events resto + `imageUrl` carta (migración 0164) | **Hecho** |
| 6 | Uber Direct lean (0165, connect/quote/create/webhook sandbox, UI Delivery + Integraciones) | **Hecho** |
| 7 | Billing/suscripción (`launchVertical="resto"`) | **Hecho** |
| 8 | UX: Reportes fuera del nav; semana + deep link `/panel/reportes` en Hoy | **Hecho** |

### Modelo lean acordado

- No migrar catálogo a `listings`.
- No reescribir Order/Settlement a Core `payment_orders`.
- Uber Direct = orquestación con credenciales del local (sandbox por defecto).
- Media = URL en producto (sin Media Core day-1).

---

## 4. Archivos clave

- `packages/utils/src/platform/vertical-config.ts`
- `packages/utils/src/platform/timeline-event.ts` + `docs/SIMPLE_PLATFORM_TIMELINE_EVENTS.md`
- `services/api/src/modules/resto/timeline.ts`
- `services/api/src/modules/uber-direct/service.ts`
- `services/api/drizzle/0164_simpleresto_product_image.sql`
- `services/api/drizzle/0165_simpleresto_uber_direct.sql`
- `apps/simpleresto/src/app/panel/page.tsx` (Hoy)
- `apps/simpleresto/src/app/panel/delivery/page.tsx`
- `apps/simpleresto/src/app/panel/mi-cuenta/suscripcion/page.tsx`

---

## 5. Pendiente futuro (fuera de estas fases)

1. Relationship engine Core (migrar `resto_customers`).
2. Media Core (reemplazar `image_url` lean).
3. Uber Direct live (`RESTO_UBER_DIRECT_LIVE`) + secretos reales.
4. Cobro real de suscripción (hoy: modo lanzamiento gratis).
5. Ledger Core `payment_orders` si se unifica POS + marketplace.
