# Arquitectura definitiva de SimpleResto

Documento de decisiones concretas. Complementa y obedece:

- [`SIMPLERESTO_PRINCIPLES.md`](./SIMPLERESTO_PRINCIPLES.md) — constitución (estable)
- [`SIMPLE_PLATFORM_LANGUAGE.md`](./SIMPLE_PLATFORM_LANGUAGE.md) — lenguaje Core

**Estado:** **APROBADA** (base congelada del proyecto). Cambios importantes ⇒ ADR nuevo antes de tocar la constitución.

**Principio rector de esta arquitectura:** la más simple que pueda crecer 10 años. Cada bounded context, agregado y ADR debe justificar su existencia frente a la constitución. Si no pasa el test, no entra.

### Ajustes de aprobación (congelados)

1. **`tableLabel`** — identificador de *origen del pedido* (Mesa 12, Barra, Pickup, Food Truck, …), **no** una mesa física. La entidad `Table` podrá resolverlo después sin romper el dominio. El modelo no asume salón.
2. **Settlement** — frontera de dominio sí; carpeta/paquete separado solo con necesidad real. En MVP: un módulo `resto` con folders internos.
3. **Roadmap** — cada fase T0–T12 termina con **funcionalidad demostrable** (no infra ciega durante semanas).
4. **Feature flags / capabilities** — desde T0 (ADR-021): flags de producto por Location y flags de desarrollo para exponer/ocultar superficies.

---

## 0. Mapa mental (una página)

```
Interfaces (clientes del dominio)
  POS · Hoy · Cocina · QR · Web · WhatsApp* · Agentes*
           │
           ▼
     Commands API  (/api/resto/...)
           │
           ▼
┌──────────────────────────────────────┐
│              DOMINIO                 │
│  Tenant · Catalog · Ordering ·       │
│  Settlement · (Inventory V2) ·       │
│  Relationships (Core)                │
└──────────────────────────────────────┘
           │
           ├─ write state (Postgres)
           └─ write outbox events
                    │
                    ▼
              Reactions
     Hoy/proyecciones · notificaciones ·
     cocina fan-out · IA suggest · webhooks*
```

\* satélites — no núcleo MVP.

---

# 1. Bounded Contexts

Seis contextos. No más. Cocina, delivery UI y marketing **no** son bounded contexts: son superficies o reactions sobre Ordering / Catalog / Events.

---

## 1.1 Tenant

**Responsabilidad:** quién opera, dónde, y con qué permisos.

| | |
|--|--|
| **Entidades** | `Business` (account Simple), `Location`, `LocationMember`, `LocationSettings`, `Table` (opcional, config de salón) |
| **Commands** | `CreateLocation`, `UpdateLocationSettings`, `AddLocationMember`, `UpdateMemberPermissions`, `EnableCapability`, `CreateTable`, `ArchiveTable` |
| **Events** | `location.created`, `location.settings_updated`, `location.member_added`, `location.capability_enabled`, `table.created`, `table.archived` |
| **Dependencias** | Identity/Auth Core (users, session) |
| **NO le pertenece** | Pedidos, precios, stock, turnos de caja, catálogo |

**Por qué existe:** Location-first es ley. Sin este contexto, Operar no tiene scope y las cadenas exigen rewrite.

**Nota:** `Business` ≈ `accounts` existente. No inventar un segundo tenant.

---

## 1.2 Catalog

**Responsabilidad:** qué se puede vender y bajo qué condiciones comerciales.

| | |
|--|--|
| **Entidades** | `Category`, `Product`, `Variant`, `ModifierGroup`, `ModifierOption`, `Offer`, `ProductAvailability` |
| **Commands** | `CreateCategory`, `CreateProduct`, `UpdateProduct`, `SetVariants`, `SetModifiers`, `PublishProduct`, `UnpublishProduct`, `SetOffer`, `SetLocationAvailability` |
| **Events** | `product.created`, `product.updated`, `product.published`, `product.unpublished`, `offer.changed`, `availability.changed` |
| **Dependencias** | Tenant (`businessId`, `locationId` para availability), Media Core (fotos) |
| **NO le pertenece** | Orders, stock ledger, recetas/insumos (Inventory), campañas de marketing |

**Por qué existe:** el menú cambia con otra cadencia y otro lenguaje que los pedidos. Separarlo evita que Ordering conozca “cómo editar un producto”.

**Regla de catálogo:** productos viven a nivel **Business**. Precio/disponibilidad por Location vía `Offer` / `ProductAvailability`.

---

## 1.3 Ordering

**Responsabilidad:** ciclo de vida del pedido — el corazón del dominio.

