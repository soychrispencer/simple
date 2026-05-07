# SimpleSerenatas — Plan Maestro v2
> Actualizado Mayo 2026 · Con modelo de negocio definitivo  
> Trabajar en orden estricto. No avanzar sin completar la fase anterior.

---

## Reglas del juego

- **Una tarea a la vez.** Terminarla, probarla, luego la siguiente.
- **No agregar features no listadas** hasta completar la fase actual.
- **Cada fase tiene un criterio de éxito** — si no se cumple, no se avanza.
- **El primer usuario real es Pablo** (coordinador/trompetista). Todo se valida con su flujo.
- **Mobile-first siempre.** Cada pantalla se prueba en 390px antes de desktop.

---

## Modelo de Negocio Definitivo

### Roles del sistema

- **Músico** (default al registrarse): gratis, recibe invitaciones, ve agenda, y puede activar coordinador.
- **Coordinador** (activación desde perfil de músico): trial 30 días, luego suscripción mensual.

### Regla de origen (`source`) inmutable

- `own_lead`: cliente propio del coordinador, **0% comisión siempre**.
- `platform_lead`: cliente captado por la app, **comisión aplica**.
- El `source` se define en backend al crear la serenata y **no se puede editar**.

### Tabla de comisiones (etapa inicial)

- `own_lead` -> `0%`
- `platform_lead` -> `8% + IVA`

### Suscripción del coordinador (etapa actual)

- Trial: 30 días gratis al activar coordinador.
- Básico: $4.990/mes.
- Pro: $9.990/mes.
- La suscripción financia herramientas operativas; no depende de leads para existir.

---

## Stack definido (no cambiar)

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| API | Hono (dentro del monorepo `/services/api`) |
| Base de datos | PostgreSQL + Drizzle ORM |
| Auth | Sesiones propias (`simple_session`) |
| Storage | VPS propio (Coolify) |
| Mapas | Leaflet + OpenStreetMap |
| Pagos (fase 5) | MercadoPago |
| Notificaciones | Push via Service Worker |

---

## Personas (en orden de construcción)

1. **Coordinador** — capta clientes, arma grupos, gestiona agenda y rutas. ← PRIMERO
2. **Músico** — recibe invitaciones, acepta, ve su agenda del día. ← SEGUNDO
3. **Cliente** — solicita serenata, hace seguimiento. ← TERCERO

---

## FASE 0 — Reset y Arquitectura Base
**Objetivo:** Repo limpio, base sólida, cero deuda técnica acumulada.  
**Criterio de éxito:** El proyecto compila sin errores y carga en localhost.

### 0.1 — Backup del estado actual
- [ ] Crear branch `archive/v0-exploracion` desde el estado actual de `main`
- [ ] Push del branch al remote
- [ ] Confirmar que el branch quedó en GitHub
- [ ] Volver a `main` y definir qué se conserva y qué se elimina

### 0.2 — Auditoría del código existente
- [ ] Listar todas las páginas en `apps/simpleserenatas/src/app/`
- [ ] Marcar cuáles funcionan end-to-end con el API hoy
- [ ] Marcar cuáles tienen UI pero sin API real detrás
- [ ] Marcar cuáles son duplicados (ej: `page.tsx` vs `page-new.tsx` vacío)
- [ ] Documentar en `AUDIT.md` dentro del repo

### 0.3 — Limpieza de archivos muertos
- [ ] Eliminar `apps/simpleserenatas/src/app/(app)/solicitudes/page-new.tsx` (vacío)
- [ ] Eliminar `apps/simpleserenatas/src/app/(app)/inicio/page-simplified.tsx` (duplicado)
- [ ] Revisar y eliminar cualquier otro archivo `-new`, `-old`, `-v2`, `-simplified`
- [ ] Eliminar imports no usados en `components/index.ts`

### 0.4 — Variables de entorno
- [ ] Confirmar que `.env.local` existe en `apps/simpleserenatas/`
- [ ] Confirmar que `NEXT_PUBLIC_API_URL` apunta al API local
- [ ] Confirmar que el API en `services/api` arranca sin errores
- [ ] Confirmar que la DB tiene las migraciones aplicadas
- [ ] Crear `.env.example` actualizado si no existe o está desactualizado

