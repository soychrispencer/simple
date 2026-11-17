# Simple Platform — Mapa de lo existente → Relationship Engine

Companion de [`SIMPLE_PLATFORM_LANGUAGE.md`](./SIMPLE_PLATFORM_LANGUAGE.md).

Objetivo: mapear **lo que ya existe** a Person · Relationship · TimelineEvent **sin** inventar tablas nuevas todavía.

Estado (2026-11): `timeline_events` existe como historial append-only y ya recibe eventos de Agenda, Propiedades y otras operaciones. Marketplace tiene Contactos basado en conversaciones e interacciones, con etapa, responsable, tareas, notas e historial por negocio. Aún no existen tablas canónicas `people` / `relationships`; el seguimiento usa negocio + vertical + persona y los eventos no persisten `relationshipId`. El CRM antiguo de marketplace (`listing_leads`, pipeline) sigue eliminado (`0107_drop_crm.sql`): no se reintrodujo como silo.

---

## Capacidades hoy

| Vertical | Capabilities | CRM real |
|----------|--------------|----------|
| Agenda | publications, calendar, booking, **crm**, payments, messages | `agenda_clients` (+ ficha, notas y citas); SimpleAgenda también coordina visitas del espacio inmobiliario ligadas al contacto del marketplace |
| Serenatas | publications, calendar, payments, messages, availability | No: historial en `serenatas` |
| Autos / Propiedades | publications, **crm**, messages, valuation, boost | Contactos desde conversaciones e interacciones; etapa, responsable, tareas, notas e historial por negocio |

---

## Vista rápida

| Vertical | Madurez hacia People | Ancla actual |
|----------|----------------------|--------------|
| **Agenda** | Alta (ficha + notas + files + pagos + citas) | `agenda_clients` = Person+Relationship fusionados; **sin** Identity en el cliente |
| **Serenatas** | Media (órdenes ricos; sin ficha CRM) | Solicitud `serenatas` + Identity del contratante |
| **Marketplace** | Media (Contactos y seguimiento; sin Relationship canónica) | `message_threads` sobre listing + estado por negocio |

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

Las visitas del equipo de SimplePropiedades se pueden crear desde Contactos en SimpleAgenda y vincular al `buyerUserId` del lead; su actividad aparece en el historial del negocio inmobiliario. Esto no convierte `agenda_clients` en una ficha compartida: sigue siendo la cartera propia del perfil profesional.

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

La vista Contactos agrega conversaciones, guardados y seguidores. `account_relationship_assignments` guarda responsable y etapa por negocio/persona; `account_relationship_tasks` guarda próximos pasos; `relationship_notes` guarda notas privadas del negocio; `timeline_events` y la actividad de engagement forman el historial. Los agentes ven los contactos de sus publicaciones o los asignados, según las reglas del espacio.

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

1. No hay tabla Core `Person` ni `Relationship`; el CRM inmobiliario usa identificadores de persona sobre tablas account-scoped.
2. No hay Person única cross-vertical (Agenda sin `userId` en `agenda_clients`; marketplace usa el buyer del hilo cuando existe).
3. `timeline_events` existe, pero su esquema no persiste `relationshipId`; el vínculo se resuelve por negocio/persona y sujeto.
4. Business sigue representado por modelos verticales (`accounts` / `public_profiles` / `agenda_professional_profiles` / `provider_groups`).
5. Conversation sigue anclada a Publication/Booking; Contactos deriva la relación inmobiliaria del hilo y las interacciones.
6. Serenatas: historial en órdenes, no en fichas Contactos.
7. Ambigüedad **Offer** (catálogo) vs `serenata_offers` (matching).

**Mínimo práctico (sin big-bang):**

1. Extender la cobertura de TimelineEvents tipados en mutaciones existentes (ya hay emisiones en Agenda y Marketplace).
2. Evaluar materialización lazy de Relationship sin duplicar el seguimiento account-scoped que ya usa Propiedades.
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
Completar eventos tipados (Agenda primero: ya tiene ficha y eventos)
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