| | |
|--|--|
| **Entidades / agregados** | `Order` (root), `OrderItem`, `OrderFulfillment`, `OrderPricing` |
| **Commands** | `OpenOrder`, `AddOrderItem`, `UpdateOrderItem`, `RemoveOrderItem`, `SendToKitchen`, `MarkOrderReady`, `CompleteOrder`, `CancelOrder`, `ApplyDiscount`, `AttachCustomer` |
| **Events** | `order.opened`, `order.item_added`, `order.item_updated`, `order.item_removed`, `order.sent_to_kitchen`, `order.ready`, `order.completed`, `order.cancelled`, `order.discount_applied`, `order.customer_attached` |
| **Dependencias** | Tenant, Catalog (snapshots al agregar ítem), Relationships (opcional), Settlement (cobro — ver ADR-11) |
| **NO le pertenece** | Definición de productos, apertura/cierre de turno, ledger de inventario, envío WhatsApp, impresión |

**Por qué existe:** un pedido es un pedido en todos los canales. Este BC es el diferencial order-centric.

**Cocina / cola delivery / QR:** no son BCs. Son **lecturas y commands** sobre Ordering.

---

## 1.4 Settlement

**Responsabilidad:** dinero que entra/sale en el local durante un turno operativo.

| | |
|--|--|
| **Entidades** | `Shift`, `Payment`, `Refund`, `CashMovement` |
| **Commands** | `OpenShift`, `CloseShift`, `CapturePayment`, `RefundPayment`, `RecordCashMovement` |
| **Events** | `shift.opened`, `shift.closed`, `payment.captured`, `payment.refunded`, `cash_movement.recorded` |
| **Dependencias** | Tenant, Ordering (paga un Order), Payments Core / Mercado Pago cuando el cobro es online |
| **NO le pertenece** | Ítems del pedido, estados de cocina, catálogo, facturación fiscal electrónica (futuro satélite) |

**Por qué existe (y no se fusiona con Ordering):** cobrar y operar el turno tienen reglas distintas (arqueo, medios de pago, permisos). Mantener Settlement separado evita un Order obeso y permite “pedido abierto sin cobro” (mesa) con claridad.

**Crítica controlada:** en MVP, Settlement puede vivir en el mismo módulo de código (`modules/resto/settlement`) sin microservicio. La frontera es de **dominio**, no de deploy.

---

## 1.5 Relationships (Core)

**Responsabilidad:** personas vinculadas al Business (clientes).

| | |
|--|--|
| **Entidades** | `Person`, `Relationship`, extensión `CustomerProfile` (alergias, cumpleaños, preferencias) |
| **Commands** | `UpsertCustomer`, `AttachToOrder` (también disparable desde Ordering), `TagCustomer` |
| **Events** | `customer.upserted`, `customer.tagged` (+ timeline Core cuando exista) |
| **Dependencias** | Business (Core) |
| **NO le pertenece** | Órdenes, puntos de fidelización (satélite V2+), campañas |

**Por qué existe:** constitución de plataforma. SimpleResto **no** crea un CRM paralelo eterno.

**Pragmatismo MVP:** si el Relationship Engine Core aún no está listo, se persiste un adaptador local **compatible** (`relationshipId` nullable, eventos ya en lenguaje Core) y se consolida después. No se bloquea el MVP; no se fork eterno.

---

## 1.6 Reactions (plataforma / transversal)

**Responsabilidad:** reaccionar a hechos del dominio sin poseer el estado operativo.

| | |
|--|--|
| **Entidades** | `OutboxMessage`, `ProcessedEvent`, `AiRun` (auditoría), handlers registrados |
| **Commands** | No commands de negocio. Config menor: `SetReactionPolicy` (suggest/auto) en V2 |
| **Events** | No emite hechos de negocio nuevos salvo `suggestion.created` (efímero/log) |
| **Dependencias** | Consume events de todos los BCs |
| **NO le pertenece** | Reglas de “qué es un pedido válido”, precios, stock |

**Handlers MVP:**

1. Fan-out realtime (cocina / pedidos)  
2. Proyección mínima de “Hoy” (si SQL directo no alcanza)  
3. Notificación básica (opcional)

**Handlers V2+:** WhatsApp, webhooks, IA suggest, automations builder.

**Por qué existe:** sin este seam, cada integración se hardcodea en Ordering y pudre el núcleo.

---

## 1.7 Inventory (anillo — no MVP)