### 0.5 — Migraciones de base de datos
- [ ] Auditar las tablas existentes: `serenata_musicians`, `serenatas`, `serenata_requests`, etc.
- [ ] Confirmar que todas las tablas necesarias para la Fase 1 existen
- [ ] Ejecutar migraciones pendientes si las hay
- [ ] Documentar el schema de DB vigente en `docs/schema.md`

### 0.6 — Navegación base del coordinador
- [ ] Revisar `panel-nav-config.ts` — dejar solo rutas que tienen páginas funcionales
- [ ] Confirmar que el layout del coordinador carga sin errores
- [ ] Confirmar que el sidebar se colapsa correctamente en desktop
- [ ] Confirmar que la bottom nav mobile muestra las 4 rutas correctas del coordinador
- [ ] Confirmar que el redirect de roles funciona (coordinador → `/inicio`)

**✅ Criterio de éxito Fase 0:** El proyecto carga, el coordinador puede loguearse, ver el inicio y navegar sin errores de consola.

---

## FASE 1 — CRUD de Serenatas (Coordinador)
**Objetivo:** Pablo puede crear, ver y gestionar sus serenatas desde el celular.  
**Criterio de éxito:** Pablo crea una serenata real con datos de un cliente y la marca como completada.

### 1.1 — API: Endpoints de serenatas del coordinador
- [ ] `GET /api/serenatas/requests?assignedToMe=true` — lista de serenatas asignadas al coordinador
- [ ] `POST /api/serenatas/requests` — crear serenata (coordinador capta cliente directo)
- [ ] `GET /api/serenatas/requests/:id` — detalle de una serenata
- [ ] `PATCH /api/serenatas/requests/:id` — editar serenata (dirección, fecha, precio)
- [ ] `POST /api/serenatas/requests/:id/complete` — marcar como completada
- [ ] `POST /api/serenatas/requests/:id/cancel` — cancelar
- [ ] Probar todos los endpoints con Postman/Insomnia antes de tocar el frontend

### 1.2 — Página: Lista de serenatas (`/solicitudes`)
- [ ] Mostrar lista de serenatas del coordinador ordenadas por fecha
- [ ] Filtro por estado: Todas / Hoy / Pendientes / Completadas
- [ ] Card de serenata: cliente, dirección, hora, precio, estado
- [ ] Estado visual con colores: pendiente (amarillo), confirmada (verde), completada (gris)
- [ ] Botón "Nueva serenata" que navega al formulario
- [ ] Empty state cuando no hay serenatas
- [ ] Loading skeleton mientras carga
- [ ] Probado en mobile 390px

### 1.3 — Página: Crear serenata (`/solicitudes/nueva`)
- [ ] Formulario en una sola página (no wizard — el coordinador ya sabe los datos)
- [ ] Campos: nombre cliente, teléfono cliente, dirección, comuna, fecha, hora, precio, ocasión, mensaje (opcional)
- [ ] Validación de campos obligatorios antes de enviar
- [ ] Al guardar exitosamente → redirect a la lista
- [ ] Toast de confirmación
- [ ] Probado en mobile 390px

### 1.4 — Página: Detalle de serenata (`/solicitudes/:id`)
- [ ] Ver todos los datos de la serenata
- [ ] Botón "Llamar al cliente" (link `tel:`)
- [ ] Botón "Abrir en Maps" (link a Google Maps con la dirección)
- [ ] Botón "Marcar como completada" — confirma con modal
- [ ] Botón "Cancelar serenata" — confirma con modal
- [ ] Botón "Editar" → navega a formulario de edición
- [ ] Estado de la serenata visible y claro
- [ ] Probado en mobile 390px

### 1.5 — Página: Editar serenata (`/solicitudes/:id/editar`)
- [ ] Mismo formulario que crear, pre-populado con datos actuales
- [ ] Solo editable si el estado es `pending` o `confirmed`
- [ ] Al guardar → redirect al detalle
- [ ] Probado en mobile 390px

**✅ Criterio de éxito Fase 1:** Pablo puede crear una serenata con datos reales, verla en la lista, ver su detalle y marcarla como completada. Flujo completo sin bugs.

---

## FASE 2 — Agenda del Coordinador
**Objetivo:** Pablo ve su semana de un vistazo y sabe exactamente qué tiene cada día.  
**Criterio de éxito:** Pablo abre la app a las 8am y en 10 segundos sabe cuántas serenatas tiene hoy, dónde y a qué hora.

