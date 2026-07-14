# Simple Platform Language

Constitución del dominio. Congela el lenguaje oficial de Simple.

No define APIs ni tablas. Define **qué es**, **qué no es**, **quién es dueño** y **quién lo usa**.

Código de dominio nuevo y docs de producto deben hablar este idioma. Las verticales (Agenda, Autos, Propiedades, Serenatas, …) **activan capabilities**; no inventan entidades paralelas.

---

## Principios

> **Publicar crea. Mis publicaciones / Mis servicios administran. Mi negocio configura.**

> Las apps son verticales sobre un **Core de capabilities**. El crecimiento no es “otra app”, es “otra forma de usar el mismo núcleo”.

> **Capability first, vertical second.** Si Agenda, Autos y Serenatas lo necesitan → pertenece al Core. Si solo una vertical → capability opcional o especialización.

> **UI ≠ dominio.** En pantalla podés decir Pacientes, Leads o Contratantes. En dominio: **Person**, **Relationship**, **TimelineEvent**.

> Nav de administración: marketplace → **Mis publicaciones**; Agenda/Serenatas → **Mis servicios**. Misma idea, label por objeto dominante.

---

## Mapa mental

```
Identity ──► Person
                 │
                 ▼
            Relationship ◄── Business
                 │
                 ▼
           TimelineEvent (historia)
                 │
                 ├── Conversation
                 ├── Publication / Engagement
                 ├── Deal / Order
                 ├── Payment
                 ├── File / Note / Task
                 └── Portal access
```

El punto de unión operativo es la **Relationship** (negocio ↔ persona).  
El punto de lectura histórica es el **Timeline**.  
La vertical solo tipa eventos y vistas; no duplica fichas.

---

## Core (siempre existe en la plataforma)

| Entidad | Qué es | Qué no es | Dueño |
|---------|--------|-----------|--------|
| **Identity** | Cuenta autenticada (login, sesión, verificación) | La ficha comercial de una persona | Auth / platform |
| **Person** | Ser humano (o entidad que actúa como tal) en el universo Simple | Un rol, un lead, un paciente | Relationship Engine |
| **Business** | Negocio que opera (particular, profesional, empresa) | La Identity del dueño | Business |
| **Profile** | Página pública de un Business | El Business completo | Business |
| **Relationship** | Vínculo Person ↔ Business con roles (cliente, lead, propietario, comprador, arrendatario, paciente, contratante, proveedor, referidor, …) | La Person en sí | Relationship Engine |
| **Publication** | Todo lo que un Business ofrece al mercado | Un listing de DB; un “operador catalog” | Publications |
| **PublishType** | Tipo de publicación: `sale`, `rent`, `auction`, `project`, `service`, `product` | “Kind”, “operación” del selector | Publications |
| **Offer** | Condición comercial sobre una Publication (precio, promo, pack). Dominio; hoy parte puede vivir en `publication.pricing` | El Order | Publications / Offers |
| **Conversation** | Hilo de mensajes anclado a contexto (Publication, Relationship, Order, …) | Un buzón aislado por vertical | Conversations |
| **TimelineEvent** | Hecho ocurrido en el tiempo, tipado, atribuible a Person / Relationship / Business | Una fila genérica “nota” sin tipo | Relationship Engine |
| **Engagement** | Ciclo de interacción previa al Order (mensaje, cotización, visita, seguimiento, …). Vista / agrupación sobre eventos | Un silo distinto de Conversation + Timeline | Relationship / Sales |
| **Deal** | Oportunidad comercial en curso (pipeline). Vista sobre Engagement + estado | El Order cerrado | Sales (opcional Core-light) |
| **Order** | Compra o contratación concretada | El lead, la cotización | Orders |
| **Payment** | Cobro o pago ligado a Order / servicio / arriendo | La factura fiscal completa (puede extenderse) | Payments |
| **Notification** | Aviso del sistema a Identity / Person | Un mensaje de Conversation | Notifications |
| **Subscription** | Plan del Business (o del Identity) sobre Simple | El pago a un cliente final | Subscriptions |
| **File** | Archivo adjunto (documento, imagen, evidencia) ligado a Person / Relationship / Order / Publication | Media de Publication (puede compartir storage) | Files |
| **Note** | Anotación interna del Business sobre una Relationship | Un mensaje al cliente | Relationship Engine |
| **Task** | Pendiente operativa (llamar, enviar cotización, cobrar) | Una Notification | Relationship / Ops |
| **Tag** | Etiqueta flexible sobre Person / Relationship / Publication | Un rol formal | Cross-cutting |

### Relationship Engine

Nombre de arquitectura del capability Core de relaciones.

Incluye: **Person · Relationship · TimelineEvent · Note · File (contextual) · Task · Tag · Roles**.

**No** es “el módulo CRM”. CRM / Contactos / Pacientes / Leads son **vistas** sobre el engine.

UI sugerida (label localizable): Contactos · Pacientes · Clientes · Leads · Contratantes · Propietarios.

---

## Capabilities opcionales (una vertical puede activarlas)

| Capability | Qué aporta | Ejemplos de uso |
|------------|------------|-----------------|
| **Bookings** | Reservas / citas sobre disponibilidad | Agenda, Serenatas |
| **Calendar** | Vista temporal de Bookings / bloqueos | Agenda, Serenatas |
| **Marketplace** | Descubrimiento, búsqueda, directorio | Autos, Propiedades, Serenatas |
| **Valuation** | Tasación / estimación | Autos, Propiedades |
| **Boost / Advertising** | Amplificación paga | Todas |
| **Analytics** | Métricas de Business / Publication / Relationship | Todas |
| **Portal** | Acceso de la Person a lo suyo (citas, contratos, pagos, propiedades) | Propiedades (dueño/arrendatario), Agenda (paciente), Autos (comprador) |