| | |
|--|--|
| **Entidades** | `Ingredient`, `Recipe`, `RecipeLine`, `StockLedgerEntry` |
| **Commands** | `ReceiveStock`, `AdjustStock`, `WasteStock`, `ConsumeForOrder` (reaction o command interno) |
| **Events** | `stock.received`, `stock.adjusted`, `stock.low`, `stock.consumed` |
| **Dependencias** | Catalog (vínculo producto↔receta), Ordering (cuándo consumir) |
| **NO le pertenece** | UX de venta, marketing |

**Por qué se declara ya:** para no meter “stock” dentro de Product o Order. **No se implementa en MVP.**

---

## 1.8 Qué deliberadamente NO es un bounded context

| Tentación | Por qué no |
|-----------|------------|
| Kitchen | Vista + commands sobre Order |
| Delivery | `OrderFulfillment.channel` + estados |
| POS | Cliente UI de Ordering + Settlement |
| Reports / Hoy | Lectura / proyección |
| IA | Reaction + UX embebida |
| Marketing / Loyalty | Satélites sobre events (V2+) |
| Mesas | Config en Tenant; referencia en Fulfillment |

---

# 2. Modelo de dominio

Sin tablas. Agregados, value objects y reglas.

---

## 2.1 Tenant

### Agregado `Location`

- **Root:** `Location`
- **Ids:** `businessId`, `locationId`
- **VO:** `LocationSettings` — `{ timezone, currency, capabilities: { hasTables, hasDelivery, hasInventory }, locale }`
- **Entidades hijas:** `LocationMember` `{ userId, role: owner|staff, permissions[] }`, `Table` `{ name, zone?, seats?, active }`

**Invariantes:**

- Toda operación posterior exige `locationId` válido del `businessId` del actor.
- `capabilities` apagadas ⇒ las UIs/anillos correspondientes no se muestran (complejidad progresiva).

---

## 2.2 Catalog

### Agregado `Product`

- **Root:** `Product` (pertenece a `businessId`)
- **Entidades:** `Variant`, `ModifierGroup` → `ModifierOption`
- **VO:** `Money` `{ amountMinor: int, currency }`, `ProductStatus` `draft|published|archived`
- **Fuera del agregado (pero Catalog):** `Category` (agregado chico o entidad referenciada), `Offer` `{ productId, locationId?, channel?, amountMinor, validInterval? }`, `ProductAvailability` `{ productId, locationId, available: bool }`

**Invariantes:**

- Al vender, Ordering **no lee precio vivo a ciegas**: toma snapshot (ver 2.3).
- Un Product published sin Offer usable en esa Location no es vendible.
- Modifiers solo alteran precio vía options con `Money` explícito.

**Value object `Money`:**

- Solo enteros (centavos / minor units).
- Misma currency dentro de un cálculo.
- Operaciones explícitas: `add`, `subtract`, `multiplyQty` — sin floats.

---

## 2.3 Ordering

### Agregado `Order` (root)

```
Order
├── identity: orderId, businessId, locationId, publicId
├── version: number          // optimistic concurrency
├── status: OrderStatus
├── channel: OrderChannel    // origen de apertura
├── openedAt, completedAt?
├── shiftId?                 // turno de caja si aplica
├── relationshipId?          // cliente opcional
├── items: OrderItem[]
├── fulfillment: OrderFulfillment
├── pricing: OrderPricing
└── notes?
```

### `OrderItem` (entidad)

```
OrderItem
├── orderItemId
├── productId, variantId?
├── nameSnapshot
├── unitPrice: Money         // snapshot
├── modifiers: { optionId, nameSnapshot, priceSnapshot: Money }[]
├── quantity
├── lineTotal: Money
├── kitchenStatus?           // pending|preparing|ready (MVP puede derivarse del Order)
└── notes?
```

### `OrderFulfillment` (VO / entidad satélite del agregado)

```
OrderFulfillment
├── type: dine_in | pickup | delivery
├── tableLabel?              // ORIGEN del pedido (ADR-022), NO mesa física
├── tableId?                 // solo cuando exista entidad Table + hasTables
├── customerName?
├── customerPhone?
├── address?                 // V2 delivery
└── deliveryStatus?          // V2
```

`tableLabel` ejemplos: `"Mesa 12"`, `"Barra"`, `"Terraza"`, `"Pickup"`, `"Ventana"`, `"Food Truck"`, `"Drive Thru"`, `"Cliente"`.
### `OrderPricing` (VO)

```
OrderPricing
├── subtotal: Money
├── discount: Money
├── tax: Money               // 0 en MVP si no hay fiscal; campo listo
├── total: Money
└── discountReason?
```

### Estados

```
draft → open → in_kitchen → ready → completed
                 ↘ cancelled
```

MVP puede colapsar `draft`/`open` si el POS abre ya en `open`. Preferencia: **abrir en `open`** y evitar estado fantasma.