### 2.1 — API: Endpoints de agenda
- [ ] `GET /api/serenatas/requests/my/assigned?date=YYYY-MM-DD` — serenatas de un día específico
- [ ] `GET /api/serenatas/requests/my/assigned?week=YYYY-WW` — serenatas de una semana
- [ ] `GET /api/serenatas/stats/coordinator` — stats: total mes, completadas, pendientes, ingresos estimados

### 2.2 — Página: Agenda (`/agenda`)
- [ ] Vista por día (default: hoy)
- [ ] Navegación prev/next día con fechas visibles
- [ ] Lista de serenatas del día ordenadas por hora
- [ ] Card compacta: hora, cliente, dirección, precio
- [ ] Tap en card → va al detalle
- [ ] Contador en header: "3 serenatas hoy"
- [ ] Empty state para días sin serenatas
- [ ] Probado en mobile 390px

### 2.3 — Dashboard del coordinador (`/inicio`)
- [ ] Limpiar el dashboard actual — queda solo lo que es funcional
- [ ] Greeting con nombre del coordinador
- [ ] Card de hoy: número de serenatas + suma de ingresos estimados
- [ ] Lista corta de próximas serenatas (máx 3) con CTA "Ver agenda"
- [ ] Stats del mes: serenatas completadas, ingresos confirmados
- [ ] Acceso rápido: botón "Nueva serenata"
- [ ] Probado en mobile 390px

**✅ Criterio de éxito Fase 2:** Pablo abre la app, ve el dashboard con sus números del día, navega a la agenda y ve el detalle de cada serenata. Sin cargarse en ningún paso.

---

## FASE 3 — Grupos y Cuadrilla
**Objetivo:** Pablo puede armar el grupo del día y saber quién toca qué.  
**Criterio de éxito:** Pablo crea un grupo para una jornada, agrega músicos con sus instrumentos y lo confirma.

### 3.1 — API: Endpoints de cuadrilla
- [ ] `GET /api/serenatas/coordinators/me/crew` — lista de músicos de la cuadrilla del coordinador
- [ ] `POST /api/serenatas/coordinators/me/crew/invite` — invitar músico por email
- [ ] `POST /api/serenatas/coordinators/me/crew/:id/decision` — aceptar/rechazar solicitud
- [ ] `DELETE /api/serenatas/coordinators/me/crew/:id` — remover músico
- [ ] Probar endpoints antes de tocar frontend

### 3.2 — API: Endpoints de grupos
- [ ] `GET /api/serenatas/groups/my` — grupos del coordinador
- [ ] `POST /api/serenatas/groups` — crear grupo (nombre + fecha)
- [ ] `GET /api/serenatas/groups/:id` — detalle del grupo con miembros
- [ ] `POST /api/serenatas/groups/:id/members` — agregar músico al grupo
- [ ] `DELETE /api/serenatas/groups/:id/members/:musicianId` — quitar músico
- [ ] `POST /api/serenatas/groups/:id/confirm` — confirmar grupo
- [ ] Probar endpoints antes de tocar frontend

### 3.3 — Página: Mi cuadrilla (`/cuadrilla`)
- [ ] Lista de músicos de la cuadrilla agrupados por estado (activos, invitados, pendientes)
- [ ] Card de músico: nombre, instrumento, estado, teléfono
- [ ] Botón "Invitar músico" → formulario con email + instrumento
- [ ] Solicitudes pendientes: botones Aceptar / Rechazar
- [ ] Botón remover músico con confirmación
- [ ] Empty state si la cuadrilla está vacía con CTA para invitar
- [ ] Probado en mobile 390px

### 3.4 — Página: Grupos (`/grupos`)
- [ ] Lista de grupos del coordinador (activos y pasados)
- [ ] Card de grupo: nombre, fecha, N° músicos, estado
- [ ] Botón "Crear grupo" → formulario simple (nombre + fecha)
- [ ] Probado en mobile 390px

