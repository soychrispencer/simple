# Simple Platform — Mapa de lo existente → Relationship Engine

Companion de [`SIMPLE_PLATFORM_LANGUAGE.md`](./SIMPLE_PLATFORM_LANGUAGE.md).

Objetivo: mapear **lo que ya existe** a Person · Relationship · TimelineEvent **sin** inventar tablas nuevas todavía.

Estado (2026-07): no hay `people` / `relationships` / `timeline_events`. El CRM de marketplace (`listing_leads`, pipeline) fue **eliminado** (`0107_drop_crm.sql`). Capability `crm` en config es aspiracional salvo Agenda.

---

## Capacidades hoy

| Vertical | Capabilities | CRM real |
|----------|--------------|----------|
| Agenda | publications, calendar, booking, **crm**, payments, messages | `agenda_clients` (+ ficha) |
| Serenatas | publications, calendar, payments, messages, availability | No: historial en `serenatas` |
| Autos / Propiedades | publications, **crm**, messages, valuation, boost | No: lead = Conversation |

---

## Vista rápida

| Vertical | Madurez hacia People | Ancla actual |
|----------|----------------------|--------------|
| **Agenda** | Alta (ficha + notas + files + pagos + citas) | `agenda_clients` = Person+Relationship fusionados; **sin** Identity en el cliente |
| **Serenatas** | Media (órdenes ricos; sin ficha CRM) | Solicitud `serenatas` + Identity del contratante |
| **Marketplace** | Baja (mensaje = lead) | `message_threads` sobre listing |

---

## 1. Agenda

| Técnico | Dominio |
|---------|---------|
| `users` (profesional) | Identity |
| `agenda_professional_profiles` | Business + Profile |
| `agenda_services` | Publication (`service`) |
| `agenda_packs` / `agenda_promotions` | Offer |
| `agenda_clients` | **Person + Relationship** (colapsados; scope `professional_id`) |
| `agenda_clients.internal_notes` | Note |
| tags / assignments | Tag |
| `agenda_client_attachments` | File |
| `agenda_appointments` | Booking ≈ Order ligero |
| `agenda_session_notes` | Note (por cita) |
| `agenda_payments` | Payment (B2C) |
| `agenda_client_packs` | Order / entitlement |
| `agenda_referrals` | Relationship rol `referrer` + eventos |
| `agenda_nps_responses` | TimelineEvent / Engagement |
| `message_threads` (`agenda_appointment`) | Conversation |

**Roles implícitos:** profesional (Business owner) · paciente/cliente/alumno (vista) · referidor · asistente grupal · buyer/seller en mensajes.

### TimelineEvent tipados (ya ocurren)

| Hecho | Tipo |
|-------|------|
| Alta cliente / primer vínculo | `relationship.created` |
| Reserva (pública o panel) | `booking.requested` / `booking.confirmed` |
| Cambio status cita | `booking.status_changed` |
| Pago | `payment.recorded` / `payment.paid` |
| Pack comprado / sesión consumida | `pack.purchased` / `pack.session_consumed` |
| Nota / archivo | `note.written` / `file.attached` |
| Referral / NPS | `referral.*` / `nps.submitted` |
| Mensaje | `conversation.message_sent` |

---

## 2. Serenatas

| Técnico | Dominio |
|---------|---------|
| `serenata_clients` | Identity stub del contratante (no ficha CRM del grupo) |
| `serenata_provider_groups` | Business + Profile |
| `serenata_group_services` / packs / promotions | Publication / Offer |
| `serenatas` | Order / Booking / Engagement (solicitud → evento) |
| `serenata_offers` | Matching / Deal ligero (**≠** Offer de catálogo) |
| `serenata_musicians` / members | Identity + rol proveedor/músico |
| payouts / `payment_orders` `serenata_booking` | Payment |
| `message_threads` (`serenata`) | Conversation |

**Roles implícitos:** contratante · dueño/proveedor · músico · lead plataforma vs lead propio (`source`).

### TimelineEvent tipados

| Hecho | Tipo |
|-------|------|
| Solicitud marketplace / propia | `serenata.requested` / `serenata.created` |
| Offer enviada / aceptada | `serenata.offer_sent` / `serenata.offer_accepted` |
| Lifecycle status | `serenata.status_changed` |
| Pago / review / setlist | `payment.paid` / `serenata.reviewed` / `serenata.setlist_confirmed` |
| Payout músico | `payout.musician_paid` |
| Mensaje | `conversation.message_sent` |

---

## 3. Marketplace (Autos / Propiedades)