### Invariantes del Order

1. Solo se muta vía commands; cada mutación incrementa `version` o falla por conflicto.
2. Ítems llevan **snapshots** de nombre y precio (el menú puede cambiar después).
3. No se completa sin política de pago satisfecha (ver Settlement): MVP = al menos un `payment.captured` que cubra `total`, o `CompleteOrder` con medio “cuenta/cortesía” explícito y permiso.
4. Cancelación de pedido ya `in_kitchen` exige permiso y deja event.
5. `locationId` inmutable tras `OpenOrder`.

---

## 2.4 Settlement

### Agregado `Shift`

```
Shift
├── shiftId, businessId, locationId
├── openedBy, openedAt
├── closedBy?, closedAt?
├── openingFloat: Money
├── status: open | closed
└── expectedCash?, countedCash?   // al cerrar
```

**Invariante:** un Location tiene **como máximo un Shift open**.

### Agregado `Payment` (o entidad bajo Shift + Order)

```
Payment
├── paymentId
├── orderId, shiftId?, locationId, businessId
├── method: cash | card_manual | mercadopago | other
├── amount: Money
├── status: captured | refunded | failed
├── providerRef?
├── idempotencyKey
└── capturedAt
```

**Invariante:** suma de payments captured − refunds ≥ 0; complete order cuando cobertura ≥ total (MVP simple: un pago que cubre el total).

---

## 2.5 Relationships

```
Person (Core)
Relationship (businessId, personId, roles: [customer])
CustomerProfile { allergies[], birthday?, notes? }  // extensión
```

En Order solo `relationshipId` opcional.

---

## 2.6 Reactions / infraestructura de dominio

No son “negocio gastronómico”, pero son parte del modelo operativo:

```
OutboxMessage { id, type, version, payload, headers, createdAt, publishedAt? }
ProcessedEvent { eventId, handlerName, processedAt }
AiRun { id, purpose, model, tokens?, costMinor?, status }
```

---

## 2.7 Diagrama de relaciones entre agregados

```
Business 1──* Location 1──* Table
Business 1──* Product 1──* Variant / Modifier*
Location  *── Offer / Availability ──* Product

Location 1──* Shift
Location 1──* Order ──* OrderItem → snapshots Product
Order 0..1── Relationship
Order 1──* Payment (vía Settlement)
Order 0..1── Shift

Order events ──► Reactions (Hoy, cocina, IA, …)
```

---

# 3. ADRs

Formato: contexto → decisión → consecuencias. Estado: **Accepted** tras aprobación de este documento.

---

## ADR-001 — Monorepo Simple, vertical `simpleresto`

**Contexto:** ecosistema multi-app ya existente.  
**Decisión:** `apps/simpleresto` + `services/api/src/modules/resto` + types en `@simple/types`. Reutilizar auth, ui, payments, media.  
**Consecuencias:** deploy Coolify como el resto; cero backend paralelo.  
**Alternativa rechazada:** repo/servicio independientes (duplica auth y ops).

---

## ADR-002 — REST + Zod sobre Hono; no tRPC

**Contexto:** multi-cliente (panel, QR, webhooks, agentes).  
**Decisión:** HTTP REST `/api/resto/v1/...` con validación Zod. Commands = POST semánticos o recursos con verbos claros.  
**Consecuencias:** contratos explícitos; más boilerplate que tRPC; mejor para integraciones.  
**Alternativa rechazada:** tRPC acoplado a un solo frontend.

---

## ADR-003 — Drizzle + PostgreSQL

**Contexto:** estándar del monorepo.  
**Decisión:** Drizzle para schema/migraciones/queries.  
**Consecuencias:** alineación total; no Prisma.  
**Alternativa rechazada:** Prisma (segundo ORM sin beneficio).

---

## ADR-004 — Domain state + transactional outbox (no event sourcing)

**Contexto:** queremos event-driven sin sobreingeniería.  
**Decisión:** el estado vive en tablas de agregados. En la misma transacción se escribe `outbox`. Un publisher entrega events a handlers idempotentes.  
**Consecuencias:** at-least-once delivery; handlers deben ser idempotentes; no rehidratamos Order desde events.  
**Alternativa rechazada:** EventStore/Kafka día 1; CQRS completo.

---

## ADR-005 — Redis no obligatorio en MVP

**Contexto:** constitución pide no agregar tech sin dolor.  
**Decisión:** MVP con Postgres (advisory locks, outbox polling, SSE o polling corto). Introducir Redis cuando haya multi-réplica API o colas externas (WhatsApp/IA).  
**Consecuencias:** un dependency menos al inicio; plan de migración documentado.  
**Alternativa rechazada:** Redis “por si acaso”.

