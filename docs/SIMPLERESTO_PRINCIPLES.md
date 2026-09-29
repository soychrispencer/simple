# Principios de SimpleResto

Constitución de producto y arquitectura.

Congela la identidad de SimpleResto. Toda decisión de diseño, UX, dominio, API o infraestructura debe poder defenderse con este documento.

Si una feature, pantalla, abstracción o dependencia contradice estos principios, **no se construye** — se rediseña.

Complementa (no reemplaza):

- [`SIMPLE_PLATFORM_LANGUAGE.md`](./SIMPLE_PLATFORM_LANGUAGE.md) — lenguaje Core del ecosistema
- [`SIMPLERESTO_ARCHITECTURE.md`](./SIMPLERESTO_ARCHITECTURE.md) — bounded contexts y ADRs
- [`SIMPLERESTO_WAVES.md`](./SIMPLERESTO_WAVES.md) — plan por oleadas (spike operativo)
- [`SIMPLERESTO_MASTER_ALIGNMENT.md`](./SIMPLERESTO_MASTER_ALIGNMENT.md) — auditoría Documento Maestro vs estado actual

---

## 1. Qué es SimpleResto

SimpleResto es la vertical gastronómica del ecosistema Simple.

No es un POS antiguo.
No es un ERP de restaurantes.
No es un panel de administración para “usuarios avanzados”.

Es una plataforma que ayuda a **operar, vender y crecer** un negocio de comida — con la menor fricción posible.

> Cualquier persona del local debe poder empezar a vender sin capacitación.

La experiencia debe sentirse como una app moderna (Linear, Stripe, Sumup, Raycast), no como un sistema heredado de caja registradora.

---

## 2. Tres niveles del negocio (invisibles en la UI)

Todo lo que construyamos pertenece a uno de estos niveles. Son **capas de valor**, no módulos del menú.

| Nivel | Propósito | Ejemplos |
|-------|-----------|----------|
| **1. Operación** | Hacer el trabajo de hoy | Ventas, pedidos, cocina, mesas, caja, inventario |
| **2. Gestión** | Entender y administrar el negocio | Reportes, costos, clientes, productos, equipo, configuración, análisis |
| **3. Crecimiento** | Vender más y mejor con el tiempo | Marketing, automatizaciones, fidelización, IA, campañas, web, QR, WhatsApp, redes, integraciones |

### Regla de oro

Estos tres niveles **nunca** aparecen como tres secciones, tres tabs o tres productos dentro de la interfaz.

El usuario no debe pensar “estoy en Crecimiento”. Debe pensar “quiero vender más” o “hoy voy bien”.

La complejidad se revela por **necesidad y madurez del negocio**, no por arquitectura interna.

---

## 3. Complejidad progresiva

### Principio

> El usuario nuevo solo ve lo necesario para comenzar a vender. A medida que el negocio crece, el sistema habilita capacidades. La pantalla inicial nunca debe intimidar.

### Reglas

1. **Time-to-first-sale &lt; 15 minutos.** Si el onboarding pide más, está mal.
2. **Zero-config antes de la primera venta.** Mesas, delivery, inventario, marketing y automatizaciones se activan después.
3. **Progressive disclosure.** Una capacidad aparece cuando el negocio la necesita (o cuando el usuario la enciende), no porque exista en el roadmap.
4. **Defaults inteligentes.** El sistema elige por el usuario; la configuración avanzada es opt-in.
5. **Un local, un menú corto, vender.** Ese es el camino feliz del día 1.
6. **Nunca premiar el poder con densidad.** Más features ≠ más botones visibles.

### Test de intimidación

Si un dueño de food truck abre el panel por primera vez y siente que “esto es mucho”, la pantalla falló el test — aunque sea “completa” para una cadena.

---

## 4. Una pantalla, una pregunta

### Principio

> Cada pantalla responde una sola pregunta. Si responde varias, está mal diseñada.

### Preguntas canónicas

| Pregunta | Superficie típica | Nivel |
|----------|-------------------|-------|
| ¿Qué debo hacer ahora? | Vender / Pedidos / Cocina / Mesas | Operación |
| ¿Qué está pasando hoy? | Hoy | Gestión (vista operativa) |
| ¿Cómo vendo más? | Insights, canales, campañas sugeridas | Crecimiento |
| ¿Dónde estoy perdiendo dinero? | Costos, merma, márgenes, productos flojos | Gestión |
| ¿Qué debo configurar? | Ajustes / Canales / Equipo | Gestión |