### 3.5 — Página: Detalle de grupo (`/grupos/:id`)
- [ ] Nombre del grupo, fecha, estado
- [ ] Lista de músicos en el grupo con su instrumento
- [ ] Botón "Agregar músico" → seleccionar de la cuadrilla activa
- [ ] Botón "Quitar músico" con confirmación
- [ ] Botón "Confirmar grupo" (cuando está listo)
- [ ] Botón "Abrir ruta" → navega a la vista de mapa (Fase 4)
- [ ] Probado en mobile 390px

**✅ Criterio de éxito Fase 3:** Pablo tiene músicos en su cuadrilla, crea un grupo para el jueves, agrega a Pablo (trompeta) y otros 3 músicos, y lo confirma. Todo sin bugs.

---

## FASE 4 — Rutas y Mapa
**Objetivo:** Pablo ve sus serenatas del día en el mapa y optimiza el orden para recorrerlas.  
**Criterio de éxito:** Pablo tiene 4 serenatas en el día, la app le muestra el orden óptimo y puede abrir cada dirección en Google Maps.

### 4.1 — API: Endpoints de rutas
- [ ] `GET /api/serenatas/routes/group/:groupId` — ruta de un grupo
- [ ] `POST /api/serenatas/routes/optimize` — optimizar orden de waypoints
- [ ] `POST /api/serenatas/routes/:id/start` — iniciar ruta
- [ ] `POST /api/serenatas/routes/:id/complete` — completar ruta
- [ ] Confirmar que el algoritmo nearest-neighbor funciona correctamente
- [ ] Probar endpoints antes de tocar frontend

### 4.2 — Geocodificación de direcciones
- [ ] Implementar geocodificación al crear serenata (dirección → lat/lng)
- [ ] Usar la API de Google Maps o Nominatim (OpenStreetMap, gratis)
- [ ] Guardar lat/lng en la tabla de serenatas
- [ ] Fallback si la geocodificación falla: guardar dirección sin coordenadas

### 4.3 — Página: Mapa del día (`/mapa`)
- [ ] Mapa Leaflet cargando las serenatas del día con marcadores numerados
- [ ] Cada marcador muestra: hora + cliente al hacer tap
- [ ] Lista lateral (o inferior en mobile) con el orden de paradas
- [ ] Botón "Optimizar ruta" → reordena los marcadores
- [ ] Tap en una parada → modal con dirección + botón "Abrir en Maps"
- [ ] Botón "Iniciar ruta" del grupo
- [ ] Loading state mientras carga el mapa
- [ ] Fallback si hay serenatas sin coordenadas (listarlas aparte)
- [ ] Probado en mobile 390px

### 4.4 — Integración grupo ↔ mapa
- [ ] Desde el detalle del grupo, el botón "Ver ruta" abre el mapa filtrado para ese grupo
- [ ] La optimización de ruta actualiza el orden en la lista del grupo

**✅ Criterio de éxito Fase 4:** Pablo tiene 3+ serenatas en el día con direcciones reales en Santiago, la app las muestra en el mapa, optimiza el orden y puede abrir cada una en Google Maps con un tap.

---

## FASE 5 — Músico (Experiencia completa)
**Objetivo:** Pablo como músico puede recibir invitaciones, aceptarlas y ver su agenda del día.  
**Criterio de éxito:** Un músico de la cuadrilla de Pablo recibe una invitación en su celular, la acepta y ve la serenata en su agenda.

### 5.1 — API: Endpoints del músico
- [ ] `GET /api/serenatas/musicians/me/invitations` — invitaciones pendientes del músico
- [ ] `POST /api/serenatas/${serenataId}/lineup/respond` — aceptar/rechazar invitación
- [ ] `GET /api/serenatas/musicians/me/profile` — perfil del músico
- [ ] `PATCH /api/serenatas/musicians/me/profile` — actualizar perfil
- [ ] `PATCH /api/serenatas/musicians/me/availability` — cambiar disponibilidad
- [ ] Probar endpoints

### 5.2 — Página: Invitaciones del músico (`/invitaciones`)
- [ ] Lista de invitaciones pendientes con detalle de la serenata (fecha, hora, dirección, precio)
- [ ] Botón Aceptar / Rechazar en cada invitación
- [ ] Al aceptar → la serenata aparece en la agenda del músico
- [ ] Historial de invitaciones respondidas
- [ ] Badge con contador en la navegación cuando hay invitaciones nuevas
- [ ] Probado en mobile 390px