---

## ADR-006 — Location-first

**Contexto:** cadenas y multi-local son inevitables.  
**Decisión:** todo hecho operativo lleva `businessId` + `locationId`. MVP puede crear un solo Location automáticamente en onboarding.  
**Consecuencias:** queries y events siempre scoped; UI simple igual.  
**Alternativa rechazada:** “agregamos location después”.

---

## ADR-007 — Catálogo compartido (Business) + overrides por Location

**Contexto:** cadenas no deben clonar menús.  
**Decisión:** `Product` en Business; `Offer`/`Availability` por Location (y opcionalmente canal).  
**Consecuencias:** un poco más de joins al vender; evita divergencia de catálogo.  
**Alternativa rechazada:** menú clonado por local como default.

---

## ADR-008 — Order delgado + satélites

**Contexto:** Order tiende a engordar (delivery, tips, fiscal, loyalty…).  
**Decisión:** agregado Order con `items`, `fulfillment`, `pricing` como partes; payments en Settlement; loyalty/fiscal fuera.  
**Consecuencias:** más tipos; modelo estable a 10 años.  
**Alternativa rechazada:** tabla `orders` con 80 columnas.

---

## ADR-009 — Money como value object (enteros)

**Contexto:** errores de float en plata son inevitables.  
**Decisión:** `amountMinor: integer` + `currency`. Snapshots en líneas.  
**Consecuencias:** disciplina en API/UI (formateo); nada de `number` libre para montos.  
**Alternativa rechazada:** `decimal` flotante en JS.

---

## ADR-010 — Idempotency keys en commands de escritura crítica

**Contexto:** doble click, reintentos de red, webhooks.  
**Decisión:** header/body `Idempotency-Key` obligatorio en `OpenOrder`, `AddOrderItem` (opcional si UX lo pide), `CapturePayment`, `OpenShift`, `CloseShift`. Tabla `idempotency_keys` con respuesta cacheada.  
**Consecuencias:** infraestructura chica; elimina dobles cobros.  
**Alternativa rechazada:** “el frontend evita dobles”.

---

## ADR-011 — Optimistic concurrency en Order (`version`)

**Contexto:** multi-dispositivo (caja + mozo + cocina).  
**Decisión:** cada command envía `expectedVersion`; si no coincide → `409 Conflict` con Order fresco.  
**Consecuencias:** UX de “el pedido cambió”; sin locks largos.  
**Alternativa rechazada:** last-write-wins silencioso.

---

## ADR-012 — Versionado de events

**Contexto:** consumers vivirán años.  
**Decisión:** todo event tiene `type` + `version` (int). Cambios breaking ⇒ `version+1` y handlers que acepten N y N-1 durante transición. Payload validado con Zod por versión.  
**Consecuencias:** disciplina; no “cambiar shape silenciosamente”.  
**Alternativa rechazada:** events sin versión “porque son internos”.

---

## ADR-013 — Naming de events

**Decisión:** `domain.action_past` en inglés estable de plataforma, snake o dot consistente con Simple existente. Preferencia: `order.completed`, `payment.captured`. Payload en inglés en contrato; UI en español.  
**Consecuencias:** agents/integraciones estables; copy de producto separado.

---

## ADR-014 — Roles UX Owner/Staff

**Decisión:** UI inicial solo Owner y Staff. Permissions finas internas (`orders:write`, `shift:close`, …). Roles ricos después.  
**Consecuencias:** onboarding sin RBAC corporativo. Cumple “sin capacitación”.

---

## ADR-015 — Inventario fuera del MVP

**Decisión:** no ledger, no recetas, no descuento automático. `Product` puede tener `costMinor` opcional manual sin sistema de stock.  
**Consecuencias:** márgenes aproximados posibles; sin envenenar datos.  
**Alternativa rechazada:** inventario “simple” que igual exige conteos diarios.

---

## ADR-016 — IA solo como reaction + UX embebida

**Decisión:** sin BC “AI”. `AiRun` para auditoría. Sugerencias efímeras; lo aceptado crea/edita entidades reales vía commands.  
**Consecuencias:** alineado a constitución; sin menú IA.

---

## ADR-017 — Completar pedido vs pagar

**Decisión:** `CapturePayment` (Settlement) y `CompleteOrder` (Ordering) son commands distintos. Un reaction o regla de aplicación puede completar automáticamente cuando el pago cubre el total en canal POS. En mesa, el Order puede seguir open tras pagos parciales (V2); MVP POS: pagar y completar en un flujo de UI que dispara ambos commands en secuencia (dos writes, dos events).  
**Consecuencias:** claridad de dominio; UI puede sentirse atómica.  
**Crítica:** no fusionar “PayAndComplete” como único camino de dominio — la UI sí puede orquestar.