### Reglas

1. El dashboard no es un mural de widgets. Responde **¿qué está pasando hoy?**
2. El POS no enseña reportes. Responde **¿qué debo cobrar / anotar ahora?**
3. La cocina no muestra marketing. Responde **¿qué debo preparar ahora?**
4. Si necesitas dos preguntas, necesitas dos superficies (o un flujo secuencial), no una pantalla híbrida.
5. Los insights de crecimiento pueden vivir como **sugerencias** dentro de Hoy — no como un segundo dashboard compitiendo.

---

## 5. Tres modos de uso (ley de navegación)

La navegación se organiza por **modo de uso**, no por organigrama de módulos.

| Modo | Pregunta | Contiene |
|------|----------|----------|
| **Operar** | ¿Qué debo hacer ahora? | Vender, Pedidos, Cocina, Mesas (si aplica) |
| **Entender** | ¿Qué está pasando hoy? | Hoy (+ profundidad de reportes cuando se busque) |
| **Configurar** | ¿Qué debo configurar? | Menú, equipo, canales, local, integraciones |

### Reglas

1. El sidebar permanece mínimo. El command palette (`⌘K` / búsqueda global) es la vía rápida.
2. Caja no es una app eterna: es un subflujo de Operar (turno abierto / cierre).
3. Inventario, delivery y salón son **anillos opcionales**, no ítems permanentes para quien no los usa.
4. Marketing, fidelización, WhatsApp y automatizaciones son **satélites** (Canales + sugerencias), no una columna de navegación “Crecimiento”.
5. Un satélite no gana ítem de sidebar hasta demostrar uso real y frecuente.

---

## 6. Filosofía de producto

### 6.1 Menos interacción, más resultado

- Menos botones.
- Menos configuración.
- Más automatización.
- Más velocidad.
- Mínimo número de clics para la acción frecuente.

### 6.2 Pensado para quien trabaja en el local

Diseñar primero para cajero, mozo y cocina en un turno real. El administrador sofisticado es un usuario secundario, no el centro gravitacional.

### 6.3 Velocidad &gt; densidad de información

Es mejor una métrica clara y una acción sugerida que doce gráficos. La información secundaria se revela bajo demanda.

### 6.4 El Order es el centro operativo

Un pedido es un pedido. Mesa, delivery, retiro, QR, web o WhatsApp son **canales / fulfillment**, no sistemas distintos.

El POS es una superficie. El núcleo es el **Order** y su ciclo de vida.

### 6.5 SimpleResto ayuda a crecer, sin convertirse en agencia

Crecimiento (marketing, campañas, fidelización, redes) existe como capacidad de plataforma. Nunca como laberinto de herramientas que el local debe “administrar” para merecer valor.

---

## 7. Inteligencia artificial

### Principio

> La IA está integrada en el flujo. Nunca es un menú. Sugiere; no obliga.

### Reglas

1. **Prohibido** un ítem de navegación llamado “IA”, “Assistant” o equivalente.
2. La IA aparece solo cuando puede reducir trabajo real (descripción de producto, precio sugerido, insight del día, alerta de baja rotación, borrador de campaña).
3. Toda propuesta es **aceptar / editar / descartar**.
4. La IA no bloquea el camino crítico de cobro u operación de cocina.
5. Las ejecuciones de IA son auditables (modelo, costo, latencia) y tienen presupuesto.
6. Las sugerencias efímeras no se convierten en un CRM de “ideas”. Solo lo aceptado persiste como entidad de negocio (producto, promo, mensaje, etc.).
7. Los agentes futuros escriben al sistema solo mediante **commands** con permisos e idempotencia — nunca con SQL o atajos de UI.

---

## 8. Principios de ecosistema Simple

SimpleResto es una vertical. El Core manda.

1. **Capability first, vertical second.** Si otra vertical lo necesitará, pertenece al Core o a un seam extraíble — no a un silo eterno de Resto.
2. **Reutilizar antes de crear.** Auth, accounts/Business, payments, media, notifications, UI, utils.
3. **UI ≠ dominio.** En pantalla: Cliente, Mesa, Pedido. En dominio: Person, Relationship, Order, Publication/Offer cuando aplique.
4. **Seam primero, extracción después.** Diseñar fronteras claras desde el día 1; extraer a paquete/Core cuando exista el **segundo consumidor real**, no el hipotético.
5. **Excepción (Core desde el día 1):** Identity, Business/Account, Payments/Money, Media, Notifications, **Domain Events / Commands**.
6. Hablar el idioma de [`SIMPLE_PLATFORM_LANGUAGE.md`](./SIMPLE_PLATFORM_LANGUAGE.md). No inventar entidades paralelas (“RestoCustomer” eterno, “RestoPayment” paralelo, etc.).