### 5.3 — Página: Agenda del músico (`/agenda`)
- [ ] Igual que la agenda del coordinador pero con las serenatas donde fue aceptado
- [ ] Mostrar: fecha, hora, dirección, precio de la serenata
- [ ] Botón "Abrir en Maps" para ir a la dirección

### 5.4 — Página: Perfil del músico (`/perfil`)
- [ ] Datos personales: nombre, email, teléfono
- [ ] Instrumento(s) que toca
- [ ] Toggle de disponibilidad general
- [ ] Toggle de "Disponible ahora" (para urgencias del día)
- [ ] Edición de perfil en una sola página (no wizard)

### 5.5 — Disponibilidad en tiempo real
- [ ] El coordinador, al armar un grupo, puede ver quién está disponible ahora
- [ ] Indicador visual en la lista de músicos de la cuadrilla

**✅ Criterio de éxito Fase 5:** El músico Pablo recibe la invitación del coordinador Pablo, la acepta desde su celular, y la ve en su agenda con la dirección correcta.

---

## FASE 6 — Cliente (Solicitud y Seguimiento)
**Objetivo:** Un cliente puede pedir una serenata desde la app y ver en qué estado está.  
**Criterio de éxito:** Un amigo de Pablo pide una serenata para el cumpleaños de su pareja, la solicitud le llega al coordinador y puede hacer seguimiento.

### 6.1 — API: Endpoints del cliente
- [x] `POST /api/serenatas/requests` — crear solicitud como cliente
- [x] `GET /api/serenatas/requests?mine=true` — mis solicitudes (equivalente a listado sin `assignedToMe`; solo cliente)
- [x] `GET /api/serenatas/requests/:id` — detalle + estado
- [x] `GET /api/serenatas/coordinators/available` — coordinadores en zona (misma lógica que `POST .../coordinators/match`; query: `comuna`, `date`, `time`, `budget`)
- [ ] Probar endpoints (manual / QA)

### 6.2 — Página: Solicitar serenata (`/solicitar`)
- [x] Wizard de 3 pasos:
  - Paso 1: Para quién + ocasión
  - Paso 2: Cuándo, dónde, duración/canciones y presupuesto estimado
  - Paso 3: Elegir coordinador (o enviar sin uno) y confirmar solicitud
- [x] Validación en cada paso
- [x] Al confirmar → solicitud creada y notificación al coordinador (si aplica en API)
- [x] Redirect a página de seguimiento
- [ ] Probado en mobile 390px

### 6.3 — Página: Mis serenatas (`/mis-serenatas`)
- [x] Lista de solicitudes del cliente con estado claro
- [x] Card: para quién, fecha, estado, coordinador asignado (si ya hay uno)
- [x] Tap → va al detalle de seguimiento
- [x] Empty state con CTA para pedir primera serenata

### 6.4 — Página: Seguimiento (`/tracking/:id`)
- [x] Estado actual de la serenata con timeline visual
- [x] Datos del coordinador asignado + botón llamar
- [x] Dirección y fecha confirmadas
- [x] Precio acordado
- [ ] Probado en mobile 390px

**✅ Criterio de éxito Fase 6:** El cliente crea una solicitud, el coordinador la ve en su panel, la acepta, la asigna al grupo, y el cliente puede ver quién es su coordinador.

---

## FASE 7 — Notificaciones
**Objetivo:** Las personas correctas reciben aviso cuando algo cambia.  
**Criterio de éxito:** El músico recibe notificación cuando lo invitan y el coordinador cuando llega una solicitud nueva.

### 7.1 — Sistema de notificaciones in-app
- [x] `GET /api/serenatas/notifications` — listar notificaciones
- [x] `PATCH /api/serenatas/notifications/:id/read` — marcar como leída
- [x] `GET /api/serenatas/notifications/unread-count` — contador
- [x] Polling cada 30 segundos (`SerenatasNotificationBadgeProvider` usa solo `unread-count`)
- [x] Badge en header y sidebar con contador de no leídas
- [x] Página `/notificaciones` con lista completa
- [x] Corrección API: `notifySafe` insertaba columna inexistente `data`; ahora persiste filas válidas (reintento sin `serenata_id` si FK legacy falla)