---

## ADR-018 — Realtime MVP

**Decisión:** cocina/pedidos con **polling corto (2–3s)** o SSE simple desde API. Sin WebSockets cluster-ready en MVP.  
**Consecuencias:** suficiente para un local; upgrade cuando haya multi-estación real.  
**Alternativa rechazada:** infra realtime compleja día 1.

---

## ADR-019 — Server Actions

**Decisión:** permitidas para lecturas/BFF liviano del panel. **Prohibidas** como único camino de mutación de Order/Payment/Shift/Catalog publish. Esas mutaciones van a `/api/resto/...`.  
**Consecuencias:** POS, QR y agentes comparten dominio.

---

## ADR-020 — Contratos de command HTTP

**Decisión:**  
- `POST /api/resto/v1/locations/:locationId/orders` → `OpenOrder`  
- `POST .../orders/:orderId/items` → `AddOrderItem`  
- `POST .../orders/:orderId/send-to-kitchen`  
- `POST .../orders/:orderId/complete`  
- `POST .../orders/:orderId/payments` → `CapturePayment`  
- `POST .../locations/:locationId/shifts/open`  

Respuestas: recurso actualizado + `version`. Errores tipados (`conflict`, `validation`, `forbidden`).

---

## ADR-021 — Feature flags / capabilities desde T0

**Contexto:** complejidad progresiva y despliegue seguro de código incompleto.  
**Decisión:** dos capas:

1. **Business/Location capabilities** (producto): `hasTables`, `hasDelivery`, `hasInventory`, … — lo que el negocio activó.
2. **Platform feature flags** (desarrollo/rollout): `catalog.enabled`, `settlement.enabled`, `kitchen.enabled`, `today.enabled`, `ai.enabled`, `inventory.enabled`, …

Flags de plataforma pueden vivir en config de Location + defaults de entorno (`RESTO_FLAGS_*` o mapa en settings). La UI y las rutas API respetan ambos: capability del negocio **y** flag de plataforma.

**Consecuencias:** se puede mergear código de T3+ sin exponerlo; A/B y activación por local después; mismo patrón reutilizable en otras verticales.  
**No es:** un producto “Feature Flag SaaS”. Es un mapa booleano versionado + helper `isRestoFeatureEnabled`.  
**Alternativa rechazada:** ifs dispersos sin contrato; o lanzar superficies antes de estar listas.

---

## ADR-022 — `tableLabel` es origen del pedido, no mesa física

**Contexto:** no todos los negocios tienen salón.  
**Decisión:** `OrderFulfillment.tableLabel?: string` identifica el **origen** del pedido (ej. `"Mesa 12"`, `"Barra"`, `"Terraza"`, `"Pickup"`, `"Ventana"`, `"Food Truck"`, `"Drive Thru"`, `"Cliente"`). No implica entidad espacial. Cuando exista `Table`, podrá resolverse `tableId` opcional sin romper labels históricos.  
**Consecuencias:** dominio neutral al tipo de local; UI de salón solo con capability `hasTables`.

---

## ADR-023 — Fronteras de dominio > estructura de carpetas

**Contexto:** Settlement vs Ordering.  
**Decisión:** las fronteras de bounded context se respetan en tipos, commands y events. En MVP todo vive bajo `services/api/src/modules/resto/` con folders internos. Extraer paquetes solo con necesidad real (segundo consumidor o dolor de build).  
**Consecuencias:** evita micro-paquetes prematuros sin diluir el dominio.

---

# 4. Flujo completo — venta POS feliz

Escenario: Staff en un café. Shift ya abierto. Agrega “Café latte” y cobra en efectivo.