---

## 9. API-first y event-driven

### Principio

> El dominio es el producto. Los Commands son la forma de modificarlo. Los Events comunican los hechos relevantes del negocio. Las interfaces (web, móvil, automatizaciones y agentes) son clientes del dominio.

Commands y Events son mecanismos del dominio — no un fin en sí mismos. Evitar sobreingeniería: no inventar commands/events donde no hay hecho de negocio real.

Este enfoque es un diferencial deliberado frente a POS cerrados.

### Reglas

1. **Toda mutación de negocio** pasa por la API de dominio (commands). No hay reglas importantes solo en React ni en Server Actions con side effects irrepetibles.
2. **Toda mutación relevante** emite domain events (pedido creado, pagado, menú publicado, stock bajo, turno cerrado, etc.).
3. Patrón obligatorio: `command → transacción Postgres (estado + outbox) → consumer idempotente`.
4. Los eventos tienen contrato: `id`, `type`, `version`, `occurredAt`, `businessId`, `locationId`, `aggregateType`, `aggregateId`, `actorId`, `payload`, `correlationId` / `causationId`.
5. **No** event sourcing completo por defecto. El estado vive en tablas; los eventos son el sistema nervioso.
6. **No** Kafka/NATS/Temporal el día 1. Outbox en Postgres es suficiente hasta que el dolor operacional diga lo contrario.
7. API pública versionada para terceros es **posterior**. Día 1 = internal API-first + events. Webhooks firmados y public API cuando haya demanda real.
8. Automatizaciones = reactions sobre eventos (`cuando X, si Y, entonces Z`), con política `suggest` vs `auto`. No hardcodear cada integración dentro del service de Order.

---

## 10. Principios de arquitectura técnica

### Stack (alineado al monorepo)

Next.js · React · TypeScript · Hono · Drizzle · PostgreSQL · Redis (cuando haga falta) · Docker · Coolify · Cloudflare.

### Reglas

1. **No agregar tecnología sin un dolor real.** La moda no es un requisito.
2. **REST + Zod** como contrato. No tRPC como API primaria del ecosistema.
3. **Drizzle**, no un segundo ORM.
4. **UI en `@simple/ui`**, no un design system paralelo (shadcn puede inspirar, no bifurcar).
5. **Location-first:** toda transacción operativa lleva `locationId`, aunque el MVP tenga un solo local.
6. **Catálogo a nivel Business** + availability/price overrides por Location. No clonar menús por local como modelo default.
7. **Order delgado** + satélites (`fulfillment`, `pricing`, `payments`). Evitar un `orders` de 80 columnas.
8. Dinero en **enteros** (minor units) + `currency` + snapshots de precio/impuesto en la línea. Nunca floats para plata.
9. Commands con **idempotency keys** y Orders con **version** (concurrency) desde temprano.
10. Redis no es sagrado el día 1. Postgres puede cubrir locks/jobs/realtime básicos hasta multi-instancia.
11. Analytics: empezar simple (SQL/índices/vistas); proyecciones por eventos cuando el dashboard deje de ser instantáneo.
12. Inventario con ledger **tarde**. Dato mentiroso es peor que dato ausente.
13. Offline POS es V2+. El MVP asume online y degrada con claridad.

---

## 11. Principios de diseño visual e interacción

1. Interfaz limpia, mucho espacio en blanco, jerarquía clara.
2. Inspiración: Linear, Stripe, Vercel, Raycast, Notion, Apple, Sumup — **nunca** POS verde-negro legacy.
3. Tipografía y tokens del design system Simple (Instrument Sans + Inter + acento de vertical).
4. Animaciones sutiles con propósito (presencia y feedback), no decoración.
5. Touch-first en Operar; atajos de teclado de primer nivel en POS escritorio.
6. Densidad informativa baja en la primera vista; detalle bajo demanda.
7. Vacíos útiles: estados empty que enseñan la siguiente acción, no pantallas muertas.
8. Si quitar un borde, sombra o card no empeora la comprensión, quitarlo.