### 7.2 — Triggers de notificaciones
- [x] Coordinador: nueva solicitud de cliente en su zona (`notifySafe` en `POST /requests` si hay coordinador)
- [x] Músico: invitación a lineup de una serenata
- [x] Cuadrilla: solicitud / invitación / respuesta coordinador↔músico (`notifySafe` en rutas `/crew` y membresías)
- [x] Cliente: coordinador aceptó su solicitud / pago pendiente
- [x] Cliente: serenata confirmada con fecha y precio
- [x] Coordinador: músico rechazó invitación de lineup

### 7.3 — Push Notifications (PWA)
- [x] Service Worker — manejador `push` alineado con payload `title`/`body`/`url` del API; caché `v2` para forzar actualización
- [x] Solicitar permiso y suscripción al entrar al panel (`SerenatasPushSetup` + `useSerenatasPushNotifications`)
- [x] API `GET/POST /api/serenatas/push/*` (misma tabla VAPID que SimpleAgenda)
- [x] Push al invitar músico a lineup; push a coordinador en nueva solicitud y al responder invitación (aceptar/rechazar)
- [ ] Probar en dispositivo real iOS y Android (requiere PWA instalada / permisos)

**✅ Criterio de éxito Fase 7:** Pablo recibe una notificación push en su celular cuando un músico rechazó una invitación. El músico recibe push cuando lo invitan.

---

## FASE 8 — Modelo de Negocio
**Objetivo:** SimpleSerenatas genera ingresos reales.  
**Criterio de éxito:** Un coordinador nuevo se registra y paga su suscripción pro correctamente.

> Nota de modelo vigente (Mayo 2026): el embudo parte en **músico** y luego activa **coordinador por suscripción**.
> - Free activa coordinador sin costo mensual.
> - Serenatas propias (`self_captured`) sin comisión.
> - Leads de plataforma (`platform_*`) con comisión 8% + IVA.
> - Pro/Premium agregan visibilidad y soporte.

### 8.1 — Definir modelo de precios
- [x] **Free:** Coordinador opera con clientes propios; API excluye leads `platform_*` del listado asignado.
- [x] **Pro $9.990/mes** (`COORDINATOR_PLAN_PRICES_CLP`); Premium placeholder $14.990.
- [x] **Comisión 8% + IVA** solo sobre `platform_lead` / `platform_assigned`.
- [x] Músico / cliente: sin cobro en esta fase.

### 8.2 — MercadoPago: Suscripciones
- [x] Credenciales MP en `.env` del API.
- [x] `POST /api/serenatas/payments/subscription/checkout`
- [x] `POST /api/serenatas/payments/subscription/mercadopago/confirm`
- [x] Webhooks MP en router serenatas
- [ ] QA sandbox end-to-end antes de producción

### 8.3 — Página: Suscripción (`/suscripcion`)
- [x] Plan actual en cabecera
- [x] Cards Free / Pro / Premium alineadas al negocio
- [x] Flujo de pago MercadoPago (o simulación si MP no está)
- [x] Confirmación al volver con `payment_id`
- [x] Errores con toast
- [ ] Probado en mobile 390px

### 8.4 — Control de acceso por plan
- [x] Free: no ve leads plataforma en API
- [x] Pro/Premium vigente: leads + match + geo
- [x] Banner CTA upgrade en `/solicitudes`

**✅ Criterio de éxito Fase 8:** Un coordinador nuevo se registra gratis, trabaja con sus propios clientes, luego paga Pro con MercadoPago y empieza a ver solicitudes de clientes de la plataforma.

---

## FASE 9 — SEO y Captación de Clientes
**Objetivo:** Los clientes llegan solos a través de Google.  
**Criterio de éxito:** La página de mariachis en Santiago aparece en los primeros resultados para búsquedas locales.

### 9.1 — Landing page pública
- [x] `/` — Landing general: "Contrata mariachis a domicilio en Santiago"
- [x] Precios visibles (desde $50.000), con texto claro que el valor final lo confirma el coordinador
- [x] Formulario rápido (comuna opcional → registro cliente con `next=/solicitar`)
- [ ] Fotos/videos (si se consiguen)
- [ ] Testimonios (3 reales mínimo antes de publicar; hoy hay texto de ejemplo explícito)
- [x] CTA principal: "Solicitar ahora"