```
UI (Operar → Vender)
  │  usuario toca producto
  ▼
Command AddOrderItem | OpenOrder (si no hay order activo)
  Headers: Idempotency-Key, X-Simple-App: simpleresto
  Body: { productId, variantId?, modifiers[], quantity, expectedVersion? }
  ▼
API Hono → Ordering application service
  ▼
Dominio Order.addItem(...)
  - valida Location + Shift open (política MVP)
  - carga Offer/Availability (Catalog)
  - crea OrderItem con snapshots Money
  - recalcula OrderPricing
  - version++
  ▼
Misma transacción Postgres
  - UPDATE/INSERT order + items
  - INSERT outbox (order.item_added | order.opened)
  - INSERT idempotency_keys (si aplica)
  ▼
Response → UI actualiza ticket local
  ▼
Publisher (async, casi inmediato)
  - lee outbox → dispatch
  ▼
Event order.item_added
  ├── Reaction Realtime: notifica suscriptores cocina/pedidos (si ya sent-to-kitchen)
  ├── Reaction Hoy: (opcional) noop hasta complete/payment
  └── (V2) IA/automations: noop
  ▼
UI usuario toca Cobrar → elige efectivo
  ▼
Command CapturePayment
  { orderId, method: cash, amount, idempotencyKey, expectedOrderVersion? }
  ▼
Settlement
  - valida Shift open
  - valida amount vs Order.pricing.total (MVP: igualdad)
  - insert Payment captured
  - outbox payment.captured
  ▼
UI (o application orchestration) → Command CompleteOrder
  - invariante: payments cubren total
  - status = completed
  - outbox order.completed
  ▼
Reactions a order.completed / payment.captured
  ├── Hoy: incrementar ventas del día (SQL aggregate o proyección)
  ├── Cocina: remover de cola si seguía
  └── (V2) fidelización / WhatsApp gracias / IA digest
```

### Secuencia resumida

| Paso | Pieza | Hecho |
|------|-------|-------|
| 1 | UI | Agregar producto |
| 2 | Command | `OpenOrder` / `AddOrderItem` |
| 3 | Dominio | Order + snapshots |
| 4 | DB | state + outbox |
| 5 | Event | `order.opened` / `order.item_added` |
| 6 | UI | Cobrar |
| 7 | Command | `CapturePayment` |
| 8 | Event | `payment.captured` |
| 9 | Command | `CompleteOrder` |
| 10 | Event | `order.completed` |
| 11 | Reactions | Hoy, etc. |

---

# 5. Roadmap técnico (por dependencias)

No por pantallas. Por lo que desbloquea lo demás.

**Regla de avance (aprobada):** cada fase termina con una **funcionalidad demostrable**. No semanas de infraestructura sin algo usable. Iteraciones pequeñas y completas.

| Fase | Construir | Demostrable cuando… |
|------|-----------|---------------------|
| **T0** | App shell + brand/auth/`X-Simple-App` + Location auto + feature flags base | Puedo abrir `simpleresto` local, entrar al panel autenticado y ver mi Location creada |
| **T1** | Outbox + idempotency + Money + error model | Puedo disparar un command de prueba que persiste estado + outbox y rechaza un retry duplicado |
| **T2** | Tenant settings, capabilities, members Owner/Staff | Puedo ver/editar settings básicos del local y flags de capability |
| **T3** | Catalog mínimo | Puedo **crear un producto** |
| **T4** | Ordering Open/Add/Update/Remove/Cancel + version | Puedo **abrir un pedido y agregar productos** |
| **T5** | Shift + CapturePayment + CompleteOrder | Puedo **cobrar una venta** |
| **T6** | UI Operar (POS) | Alguien podría **vender de verdad** con el sistema |
| **T7** | UI Hoy (SQL agregado) | Puedo responder “¿cuánto vendí hoy?” |
| **T8** | SendToKitchen + vista Cocina | Puedo mandar a cocina y marcar listo |
| **T9** | Clientes quick-add | Puedo asociar un cliente a un pedido |
| **T10** | IA embebida v0 (describir / precio) | Puedo aceptar una sugerencia que actualiza un producto |
| **T11** | Pickup + menú/QR read-only | Puedo ver el menú público de un local |
| **T12** | Hardening + Coolify prod | Vertical desplegada en producción |

**Explícitamente después (no bloquean T0–T6):** Inventory, mesas físicas, delivery partners, WhatsApp, webhooks públicos, Redis, Stripe, roles ricos, automations builder, offline.

**Regla de secuencia:** no construir Hoy antes de Order+Payment; no construir Cocina antes de `SendToKitchen`; no construir IA antes de Product commands.

---

# 6. Riesgos, simplificaciones y lo que NO va en el MVP

## 6.1 Riesgos a 2–3 años

