# Simple Platform — TimelineEvent catalog + puntos de emisión

Companion de:
- [`SIMPLE_PLATFORM_LANGUAGE.md`](./SIMPLE_PLATFORM_LANGUAGE.md)
- [`SIMPLE_PLATFORM_RELATIONSHIP_MAP.md`](./SIMPLE_PLATFORM_RELATIONSHIP_MAP.md)

Tipos en código: `packages/utils/src/platform/timeline-event.ts`

**Regla:** no crear silos CRM. Emitir hechos tipados donde **ya** mutamos. `timeline_events` es append-only y se escribe mediante `recordTimelineEvent` / `emitTimelineEvent`; una falla al guardar no bloquea la operación de negocio.

---

## Forma del evento (dominio)

```
TimelineEvent
  type          string tipado (catálogo)
  occurredAt    instante del hecho
  businessRef   vertical + id de negocio (profile / provider_group / public_profile…)
  personRef?    id cliente / user / email hash (mientras no hay Person)
  relationshipRef?  futuro
  subjectRef    entidad afectada (appointmentId, serenataId, threadId, …)
  actor         professional | client | system | buyer | …
  payload       datos mínimos tipados (status from→to, amount, …)
```

Scope default: **Business**. Cross-business Person unificada = más adelante.

## Cobertura implementada (2026-11)

- El catálogo compartido y la persistencia append-only están implementados.
- Agenda emite eventos de alta de cliente, reservas, cambios de cita, pagos, packs, notas, archivos, referidos, grupos, NPS y promociones.
- Mensajes emite inicio de conversación, mensajes y apertura de lead; Marketplace agrega guardados, seguimientos, cambios de etapa, tareas, notas y visitas del equipo de Propiedades.
- La vista inmobiliaria recupera historial por espacio/persona y lo combina con interacciones de tablas existentes para cubrir datos anteriores.
- Las confirmaciones repetidas de Mercado Pago para la misma cita no duplican los eventos `booking.confirmed` ni `payment.paid`.
- No hay `people` / `relationships` canónicos ni `relationshipId` persistido. Serenatas aún conserva su historial en sus propias órdenes y solicitudes.

La lista siguiente conserva prioridades y eventos objetivo; no significa que todo esté pendiente de emitir.

---

## Prioridad de emisión (Fase A)

Solo eventos que alimentan una ficha Contactos / historial.  
Fuera de Fase A: tokens OAuth, push subscribe, plan changes, Google sync metadata.

### Tier 1 — emitir primero (Agenda)

| type | Cuándo | Dónde (API) |
|------|--------|-------------|
| `relationship.created` | POST cliente manual | `agenda/router.ts` ~insert `agendaClients` |
| `relationship.created` | Alta lazy en booking público | `agenda/router.ts` ~insert client post book |
| `booking.requested` | Booking público `pending` | public book insert appointment |
| `booking.confirmed` | Booking auto-confirm / panel create | insert appointment `confirmed` |
| `booking.status_changed` | Patch / cancel / complete / no_show | update appointment status |
| `payment.recorded` | POST payment | insert `agendaPayments` |
| `payment.paid` | Payment → paid / MP webhook confirm | update payment / paidAt |
| `conversation.message_sent` | Mensaje en hilo agenda | messages module (context appointment) |

### Tier 2 — enriquecer ficha

| type | Cuándo |
|------|--------|
| `note.written` | Session notes upsert |
| `file.attached` | Client attachment create |
| `pack.purchased` | Client pack create |
| `pack.session_consumed` | Appointment con pack / decrement |
| `referral.created` / `referral.converted` / `referral.rewarded` | Referrals CRUD status |
| `nps.submitted` | NPS score submit |
| `offer.applied` | Promo en booking público |
| `group.attendee_registered` | Group attendee create |

### Tier 3 — opcional / ruido bajo

| type | Nota |
|------|------|
| `notification.sent` | Reminder cron — suele no ir al timeline de producto |
| `booking.reminder_marked` | `reminderSentAt` — infra |

---

## Catálogo estable (Agenda)

Prefijo por dominio, no por app table:

```
relationship.created
relationship.updated          # cambio status archived/inactive (opcional)

booking.requested
booking.confirmed
booking.status_changed        # payload: { from, to, cancelledBy? }

payment.recorded
payment.paid
payment.refunded
payment.waived

pack.purchased
pack.session_consumed

note.written
file.attached

referral.created
referral.converted
referral.rewarded

nps.submitted
offer.applied

group.attendee_registered
group.attendee_status_changed

conversation.started
conversation.message_sent
```

---

## Catálogo SimpleResto

```
order.created
order.status_changed          # payload: { from, to, publicId, locationId }
payment.paid                  # cobro POS / MP (mismo tipo Core)
delivery.status_changed       # Uber Direct / aggregators
stock.adjusted                # inventario liviano (opcional)
```

Subject kinds: `resto_order`, `resto_location`, `resto_delivery`.  
Vertical timeline: `resto`.

---

## Serenatas (Fase B — después de Agenda Tier 1)

| type | Cuándo | Dónde |
|------|--------|-------|
| `relationship.created` | Primera serenata de un contratante con un group (lazy) | al crear/assign |
| `serenata.requested` | Marketplace insert | `serenatas/marketplace.ts` insert |
| `serenata.created` | Own lead insert | `serenatas/router.ts` inserts |
| `serenata.offer_sent` / `offer_accepted` | Matching offers | offers flow |
| `serenata.status_changed` | Lifecycle patch | router updates |
| `payment.paid` | Booking MP / payment fields | payment_orders + serenata |
| `serenata.reviewed` | Rating | review endpoint |
| `conversation.message_sent` | Hilo serenata | messages |