### 9.2 — Páginas de ciudad/comuna
- [x] `/mariachis-providencia`
- [x] `/mariachis-las-condes`
- [x] `/mariachis-maipu`
- [x] `/mariachis-la-florida`
- [x] `/mariachis-nunoa`
- [x] Cada página con contenido único (no copiar/pegar)
- [x] Schema.org LocalBusiness en cada página

### 9.3 — Metadata y SEO técnico
- [x] Títulos únicos por página con keyword principal
- [x] Meta descriptions revisadas (~150 caracteres donde aplica)
- [x] Open Graph para compartir en WhatsApp/redes (`/` y páginas comuna / profesionales)
- [x] `sitemap.xml` generado automáticamente
- [x] `robots.txt` correctamente configurado
- [ ] Verificación en Google Search Console (meta tag por `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` ya soportado)

### 9.4 — Rendimiento
- [ ] Lighthouse score > 90 en mobile
- [ ] Imágenes optimizadas (WebP, lazy loading)
- [ ] Core Web Vitals en verde

**✅ Criterio de éxito Fase 9:** La página `/mariachis-maipu` aparece en Google para la búsqueda "mariachis maipú" dentro de los primeros 30 días de indexación.

---

## FASE 10 — Deploy y Producción
**Objetivo:** SimpleSerenatas está en vivo y accesible para usuarios reales.  
**Criterio de éxito:** Pablo puede registrarse desde su celular en producción y crear su primera serenata real.

### 10.1 — Configuración del servidor (Coolify)
- [ ] Crear proyecto `simpleserenatas` en Coolify
- [ ] Configurar variables de entorno de producción
- [ ] Configurar dominio `simpleserenatas.app` (o el que corresponda)
- [ ] SSL automático via Let's Encrypt
- [ ] Healthcheck configurado

### 10.2 — Base de datos de producción
- [ ] PostgreSQL en producción con backups automáticos diarios
- [ ] Aplicar todas las migraciones en producción
- [ ] Variables de conexión seguras (no en código)

### 10.3 — API de producción
- [ ] Deploy del API Hono en Coolify
- [ ] Configurar CORS para el dominio de producción
- [ ] MercadoPago en modo live (no sandbox)
- [ ] Google Maps API Key de producción con restricción de dominio

### 10.4 — Frontend de producción
- [ ] Build optimizado (`next build`)
- [ ] Deploy en Coolify con el Dockerfile existente
- [ ] Confirmar que el Service Worker funciona en HTTPS
- [ ] Confirmar que el manifest PWA está correcto (instalable)

### 10.5 — Monitoreo básico
- [ ] Configurar alertas si el API cae
- [ ] Logs accesibles desde Coolify
- [ ] Error tracking básico (mínimo `console.error` a un log externo)

### 10.6 — Testing previo al lanzamiento
- [ ] Pablo crea cuenta en producción
- [ ] Pablo crea una serenata con datos reales
- [ ] Pablo invita a un músico real
- [ ] El músico recibe la notificación y acepta
- [ ] Pablo ve el grupo y la ruta
- [ ] Flujo completo sin errores

**✅ Criterio de éxito Fase 10:** `simpleserenatas.app` está en vivo, Pablo tiene cuenta, y al menos 1 serenata real fue creada y completada en producción.

---

## FASE 11 — Lanzamiento con Pablo y su red
**Objetivo:** Los primeros 5 coordinadores reales usan la plataforma regularmente.  
**Criterio de éxito:** 5 coordinadores con cuenta activa, al menos 10 serenatas completadas en total en el primer mes.

### 11.1 — Onboarding de Pablo
- [ ] Sesión presencial (o videollamada) para mostrarle la app
- [ ] Pablo crea su perfil completo de coordinador
- [ ] Pablo invita a los músicos de su cuadrilla actual
- [ ] Pablo carga sus serenatas de la semana
- [ ] Feedback de Pablo documentado

### 11.2 — Incorporar otros coordinadores
- [ ] Identificar 4 coordinadores más del círculo de Pablo
- [ ] Onboarding individual para cada uno
- [ ] Documentar sus dolores específicos (para el backlog)
- [ ] Crear grupo de WhatsApp de feedback (early adopters)

### 11.3 — Iteración rápida (2 semanas)
- [ ] Listar los bugs reportados por los coordinadores
- [ ] Priorizar por frecuencia e impacto
- [ ] Resolver los 5 bugs más críticos
- [ ] Re-testear con Pablo

