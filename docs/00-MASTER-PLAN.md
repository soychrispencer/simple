# Simple Ecosystem - Master Plan

**Autor:** Christian  
**Fecha Inicio:** 11 de noviembre de 2025  
**Estado:** En Implementación

---

## 🎯 Visión del Proyecto

Crear un ecosistema unificado de verticales especializadas (SimpleAutos, SimplePropiedades, SimpleTiendas, etc.) que compartan:
- Diseño y experiencia de usuario consistente
- Sistema de autenticación unificado
- Backend en inglés profesional y escalable
- Componentes UI reutilizables
- CRM empresarial diferenciado por vertical
- Sistema de pagos con MercadoPago

**Valores Fundamentales:**
- ✨ Modernidad
- 🎨 Simplicidad y amigabilidad
- 🧹 Limpieza y orden en el código
- 🔗 Conexión e integración entre verticales
- 📦 Reutilización y DRY (Don't Repeat Yourself)

---

## 🧭 Principio Central (Cuenta única, verticales independientes)

- **Autenticación única:** todos los usuarios viven en `auth.users`/`public.profiles`. El onboarding ocurre una sola vez y sirve para cualquier vertical o el CRM.
- **Verticales declaradas en BD:** la tabla `public.verticals` define cada negocio (`autos`, `properties`, `stores`, `food`). Cualquier feature nueva debe registrar primero su vertical aquí y en `@simple/config`.
- **Empresas y roles por vertical:** `public.companies` + `public.company_users` permiten que un mismo usuario pertenezca a múltiples empresas, incluso con datos distintos por vertical (automotriz vs inmobiliaria). Los permisos (`owner | admin | member`) se controlan desde esta tabla.
- **Listados genéricos + extensiones:** `public.listings` referencia `vertical_id`, `company_id` y `user_id`. Las tablas específicas (`listings_vehicles`, `listings_properties`, `listings_food`, etc.) almacenan atributos de dominio sin duplicar columnas comunes.
- **Panel modular universal:** el “Panel Simple” actúa como contenedor. Cada vertical, además del CRM, inyecta sus módulos (sidebar, KPIs, tablas) usando los contextos compartidos (`@simple/ui` + `@simple/auth`).
- **Sin fricción entre verticales:** un usuario puede operar en Autos con una empresa y, al mismo tiempo, crear otra empresa inmobiliaria sin mezclar inventarios, pagos o métricas.

---

## 📁 Estructura del Ecosistema

```
Simple/
├── docs/                              # 📚 Documentación consolidada
│   ├── 00-MASTER-PLAN.md             # Este archivo - Plan maestro
│   ├── 01-ARCHITECTURE.md            # Arquitectura técnica y multi-vertical
│   ├── 02-MIGRATION-GUIDE.md         # Guía paso a paso de migración
│   ├── 03-BACKEND.md                 # Stack, esquema y operaciones
│   ├── 04-COMPONENT-GUIDE.md         # Header/Footer compartidos
│   ├── 05-DEVELOPMENT-GUIDE.md       # Guía para desarrolladores
│   ├── 06-ROADMAP.md                 # Roadmap y siguientes pasos
│   └── 07-LOGO-SYSTEM.md             # Sistema de marca y uso de logos
│
├── apps/                              # 🚀 Verticales (aplicaciones)
│   ├── simpleautos/                   # Vertical de vehículos
│   │   ├── src/
│   │   │   ├── app/                   # App Router de Next.js
│   │   │   ├── components/            # Componentes específicos de autos
│   │   │   ├── hooks/                 # Hooks específicos de autos
│   │   │   ├── lib/                   # Utilidades específicas de autos
│   │   │   └── config/                # Configuración de la vertical
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── simplepropiedades/             # Vertical de propiedades
│       ├── src/
│       │   ├── app/
│       │   ├── components/            # Componentes específicos de propiedades
│       │   ├── hooks/
│       │   ├── lib/
│       │   └── config/
│       ├── public/
│       ├── package.json
│       └── next.config.ts
│
├── packages/                          # 📦 Código compartido
│   ├── ui/                            # Componentes UI compartidos
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/           # Header, Footer, Navigation
│   │   │   │   ├── forms/            # Input, Select, Button, Form
│   │   │   │   ├── cards/            # ListingCard genérica
│   │   │   │   ├── modals/           # AuthModal, ConfirmModal
│   │   │   │   ├── panel/            # Panel de usuario genérico
│   │   │   │   └── toast/            # Sistema de notificaciones
│   │   │   ├── styles/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── config/                        # Configuraciones compartidas
│   │   ├── src/
│   │   │   ├── theme.ts              # Sistema de temas
│   │   │   ├── colors.ts             # Paletas por vertical
│   │   │   ├── constants.ts          # Constantes globales
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── auth/                          # Sistema de autenticación
│   │   ├── src/
│   │   │   ├── context/              # AuthContext
│   │   │   ├── hooks/                # useAuth, useSession
│   │   │   ├── utils/                # Validación, helpers
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── database/                      # Tipos y cliente de Supabase
│   │   ├── src/
│   │   │   ├── client/               # Clientes de Supabase
│   │   │   ├── types/                # Tipos generados
│   │   │   ├── queries/              # Queries reutilizables
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── payments/                      # Sistema de pagos
│   │   ├── src/
│   │   │   ├── mercadopago/          # Integración MercadoPago
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── utils/                         # Utilidades compartidas
│       ├── src/
│       │   ├── format.ts             # Formateo de datos
│       │   ├── validation.ts         # Validaciones Zod
│       │   ├── logger.ts             # Sistema de logs
│       │   └── index.ts
│       └── package.json
│
├── backend/                           # 🔧 Backend unificado (inglés)
│   ├── supabase/
│   │   ├── migrations/               # Migraciones SQL
│   │   ├── functions/                # Edge Functions
│   │   └── config.toml
│   │
│   ├── database/
│   │   ├── schema/                   # Esquemas por módulo
│   │   │   ├── auth.sql              # Tablas de autenticación
│   │   │   ├── profiles.sql          # Perfiles de usuario
│   │   │   ├── listings.sql          # Listados genéricos
│   │   │   ├── vehicles.sql          # Tablas específicas de vehículos
│   │   │   ├── properties.sql        # Tablas específicas de propiedades
│   │   │   ├── payments.sql          # Sistema de pagos
│   │   │   ├── subscriptions.sql     # Suscripciones del CRM
│   │   │   ├── crm.sql               # Tablas del CRM
│   │   │   └── storage.sql           # Configuración de storage
│   │   │
│   │   ├── policies/                 # Row Level Security
│   │   │   ├── auth-policies.sql
│   │   │   ├── listing-policies.sql
│   │   │   └── storage-policies.sql
│   │   │
│   │   ├── functions/                # Funciones de base de datos
│   │   └── triggers/                 # Triggers
│   │
│   └── api/                          # Documentación de API
│       ├── auth.md
│       ├── listings.md
│       ├── payments.md
│       └── crm.md
│
├── scripts/                           # 🛠️ Scripts de utilidad
│   ├── setup/                        # Scripts de setup inicial
│   ├── migration/                    # Scripts de migración
│   └── maintenance/                  # Scripts de mantenimiento
│
├── package.json                      # Root package.json (workspaces)
├── turbo.json                        # Configuración de Turborepo (opcional)
└── README.md                         # README del ecosistema

```

---

## 🎨 Sistema de Identidad Visual por Vertical

### SimpleAutos
- **Color Principal:** `#FFB600` (Amarillo/Dorado vibrante)
- **Dominio:** `simpleautos.app`
- **Tema:** Velocidad, potencia, modernidad

### SimplePropiedades
- **Color Principal:** `#009BA3` (Turquesa neón)
- **Dominio:** `simplepropiedades.app`
- **Tema:** Estabilidad, crecimiento, hogar

### SimpleTiendas (futuro)
- **Color Principal:** `#7A5CFF` (Violeta tech)
- **Dominio:** `simpletiendas.app`
- **Tema:** Creatividad, comercio, diversidad

**Elementos Compartidos:**
- Tipografía: Poppins
- Border radius: Sistema consistente (xs, sm, md, lg, xl)
- Espaciado: Sistema de 8px base
- Dark mode: Automático en todas las verticales
- Colores de fondo, texto y bordes idénticos (solo cambia el color primario)

---

## 📚 Documentación Activa (ordenada)
1. `00-MASTER-PLAN.md` — visión, branding, fases.
2. `01-ARCHITECTURE.md` — monorepo, packages y modelo multi-vertical.
3. `02-MIGRATION-GUIDE.md` — guía técnica para mover features/DB.
4. `03-BACKEND.md` — stack, esquema, auditoría y operaciones.
5. `04-COMPONENT-GUIDE.md` — Header/Footer compartidos.
6. `05-DEVELOPMENT-GUIDE.md` — setup local, convenciones y APIs.
7. `06-ROADMAP.md` — hitos próximos con fechas.
8. `07-LOGO-SYSTEM.md` — identidad visual y uso de isotipos.

> Todos los archivos legacy (auditorías, guías duplicadas, resúmenes de fase) se consolidaron aquí para reducir ruido.

---

## 🔄 Fases de Implementación

### **FASE 1: Setup y Documentación** ✅ (En curso)
1. Crear estructura de carpetas completa
2. Generar toda la documentación en `/docs`
3. Setup de monorepo con workspaces
4. Configurar Git y .gitignore adecuados

### **FASE 2: Extracción de Componentes Compartidos**
**Estado:** ✅ Completada (noviembre 2025)

**Entregables clave:**
- `@simple/config`, `@simple/ui`, `@simple/auth` publicados en el monorepo.
- 11 componentes compartidos (Layout, Forms, Auth, Feedback, UI) con ~2.7k líneas reutilizables.
- Header (700+ líneas) y Footer (450+ líneas) totalmente adaptables por vertical.
- AuthModal + ToastProvider compartidos y documentados.
- SimpleAutos migrado a los nuevos packages sin breaking changes.
- Documentación unificada en `04-COMPONENT-GUIDE.md` + esta sección.

**Métrica resumen:** 27 archivos actualizados en SimpleAutos, 17 archivos nuevos en packages, 0 errores de compilación.

### **FASE 3: Backend Unificado**
1. Diseñar schema de base de datos en inglés
2. Migrar tablas existentes sin perder datos
3. Crear Row Level Security policies

### **FASE 4: Nuevas Verticales**
- Replicar la base en SimplePropiedades, SimpleTiendas y SimpleFood con los componentes compartidos.
- Activar vertical switcher + contexto multiempresa descrito en `01-ARCHITECTURE.md`.
- Ajustar operaciones (pagos, CRM, métricas) para cada dominio.
4. Documentar todos los endpoints de API
5. Setup de storage policies

### **FASE 4: Migración de SimpleAutos**
1. Mover SimpleAutos a `apps/simpleautos`
2. Reemplazar imports a packages compartidos
3. Adaptar componentes específicos
4. Migrar configuración y variables de entorno
5. Testing completo

### **FASE 5: Creación de SimplePropiedades**
1. Clonar estructura de SimpleAutos
2. Adaptar tipos específicos de propiedades
3. Configurar tema verde
4. Crear componentes específicos de propiedades
5. Conectar con backend compartido

### **FASE 6: Sistema CRM**
1. Diseñar modelo de datos del CRM
2. Crear panel de administración avanzado
3. Sistema de suscripciones con MercadoPago
4. Funcionalidades específicas por vertical
5. Analytics y reportes

### **FASE 7: Optimización y Deployment**
1. Optimización de rendimiento
2. SEO para cada vertical
3. Setup de CI/CD
4. Deployment en Vercel/otros
5. Monitoreo y analytics

---

## 🔐 Backend en Inglés - Nomenclatura Estándar

### Tablas Principales
```sql
-- Autenticación (Supabase Auth nativo)
auth.users

-- Perfiles
public.profiles
  - id (uuid, FK to auth.users)
  - username (text)
  - full_name (text)
  - vertical (enum: 'autos', 'properties', 'stores')
  - account_type (enum: 'individual', 'business')
  - created_at (timestamp)
  - updated_at (timestamp)

-- Listados Genéricos
public.listings
  - id (uuid)
  - user_id (uuid, FK to profiles)
  - vertical (enum)
  - listing_type (enum: 'sale', 'rent', 'auction')
  - status (enum: 'draft', 'active', 'sold', 'archived')
  - title (text)
  - description (text)
  - price (numeric)
  - currency (text)
  - location_country (text)
  - location_city (text)
  - views_count (int)
  - is_featured (boolean)
  - featured_until (timestamp)
  - created_at (timestamp)
  - updated_at (timestamp)

-- Vehículos (extensión de listings)
public.vehicles
  - listing_id (uuid, FK to listings)
  - make (text)
  - model (text)
  - year (int)
  - condition (enum: 'new', 'used')
  - mileage (int)
  - fuel_type (text)
  - transmission (text)
  - body_type (text)
  - doors (int)
  - seats (int)
  - color_exterior (text)
  - color_interior (text)
  - vin (text)

-- Propiedades (extensión de listings)
public.properties
  - listing_id (uuid, FK to listings)
  - property_type (enum: 'house', 'apartment', 'commercial', 'land')
  - bedrooms (int)
  - bathrooms (numeric)
  - area_size (numeric)
  - area_unit (enum: 'm2', 'ft2')
  - lot_size (numeric)
  - year_built (int)
  - parking_spaces (int)

-- Imágenes
public.listing_images
  - id (uuid)
  - listing_id (uuid, FK to listings)
  - storage_path (text)
  - display_order (int)
  - is_primary (boolean)

-- Pagos
public.payments
  - id (uuid)
  - user_id (uuid, FK to profiles)
  - listing_id (uuid, FK to listings, nullable)
  - payment_type (enum: 'boost', 'subscription', 'featured')
  - amount (numeric)
  - currency (text)
  - provider (text: 'mercadopago')
  - provider_payment_id (text)
  - status (enum: 'pending', 'approved', 'failed', 'refunded')
  - created_at (timestamp)

-- Suscripciones CRM
public.subscriptions
  - id (uuid)
  - user_id (uuid, FK to auth.users)
  - plan_id (uuid, FK to subscription_plans)
  - status (enum/text: 'active', 'cancelled', 'expired')
  - current_period_start (timestamp)
  - current_period_end (timestamp)
  - cancel_at_period_end (boolean)

-- Notificaciones
public.notifications
  - id (uuid)
  - user_id (uuid, FK to profiles)
  - type (text)
  - title (text)
  - message (text)
  - is_read (boolean)
  - created_at (timestamp)
```

---

## 🎯 Componentes Compartidos Prioritarios

### Layout Components (`@simple/ui`)
- `Header` - Con soporte para color primario por vertical
- `Footer` - Idéntico en todas las verticales
- `Navigation` - Menú responsive
- `Sidebar` - Para panel de usuario

### Form Components (`@simple/ui`)
- `Input` - Input genérico con validación
- `Select` - Select con estilos consistentes
- `Textarea` - Textarea estilizado
- `Button` - Botones con variantes
- `ImageUpload` - Upload de imágenes con preview
- `Form` - Wrapper de formulario con React Hook Form

### Card Components (`@simple/ui`)
- `ListingCard` - Tarjeta genérica adaptable (autos, propiedades, etc.)
- `ProfileCard` - Tarjeta de perfil
- `StatsCard` - Tarjeta de estadísticas

### Modal Components (`@simple/ui`)
- `AuthModal` - Login/Register unificado
- `ConfirmModal` - Modal de confirmación
- `ImageModal` - Galería de imágenes

### Panel Components (`@simple/ui`)
- `PanelLayout` - Layout del panel de usuario
- `PanelSidebar` - Navegación del panel
- `ListingTable` - Tabla de listados
- `AnalyticsDashboard` - Dashboard de métricas

---

## 🚀 CRM Empresarial

### Funcionalidades Base (Todas las verticales)
- Dashboard con métricas clave
- Gestión avanzada de listados
- Analíticas y reportes
- Gestión de clientes/leads
- Calendario y recordatorios
- Sistema de tags y categorías
- Export de datos (CSV, PDF)

### Funcionalidades Específicas por Vertical

**SimpleAutos CRM:**
- Inventario de vehículos
- Gestión de test drives
- Seguimiento de servicios
- Alertas de vencimiento (seguros, revisiones)

**SimplePropiedades CRM:**
- Tours virtuales programados
- Gestión de contratos de arriendo
- Seguimiento de mantenimiento de propiedades
- Base de datos de inquilinos

### Planes de Suscripción
- **Gratis:** 1 publicación activa, sin estadísticas, vigencia limitada.
- **Pro:** 10 publicaciones activas, estadísticas, página pública, soporte prioritario. **$9.990 CLP / mes**
- **Empresa:** ilimitado (o alto límite), branding, multiusuario, WhatsApp Business, estadísticas. **desde $39.990 CLP / mes**

---

## 📊 Métricas de Éxito

- ✅ 0% de código perdido en la migración
- ✅ >80% de componentes compartidos entre verticales
- ✅ <2 segundos de tiempo de carga inicial
- ✅ 100% de cobertura de tipos TypeScript
- ✅ Backend 100% en inglés y documentado
- ✅ Tests E2E en funcionalidades críticas

---

## 🔧 Stack Tecnológico

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **State:** React Context + Server Components
- **Forms:** React Hook Form + Zod
- **Monorepo:** npm workspaces (o Turborepo)

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Payments:** MercadoPago
- **Email:** Nodemailer
- **Logs:** Winston

### DevOps
- **Hosting:** Vercel (apps) + Supabase Cloud (backend)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry
- **Analytics:** Google Analytics / Vercel Analytics

---

## 📝 Principios de Desarrollo

1. **No Duplicar Código:** Si se usa en 2+ verticales, va a packages/
2. **Backend en Inglés:** Toda la base de datos, API y variables en inglés
3. **Frontend en Español:** UI y contenido de cara al usuario en español
4. **Tipos Estrictos:** TypeScript strict mode activado
5. **Documentación Viva:** Actualizar docs/ con cada cambio importante
6. **Git Convencional:** Commits descriptivos con conventional commits
7. **Testing:** Tests unitarios para lógica crítica
8. **Performance First:** Lighthouse score >90 en todas las verticales

---

## 🔄 Próximos Pasos Inmediatos

1. **PanelShell + VerticalContext:** consolidar en `@simple/ui` el layout del panel y exponer un contexto que entregue `{ profile, companies, verticalProfile, permissions }` consumiendo `profiles`, `company_users` y `verticals`.
2. **Manifiesto de módulos por vertical:** describir en cada app (Autos, Propiedades, CRM) los módulos que el panel debe renderizar (KPIs, listas, facturación) y alimentar automáticamente al `PanelSidebar`.
3. **Listados unificados:** migrar SimpleAutos a consumir `public.listings` + `listings_vehicles` y SimplePropiedades a mantener `listings`/`listings_properties`, asegurando que siempre se use `vertical_id` + `company_id`.
4. **Onboarding multiempresa:** documentar y construir el flujo para crear/seleccionar empresas por vertical usando `public.companies` + `company_users` antes de entrar al panel.
5. **Documentación viva:** actualizar continuamente `01-ARCHITECTURE.md`, `03-BACKEND.md` y `06-ROADMAP.md` con el estado real después de cada iteración de las tareas anteriores.
6. **Servicio “Vende por mí” (SimpleAutos):** diseñar el flujo de compra, operación interna y difusión en redes sociales (primero Meta: Facebook/Instagram) con trazabilidad y moderación desde el panel.

---

**Última Actualización:** 30 de noviembre de 2025  
**Próxima Revisión:** Tras finalizar la iniciativa PanelShell + VerticalContext

---

## 📣 Servicio “Vende por mí” (Venta asistida + difusión)

**Idea:** ofrecer un plan pagado donde SimpleAutos se encarga de producir el contenido (fotos/video) y operar la difusión, además de publicar el aviso en el portal.

**Principio clave:** SimpleAutos es la **fuente de verdad** (listing + activos). Las redes sociales son **canales de distribución**.

### Activos (contenido)
- **Fotos:** base del listing y del portal.
- **Video:** recomendado (formato vertical para Reels/TikTok), pero tratado como **video de presentación del vehículo**, no como “flujo social”.
- **Enlaces sociales:** si existe un Reel/TikTok publicado, se guarda como URL asociada al servicio/campaña (no como dependencia del listing).

### Flujo operativo (MVP recomendado)
1. Usuario compra el plan (MercadoPago).
2. Se crea una **orden de servicio** en el panel admin (estado: `paid`).
3. Equipo SimpleAutos coordina, toma fotos y graba video.
4. Se publica el listing en SimpleAutos (portal).
5. Desde el panel admin se aprueba el copy y se publica en redes (semi-automático / con revisión).

### Integraciones (factibilidad)
- **Facebook Page / Instagram Business:** alta factibilidad vía **Meta Graph API** (primer objetivo).
- **TikTok:** posible, pero suele tener más restricciones; recomendado dejarlo para una fase posterior o como proceso asistido.

### Datos y trazabilidad (estructura sugerida)
- Orden del servicio: estados (pagado → programado → publicado → cerrado / fallido).
- Publicaciones por red: `platform`, `type` (post/reel), `status`, `external_id`, `url`, `error`.

### Riesgos a controlar
- Publicación automática sin moderación (riesgo reputacional).
- Cambios de APIs/permisos en redes.
- Consentimiento/condiciones de uso de imágenes y datos del vehículo.