| Riesgo | Por qué duele | Mitigación en esta arquitectura |
|--------|---------------|----------------------------------|
| Order engorda otra vez | Tips, fiscal, split bill, marketplace fees | ADR-008 satélites; code review contra columnas nuevas en root |
| Outbox sin disciplina | Handlers no idempotentes → stock/cobros dobles (cuando existan) | `ProcessedEvent` obligatorio; tests de reentrega |
| Catálogo + overrides mal UX | Dueños de un solo local confusos | UI MVP: un Location, ocultar “overrides”; modelo igual |
| Relationship Engine incompleto | Adapter local se vuelve CRM paralelo | Fecha de consolidación + prohibición de campos que no mapeen a Core |
| “Reactions” se vuelve Zapier interno prematuro | Complejidad UX | Solo 2–3 handlers hasta V2; sin builder |
| Realtime barato insufiente | Multi-tablet lag | Upgrade path SSE/Redis documentado; no reescritura de dominio |
| Fiscal LATAM | Bloqueo de adopción seria | No fingir; snapshots de tax listos; integración partner después |
| Over-commanding | Un command por keystroke | Commands de grano medio (`AddOrderItem`, no `SetItemQtyChar`) |
| Dashboard prematuramente event-sourced | Ops costosa | Hoy vía SQL hasta dolor medible (ADR implícito en principios) |

## 6.2 Qué simplificaría aún más (crítico)

1. **¿Settlement como BC separado en código día 1?** Mantener frontera de dominio, pero **un solo módulo** `resto` con folders `ordering/`, `settlement/`, `catalog/`. No packages internos todavía.
2. **¿`draft` status?** Eliminar. Abrir en `open`.
3. **¿Modifiers complejos en MVP?** Solo un nivel: groups + options. Sin modifiers anidados.
4. **¿Offer temporal/happy hour?** Modelo listo; UX MVP = un precio por producto/location.
5. **¿OrderItem.kitchenStatus?** Derivar del estado del Order en MVP; granularidad por ítem en V2.
6. **¿Tables entity?** No en MVP. `OrderFulfillment.tableLabel` = identificador de **origen del pedido** (no mesa física). Ver ADR-022. Entidad `Table` solo con capability `hasTables`.
7. **¿PublicId + QR tracking?** Sí para pedidos públicos; no construir portal cliente completo.

### Corrección vs constitución

La constitución pide mesas como anillo. Introducir entidad `Table` + mapa antes de necesidad **contradice complejidad progresiva**.

**Alternativa adoptada (aprobada):** MVP usa `OrderFulfillment.tableLabel?: string` como **origen del pedido**, no como mesa física. Ejemplos válidos: Mesa 12, Barra, Terraza, Pickup, Ventana, Food Truck, Drive Thru, Cliente. La entidad `Table` entra con capability `hasTables` y podrá resolver orígenes a mesas reales sin romper el dominio.

## 6.3 Prohibido en MVP (lista corta)

- Inventario / recetas / ledger  
- Mapa de mesas  
- Delivery partners / flota / direcciones complejas  
- WhatsApp bot  
- API pública versionada para terceros  
- Redis / Kafka / WebSockets cluster  
- Roles ricos (más allá Owner/Staff)  
- Builder de automatizaciones  
- Offline POS  
- Facturación electrónica  
- Split payment / propinas avanzadas  
- Multi-location UI (el modelo sí; la UI de cadena no)  
- Menú “Reportes” denso (Hoy basta; reportes profundos después)  
- Cualquier pantalla que mezcle Operar + Crecimiento  

## 6.4 Ambigüedades cerradas (checklist de aprobación)

| Tema | Decisión |
|------|----------|
| ¿Dominio vs commands/events? | Dominio es el producto (constitución actualizada) |
| ¿Cuántos BCs? | 5 activos + Inventory declarado + Reactions transversal |
| ¿Cocina BC? | No |
| ¿Pago y complete? | Dos commands; UI puede encadenar |
| ¿Redis MVP? | No |
| ¿Event sourcing? | No |
| ¿Tables MVP? | `tableLabel` string; entity después |
| ¿Clientes? | Adapter Compatible con Core |
| ¿Moneda? | Por Location (`CLP` default ecosistema) |
| ¿Idempotency? | Sí en writes críticos |
| ¿Version Order? | Sí |
| ¿Event version? | Sí |

---

## 7. Criterio de aprobación

**Aprobada** con ajustes de `tableLabel` (origen), Settlement (frontera > carpetas), roadmap demostrable, y ADR-021 feature flags.

Implementación vigente: **T0–T12** (+ pickup público). Post-roadmap por oleadas: [`SIMPLERESTO_WAVES.md`](./SIMPLERESTO_WAVES.md).

---

## 8. Relación con otros docs

| Doc | Rol |
|-----|-----|
| `SIMPLERESTO_PRINCIPLES.md` | Constitución estable — cambiar solo con razón fuerte |
| `SIMPLERESTO_ARCHITECTURE.md` (este) | Decisiones de arquitectura |
| `SIMPLERESTO_PLAN.md` (futuro) | Plan de producto/fases tipo Tickets |
| `SIMPLE_PLATFORM_LANGUAGE.md` | Idioma Core |