### 11.4 — Métricas de la primera quincena
- [ ] Número de coordinadores registrados
- [ ] Número de serenatas creadas
- [ ] Número de serenatas completadas
- [ ] Número de músicos en cuadrillas
- [ ] Retención: cuántos volvieron el segundo día

**✅ Criterio de éxito Fase 11:** 5 coordinadores usan la app, 10+ serenatas completadas, al menos 1 coordinador la recomienda a otro sin que se lo pidas.

---

## FASE 12 — Crecimiento y Features Avanzados
**Solo empezar esta fase después de cumplir el criterio de éxito de la Fase 11.**

### 12.1 — Reviews y reputación
- [ ] Cliente califica al coordinador (1-5 estrellas + comentario)
- [ ] Coordinador califica al músico
- [ ] Ratings visibles en perfiles públicos
- [ ] Reviews moderadas antes de publicarse

### 12.2 — Búsqueda pública de mariachis
- [ ] Página pública: `/buscar-mariachis?comuna=Maipú`
- [ ] Resultados con precio, rating, disponibilidad
- [ ] Formulario de contacto directo al coordinador

### 12.3 — Chat en tiempo real
- [ ] Chat coordinador ↔ cliente
- [ ] Chat coordinador ↔ músico
- [ ] Notificación de mensaje nuevo

### 12.4 — Pagos del cliente al coordinador
- [ ] El cliente paga a través de la plataforma (escrow)
- [ ] Simple libera el pago al coordinador tras la serenata
- [ ] Reembolso si se cancela con antelación

### 12.5 — App nativa (Capacitor)
- [ ] Wrap de la PWA con Capacitor para iOS y Android
- [ ] Publicar en App Store y Google Play
- [ ] Push notifications nativas

### 12.6 — Expansión a regiones
- [ ] Onboarding de coordinadores en Valparaíso
- [ ] Onboarding en Concepción
- [ ] Páginas SEO por ciudad

---

## Backlog (fuera del plan principal)

Estas features no tienen fecha asignada. Se incorporan cuando haya usuarios reales pidiéndolas:

- Integración con Google Calendar del coordinador
- WhatsApp Business API para notificaciones
- Panel de administración para SimpleSerenatas
- Sistema de referidos entre coordinadores
- Facturación automática
- Integración con Chileautos/Yapo (no aplica — esto es de SimpleAutos)
- App desktop

---

## Checklist de calidad por página

Antes de marcar cualquier página como terminada, verificar:

- [ ] Funciona en Chrome mobile 390px sin scroll horizontal
- [ ] Funciona en Safari iOS (prueba en dispositivo real o Simulator)
- [ ] Los estados de carga tienen skeleton o spinner
- [ ] Los errores del API muestran mensaje legible (no "undefined")
- [ ] Los formularios validan antes de enviar
- [ ] Las acciones destructivas piden confirmación
- [ ] Los toasts de éxito/error aparecen y desaparecen solos
- [ ] No hay errores en la consola del navegador
- [ ] No hay `console.log` de debug en producción

---

## Decisiones ya tomadas (no re-discutir)

| Tema | Decisión |
|------|----------|
| Framework | Next.js 16 con App Router |
| Estilo | Tailwind CSS v4 |
| API | Hono en el monorepo |
| ORM | Drizzle + PostgreSQL |
| Auth | Sesiones propias (no NextAuth) |
| Mapas | Leaflet + OpenStreetMap (gratis) |
| Pagos | MercadoPago |
| Deploy | VPS propio + Coolify |
| Color principal | `#E11D48` (rosa) |
| Enfoque | Mobile-first, coordinador primero |

---

## Notas finales

**Regla de oro:** Si una tarea tarda más de 4 horas, es demasiado grande. Partirla en dos.

**Señal de alerta de scope creep:** Si estás a punto de crear una página que no está en este plan, escríbela en el backlog y sigue con la fase actual.

**Cuándo pedir feedback a Pablo:** Al terminar cada fase. No antes.

**Stack de comunicación con early adopters:** Un grupo de WhatsApp. Nada más complicado.

---

*Última actualización: Mayo 2026*  
*Próxima revisión: Al completar Fase 3*