| Técnico | Dominio |
|---------|---------|
| `listings` (+ drafts) | Publication |
| `public_profiles` | Profile (+ config Business) |
| operator services / products / packs | Publication + Offer |
| `message_threads` (listing) | **Conversation = lead implícito** |
| `saved_listings` / `follows` | Engagement soft |
| ~~`listing_leads` / pipeline~~ | Eliminado — no reintroducir como silo |

**Roles implícitos:** vendedor/publicador · interesado/comprador · seguidor.

### TimelineEvent tipados

| Hecho | Tipo |
|-------|------|
| Primer mensaje en listing | `conversation.started` / `lead.opened` |
| Mensaje | `conversation.message_sent` |
| Guardar / follow | `engagement.saved` / `engagement.followed` |
| Cambio status publicación | `publication.status_changed` (scope Business) |

---

## Roles → Relationship.roles (destino)

| Hoy (UI / técnico) | Rol de dominio sugerido |
|--------------------|-------------------------|
| Paciente / Alumno / Cliente Agenda | `patient` / `student` / `client` |
| Contratante Serenatas | `contractor` |
| Interesado mensajes listing | `lead` |
| Referidor Agenda | `referrer` |
| Músico / miembro | `musician` / `provider` |
| Dueño Business | no es rol sobre Person; es ownership del Business |

Una Person puede acumular varios roles en Relationships distintas (o en la misma).

---

## Gaps del Relationship Engine mínimo

1. Sin tablas Core Person / Relationship / TimelineEvent.
2. Sin Person única cross-vertical (Agenda sin `userId` en clients; marketplace solo buyer en thread).
3. Business fragmentado (`accounts` / `public_profiles` / `agenda_professional_profiles` / `provider_groups`).
4. Conversation ancla a Publication/Booking, no a Relationship.
5. Capability `crm` en marketplace sin backend; contador leads stub en 0.
6. Serenatas: historial en órdenes, no en fichas Contactos.
7. Ambigüedad **Offer** (catálogo) vs `serenata_offers` (matching).

**Mínimo práctico (sin big-bang):**

1. Emitir TimelineEvents tipados en mutaciones que ya existen.
2. Materializar Relationship **lazy** (primera cita / mensaje / solicitud).
3. Dedupe Person por email / phone / Identity cuando exista.
4. Vistas UI (Contactos / Pacientes / Leads) sobre eso.

---

## Qué no migrar aún

- Repertorio / partituras Serenatas  
- Audit logs como Timeline de producto  
- Boost, ads, redes sociales  
- Valuation / mortgage  
- Unificar IDs de Business en un solo golpe  
- Portal **completo** cross-app / Person table (v0 Serenatas contratante ya existe)  
- Renombrar `listings` → publications en DB solo por estética  
- Reintroducir Kanban CRM droppeado  
- Dedupe agresivo multi-vertical sin Identity  

---

## Paths de schema

| Área | Path |
|------|------|
| Constitución | `docs/SIMPLE_PLATFORM_LANGUAGE.md` |
| Capabilities | `packages/utils/src/platform/vertical-config.ts` |
| Agenda / Serenatas / Messages / Listings | `services/api/src/db/schema/` (`agenda.ts`, `serenatas.ts`, `messages.ts`, `listings.ts`, …) |
| Drop CRM | `services/api/drizzle/0107_drop_crm.sql` |
| Nouns Agenda (vista) | `packages/utils/src/agenda-profession-config.ts` |

---

## Orden de evolución (producto)

```
Congelar idioma  ← hecho (SIMPLE_PLATFORM_LANGUAGE)
        ↓
Mapear existente  ← este documento
        ↓
Emitir eventos tipados (Agenda primero: ya tiene ficha)
        ↓
Lazy Relationship + vista Contactos (Serenatas cartera)
        ↓
Marketplace: Conversation → Relationship lead (sin recrear listing_leads)
        ↓
Portal v0 (Serenatas contratante) → Portal completo (Person + Identity + roles)
```

Agregar verticales nuevas = mismos conceptos + nuevos tipos de TimelineEvent / roles. No otra app CRM.

---

## Catálogo de emisión

Tipos estables + puntos de gancho (Agenda Tier 1 primero):

[`SIMPLE_PLATFORM_TIMELINE_EVENTS.md`](./SIMPLE_PLATFORM_TIMELINE_EVENTS.md)

Código: `@simple/utils` → `TimelineEventType`, `TimelineEventInput`, `AGENDA_TIMELINE_TIER1`.