Vista **Contactos / Contratantes** = group by Person/Identity + count(`serenata.*`) desde eventos u agregado sobre `serenatas`.

---

## Marketplace (Fase C)

| type | Cuándo |
|------|--------|
| `conversation.started` | Primer mensaje listing (unique buyer×listing) |
| `conversation.message_sent` | Cada mensaje |
| `engagement.saved` | saved_listings |
| `engagement.followed` | follows |
| `lead.opened` | alias de primer mensaje (vista CRM) |

No recrear `listing_leads`. Relationship `lead` = lazy al `conversation.started`.

### SimplePropiedades — seguimiento compartido por cuenta

El historial del contacto respeta el espacio activo. Los eventos de persona se filtran por `businessId` de esa cuenta; las conversaciones se mantienen ligadas a los hilos que ya pertenecen al espacio.

| type | Cuándo | subject |
|------|--------|---------|
| `relationship.stage_changed` | El equipo cambia la etapa comercial | `relationship` |
| `visit.scheduled` | Se coordina una visita a propiedad/proyecto o una reunión comercial en SimpleAgenda | `account_property_visit` / `account_business_visit` |
| `task.created` | Se agrega un próximo paso con responsable o fecha | `relationship_task` |
| `task.completed` | El equipo marca el próximo paso como listo | `relationship_task` |

Los eventos se asocian al negocio de la cuenta, no a la agenda privada de un profesional. No contienen mensajes, datos de citas profesionales ni notas privadas.

---

## Estrategia y próximos pasos (sin big-bang)

```
1. Tipos compartidos en @simple/utils         ← implementado
2. Tabla append-only + emisor fire-and-forget ← implementado
3. Ganchos Agenda y Marketplace              ← cobertura principal implementada; seguir auditando eventos
4. Lectura en Contactos y fichas de Agenda    ← implementado en vistas contextuales separadas
5. Claves de idempotencia                    ← implementadas para callbacks MP de Agenda; ampliar cuando haga falta
6. Relación canónica / identidad transversal  ← evaluar sin recrear silos de leads
7. Contactos de Serenatas                    ← pendiente cuando se habilite su flujo de cartera
```

**Pendientes técnicos:** extender claves de idempotencia a otros eventos que puedan repetirse ante reintentos, completar cobertura pendiente por dominio y conectar Serenatas cuando exista una vista de cartera. El emisor solo deduplica cuando el origen entrega una clave estable.

**No bloquear** la request de negocio si el emit falla (log + continue).

---

## Mapeo rápido router Agenda → type

| Mutación | ~línea / zona | type(s) |
|----------|---------------|---------|
| POST `/clients` | insert agendaClients ~862 | `relationship.created` |
| PATCH client | ~892 | `relationship.updated` (si status) |
| POST attachment | ~1018 | `file.attached` |
| UPSERT session note | ~1056 | `note.written` |
| POST appointments (panel) | ~1134 | `booking.confirmed` (+ pack consume) |
| PATCH appointment | ~1174 / ~1192 | `booking.status_changed` |
| Cancel series/one | ~1217 | `booking.status_changed` to cancelled |
| POST referral | ~1332 | `referral.created` |
| PATCH referral status | ~1348 | `referral.converted` / `rewarded` |
| POST client-pack | ~1553 | `pack.purchased` |
| POST group attendee | ~1621 | `group.attendee_registered` |
| POST payment | ~1676 | `payment.recorded` (+ `payment.paid` si status) |
| PATCH payment | ~1691 | `payment.paid` / refunded |
| MP / advance paid | ~1849 | `payment.paid` + `booking.confirmed` |
| Public book + lazy client | ~2296–2303 | `booking.*` + maybe `relationship.created` |
| NPS submit | ~2085 | `nps.submitted` |
| Cancel by client | ~2186 | `booking.status_changed` |

Cron reminders (`cron.ts`): Tier 3 — no Fase A.

---

## Qué queda fuera a propósito

- Crear tabla Person global ahora  
- Unificar Business IDs  
- Portal  
- Backfill masivo histórico (opcional después: sintetizar eventos desde appointments/payments)  
- Timeline de audit admin  

---

## Criterio de listo (Fase A + Tier 2)

- [x] Tipos exportados (`@simple/utils` timeline-event)
- [x] Tabla `timeline_events` + `recordTimelineEvent` / `emitTimelineEvent`
- [x] Tier 1 Agenda: `relationship.created`, `booking.*`, `payment.*`
- [x] Tier 2 Agenda: notes, files, packs, referrals, NPS, group attendees, `offer.applied`
- [x] `conversation.started` / `conversation.message_sent` / `lead.opened` (messages module)
- [x] GET `/api/agenda/clients/:id/timeline`
- [x] Tab Historial en ficha `/panel/clientes/[id]`
- [x] Contactos Serenatas + detalle/historial
- [x] Contactos marketplace Autos/Propiedades (`/api/messages/contacts`)
- [x] `engagement.saved` / `engagement.followed` + contactos desde guardados/follows
- [x] Notas internas (`relationship_notes` + `/api/platform/relationship-notes`)
- [x] Portal v0 Serenatas (modo cliente / Identity `serenata_clients`)
- [x] SimpleAdmin Conversaciones: `whatsapp.manual` + `conversation.status_changed` (bandeja ops, sin Cloud API)

Migración: `0139_timeline_events`, `0140_relationship_notes` (post-journal).

Business UUID ops: `PLATFORM_OPS_BUSINESS_ID` en `@simple/utils` timeline-event.

Siguiente producto: Portal autenticado Agenda (Mis citas) o “Lo mío” en Autos/Propiedades.