---

## 12. Multitenancy y acceso

```
Identity → Membership → Business → Location → (Station en el futuro)
```

1. Business es el dueño comercial (cuenta Simple / account).
2. Location es la unidad operativa (local, dark kitchen, truck).
3. Roles visibles al inicio: **Owner** y **Staff** (permisos internos finos debajo).
4. Roles nombrados ricos (cajero, cocina, manager…) cuando el negocio los necesite — no en el onboarding.
5. Un usuario puede tener distinto rol por Location.
6. Acciones sensibles dejan auditoría (anulaciones, descuentos fuertes, ajustes de stock, cierres de caja).

---

## 13. Fronteras de producto (para no volverse ERP)

| Capa | Qué es | Cómo se presenta |
|------|--------|------------------|
| **Núcleo** | Pedidos, menú, cobro, estados, equipo, Hoy | Siempre visible según modo |
| **Anillos** | Salón, delivery, inventario, promos | Se activan; desaparecen si no aplican |
| **Satélites** | WhatsApp, web/QR, marketing, fidelización, redes, automatizaciones, agentes | Canales, sugerencias, Hoy, command palette |

### Regla

Un satélite **no** merece ítem permanente de navegación hasta tener uso frecuente medible. Antes: insight + acción sugerida + toggle en Canales.

---

## 14. Prohibiciones explícitas

Durante el desarrollo de SimpleResto está **prohibido**:

1. Crear un menú o sección llamada “IA”.
2. Mostrar Operación / Gestión / Crecimiento como módulos de UI.
3. Construir 15+ ítems de sidebar “porque existen en el backlog”.
4. Meter lógica de negocio crítica solo en el frontend.
5. Mutar estado de negocio sin event de dominio cuando el hecho sea relevante.
6. Introducir Prisma, tRPC, Kafka u otro stack paralelo sin ADR y dolor demostrado.
7. Crear un design system aparte de `@simple/ui`.
8. Diseñar pantallas que mezclen POS + reportes + marketing.
9. Obligar configuración de mesas/delivery/inventario antes de la primera venta.
10. Usar floats para dinero.
11. Clonar el catálogo por local como modelo canónico.
12. Hacer que un agente o automatización ejecute cambios irreversibles sin política `suggest`/`auto` y sin command idempotente.
13. Copiar la UX de POS tradicionales “porque el mercado está acostumbrado”.
14. Romper el lenguaje Core inventando entidades gemelas innecesarias.

---

## 15. Tests de decisión (usar en PRs y diseños)

Antes de mergear o diseñar, responder:

1. **¿Qué pregunta responde esta pantalla?** Si hay más de una → dividir.
2. **¿Un usuario nuevo la necesita el día 1?** Si no → ocultar / anillo / satélite.
3. **¿Esto es Operación, Gestión o Crecimiento?** Si la UI lo etiqueta así → rediseñar.
4. **¿La mutación pasa por un command y emite evento?** Si no → corregir.
5. **¿Otra vertical lo necesitará?** Si sí → ¿seam Core o silo justificado?
6. **¿Agrega tecnología nueva?** Si sí → ¿qué dolor concreta mide?
7. **¿La IA sugiere o obliga?** Si obliga → mal.
8. **¿Se siente a Linear/Sumup o a ERP?** Si ERP → simplificar.
9. **¿El cajero puede usarlo sin capacitación?** Si no → no está listo.
10. **¿Rompe algún ítem de la sección 14?** Si sí → no mergear.

---

## 16. Evolución de este documento

- Este archivo es **constitución**, no backlog. Queda **estable**.
- Cualquier cambio futuro requiere razón importante, ADR o PR dedicado, y revisión explícita.
- La arquitectura concreta vive en [`SIMPLERESTO_ARCHITECTURE.md`](./SIMPLERESTO_ARCHITECTURE.md).
- El roadmap de implementación no diluye estos principios.
- Si una regla se vuelve ambigua, se aclara aquí — no se ignora en el código.

---

## 17. Resumen en una frase

> SimpleResto es el sistema nervioso del negocio gastronómico: el dominio (con el Order en el centro) es el producto; commands y events lo hacen operable e integrable; la UI solo muestra lo necesario para actuar ahora; y el crecimiento aparece cuando ayuda — nunca cuando intimida.