**CRM** como capability de producto = vista empaquetada del Relationship Engine (listados, filtros, pipeline). No introduce entidades propias.

---

## Cadena comercial (Marketplace / servicios)

```
Business → Publication → Offer → Engagement → Deal? → Order → Payment
```

`Engagement` y `Deal` pueden omitirse en verticales simples (p. ej. Agenda: Booking ≈ Order ligero). No forzar pipeline donde no aporte.

---

## Cadena de relaciones

```
Identity? → Person → Relationship(Business, roles[]) → TimelineEvent*
```

- Una **Person** puede tener muchas **Relationships** (incluso varios roles en la misma).
- Un **TimelineEvent** pertenece a una Relationship (o a Person a nivel plataforma cuando el hecho cruza negocios — excepción futura; default: scope Business).
- **Conversation**, **Order**, **Payment**, **File**, **Note**, **Task** se cuelgan de Relationship y/o del contexto (Publication, Order).

---

## Portal

El Portal **no** es hijo del CRM. Es acceso de **Person** (vía Identity) a recursos autorizados por **Relationship.roles**.

Ejemplos de vistas, no de módulos:

| Rol | Ve |
|-----|-----|
| Paciente | Citas, pagos, documentos clínicos |
| Propietario | Propiedades, contratos, pagos recibidos |
| Arrendatario | Contrato, pagos, tickets |
| Comprador auto | Orden, garantía, mantenciones |
| Contratante Serenatas | Solicitudes, eventos, facturas |

### Referencia viva (Portal v0)

**SimpleSerenatas modo `client`** es el Portal v0 sin tabla `people`:

- Identity stub: `serenata_clients.userId` (+ cuenta `users`)
- Superficies: **Mi portal** (home), Mis serenatas, Mensajes, Guardados, Mi cuenta
- Capability norte: `portal` en `VERTICAL_CONFIG_NORTH.serenatas`

No confundir con Contactos del dueño (vista Business/CRM). El contratante no entra al panel del mariachi; el mariachi no entra al Portal del cliente.

Agenda sigue sin Portal autenticado (booking/cancel/NPS por token). Autos/Propiedades: engagement (`guardados` + mensajes) aún no es home “lo mío”.

---

## Labels de UI vs dominio (Agenda hoy)

Persistencia / rutas actuales pueden seguir diciendo `client` / `/panel/clientes`.

Label de UI según oficio del Business (`resolveAgendaClientNoun`):

| Oficio | Label |
|--------|--------|
| Salud / clínicas | Paciente |
| Academia / profesor / entrenador | Alumno |
| Resto | Cliente |

Eso es **vista**. El destino de dominio es Person + Relationship, no “tabla Pacientes”.

---

## Ownership (quién escribe reglas)

| Área | Dueño conceptual |
|------|------------------|
| Auth, sesión, verificación | Identity |
| Perfil público, Mi negocio, apariencia | Business |
| Publicar, mis publicaciones / mis servicios | Publications |
| Ficha de persona, roles, timeline, notas, tareas | Relationship Engine |
| Mensajes | Conversations (contexto → Relationship / Publication) |
| Cobros del negocio a terceros | Payments |
| Plan Simple | Subscriptions |
| Citas / disponibilidad | Bookings (+ Calendar) |

---

## Test de pertenencia al Core

Antes de crear un módulo “solo de una vertical”, preguntar:

1. ¿Otra vertical lo necesitará en 12–24 meses?
2. ¿Es una entidad nueva o un **TimelineEvent** / rol / vista?
3. ¿Puede expresarse con Person · Relationship · Publication · Conversation · Order · Payment?

Si (1) sí y (2) es entidad falsa → **no** crear módulo vertical; extender el Core.

---

## Prohibido en UI / dominio nuevo

- **Operación** como etiqueta del selector de publicar → **¿Qué quieres publicar?** / PublishType
- **Operator** / **Catalog** como concepto de producto
- **Listing** fuera de capa técnica/DB
- **Kind** → usar **PublishType**
- **Cliente** como única entidad de arquitectura (sí como label de vista)
- Duplicar fichas por vertical (“paciente de Agenda” vs “cliente de Serenatas”) para la misma Person sin Relationship

---

## Capa técnica (puede cambiar; no es constitución)

- Tablas actuales: `listings`, `marketplace_operator_*`, `public_profiles`, `agenda_clients`, …
- Los mappers convierten persistencia → lenguaje de este documento (`Publication`, futuras `Person` / `Relationship`)
- El código de producto razona en dominio; la DB puede ir detrás del lenguaje

---

## Evolución deliberada (no roadmap de sprints)

1. **Congelar este lenguaje** (este documento).
2. **Mapear** lo existente (agenda clients, mensajes, solicitudes, leads implícitos) → Person / Relationship / TimelineEvent.
3. **Emitir eventos** tipados en cada vertical al actuar (no reconstruir People vacío).
4. **Vistas** por vertical (Pacientes, Contratantes, Leads).
5. **Portal** cuando Identity + roles lo justifiquen.

Implementación sprint a sprint = decisión del equipo. Visión = este idioma.

---

## Mapa de lo existente

El inventario técnico → dominio (Agenda, Serenatas, Marketplace, gaps, eventos tipados) vive en:

[`SIMPLE_PLATFORM_RELATIONSHIP_MAP.md`](./SIMPLE_PLATFORM_RELATIONSHIP_MAP.md)

Catálogo TimelineEvent + puntos de emisión:

[`SIMPLE_PLATFORM_TIMELINE_EVENTS.md`](./SIMPLE_PLATFORM_TIMELINE_EVENTS.md)
