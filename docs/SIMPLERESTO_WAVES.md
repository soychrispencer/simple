# SimpleResto — Plan por oleadas

Plan ordenado (spike operativo sobre dominio `resto_*`) para cerrar gaps vs Fudo / Toteat sin convertir el panel en un ERP el día 1.

> **Alineación Core:** ver [`SIMPLERESTO_MASTER_ALIGNMENT.md`](./SIMPLERESTO_MASTER_ALIGNMENT.md). Oleadas 1–8 (satélite) + fases maestro 0–8 (vertical-config, Timeline, Media lean, Uber Direct, billing, UX Hoy) **hechas**.

Principios:
- Una oleada termina **demostrable** antes de abrir la siguiente.
- Complejidad progresiva: flags / capabilities cuando haga falta.
- El dominio (Order + Settlement) manda; la UI es cliente.

## Estado

| Oleada | Nombre | Estado |
|--------|--------|--------|
| 1 | Cobrar de verdad | **Hecho** (descuento + multi-pago UI) |
| 1.b | Mercado Pago online | **Hecho** (OAuth resto + preference + webhook + link en cobro) |
| 2 | Caja del turno | **Hecho** (movimientos + arqueo ciego + propinas) |
| 3 | Mesas | **Hecho** (salas + mapa + tableId + traslado) |
| 4 | Comanda física | **Hecho** (cola print + ticket browser) |
| 5 | Carta rica | **Hecho** (categorías + adicionales + favoritos en Operar) |
| 6 | Delivery hub | **Hecho** (ingest Uber/partners → mismo Order + captura en Pedidos) |
| 7 | Inventario liviano | **Hecho** (stock por producto + bloqueo/alerta en Operar) |
| 8 | Reportes / fiscal | **Hecho** (ventas semana + CSV + boleta local) |

---

## Oleada 1 — Cobrar de verdad

**Objetivo:** Cobrar como en el local real: descuentos y varios medios en un pedido.

**Incluye**
- Descuento fijo o % sobre el pedido (`ApplyDiscount`)
- Pagos parciales multi-método (efectivo, tarjeta manual, Mercado Pago registrado)
- UI de cobro en Operar (y Pedidos)

**Mercado Pago online (preference + webhook):** **1.b hecho.** OAuth vertical `resto`, preference desde Operar/Pedidos, webhook confirma `resto_payments` y cierra el pedido si queda pagado. Conectar en Mi cuenta → Integraciones.

**Criterio de listo**
- Pedido con descuento + dos pagos (ej. efectivo + tarjeta) hasta completar y cerrar.
- Link Mercado Pago generado y cobro confirmado por webhook (o sandbox).

---

## Oleada 1.b — Mercado Pago online

**Incluye**
- OAuth operador `vertical=resto` → `payment_provider_connections`
- `POST /api/resto/v1/orders/:id/payments/mercadopago/checkout`
- `POST /api/resto/payments/mercadopago/webhook`
- UI Integraciones + botón “Generar link Mercado Pago” en cobro

**Criterio:** cobro con link/QR sin marcar el pago a mano.

---

## Oleada 2 — Caja del turno

- Movimientos de caja (ingreso/egreso no venta)
- Arqueo / arqueo ciego al cerrar
- Propinas básicas

**Criterio:** cierre de turno con cuadre entendible. **Hecho.**

API: `resto_cash_movements`, snapshot `expectedCash`/`cashVariance` al cerrar, `tipMinor` en pagos, summary de turno.
UI: panel de caja en Operar/Pedidos; propina en cobro manual.

---

## Oleada 3 — Mesas

- Activar `hasTables` con mapa simple (salas + mesas)
- Venta ligada a mesa (no solo `tableLabel` libre)
- Traslado entre mesas

**Criterio:** salón opera desde el mapa. **Hecho.**

API: `resto_rooms` / `resto_tables`, floor, `tableId` en fulfillment, `transfer-table`.
UI: `/panel/mesas` (nav si `hasTables`).

---

## Oleada 4 — Comanda física

- Impresión comanda / precuenta (bridge local o cola de impresión)

**Criterio:** ticket sale al comandar / precuenta al pedir. **Hecho.**

API: `resto_print_jobs`, enqueue comanda al enviar a cocina, `POST .../print` precuenta, ack printed/failed.
UI: preview 80mm + `window.print` en Operar/Pedidos. Bridge stub = mismos endpoints de cola.

---

## Oleada 5 — Carta rica

- Categorías nombradas
- Adicionales planos (sin groups min/max)
- Favoritos en Operar (filtro + sección)

**Criterio:** vender más rápido sin pantallas de más. **Hecho.**

---

## Oleada 6 — Delivery hub

- Uber Eats primero → mismo `Order` (`channel=delivery`)
- Satélite `resto_delivery_orders` (partner + externalOrderId idempotente)
- Captura manual en Pedidos + webhook stub (`X-Resto-Delivery-Secret`)
- Labels en Pedidos/Cocina
- Luego Rappi / Justo / PedidosYa (mismo ingest)

**Criterio:** pedidos aggregator visibles en Pedidos/Cocina. **Hecho.**

---

## Oleada 7 — Inventario liviano

- Stock por producto × local (`resto_inventory`, sin ledger/recetas)
- Seguir stock opcional; alerta bajo umbral; bloqueo en 0
- Consume al vender; libera al quitar ítem / cancelar

**Criterio:** `hasInventory` enciende un anillo útil. **Hecho.**

---

## Oleada 8 — Reportes / fiscal

- Reporte de ventas por rango (día / canal / medio de pago)
- Export CSV
- Boleta local (folio por local; provider=`local`, SII/partner después)

**Criterio:** el dueño entiende la semana y puede emitir boleta. **Hecho.**

---

## Fuera de alcance cercano

Múltiples cajas complejas, PIN mozo, mapa de calor, Meta ads, chatbot WA, logística Uber Direct, cuentas corrientes profundas — solo cuando el local lo pida y no rompa el test de intimidación.
