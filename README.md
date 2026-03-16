# Simple V2 🚀

**Ecosistema de marketplaces verticales** construido con arquitectura moderna, monorepo escalable y stack cutting-edge.

> **Estado:** ✅ MVP Funcional (34/34 rutas OK) | ⚠️ Pendiente: Base de datos persistente

---

## 📦 Stack Técnico

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 (Turbopack) + React 19 + TailwindCSS 4 |
| **Backend** | Hono + Zod + TypeScript |
| **Database** | Drizzle ORM + PostgreSQL (📋 TODO: implementar) |
| **Monorepo** | npm workspaces |
| **Icons** | Tabler Icons React |
| **Auth** | JWT (14 días) + HttpOnly Cookies |

---

## 🎯 Apps del Ecosistema

| App | Puerto | Estado | Descripción |
|---|---|---|---|
| **SimpleAutos** | 3000 | ✅ | Marketplace de vehículos (compra, venta, arriendo, subastas) |
| **SimplePropiedades** | 3001 | ✅ | Marketplace inmobiliario (ventas, arriendos, proyectos) |
| **SimpleAdmin** | 3002 | ✅ | Panel de administración global |
| **SimplePlataforma** | 3003 | ✅ | Landing del ecosistema |
| **API Backend** | 4000 | ⚠️ | Hono (datos en memoria → TODO: PostgreSQL) |

**Total: 34/34 rutas funcionales ✅**

---

## 📁 Estructura del Monorepo

```
SimpleV2/
├── apps/               4 aplicaciones Next.js
│   ├── simpleautos/
│   ├── simplepropiedades/
│   ├── simpleadmin/
│   └── simpleplataforma/
├── packages/           Código compartido (workspace)
│   ├── types/          TypeScript interfaces
│   ├── config/         Constantes y configuración
│   ├── ui/             Componentes reutilizables
│   └── utils/          Funciones auxiliares
├── services/           Backend
│   └── api/            Hono server
├── docs/               📚 (16 documentos, actualizado)
└── .env.local          (no en repo)
```

---

## 🚀 Quick Start

### 1️⃣ Instalación
```bash
# Instalar dependencias (12s)
npm install

# Verificar instalación
npm run type-check
```

### 2️⃣ Iniciar desarrollo

**Opción A: Todas las apps simultaneamente**
```bash
npm run dev:all
# → SimpleAutos:       http://localhost:3000
# → SimplePropiedades: http://localhost:3001
# → SimpleAdmin:       http://localhost:3002
# → SimplePlataforma:  http://localhost:3003
# → API:               http://localhost:4000
```

**Opción B: App individual**
```bash
npm run dev:autos          # Solo SimpleAutos
npm run dev:propiedades    # Solo SimplePropiedades
npm run dev:simpleadmin    # Solo SimpleAdmin
npm run dev:api            # Solo Backend
```

### 3️⃣ Build para producción
```bash
npm run build              # Build todas las apps
npm run start              # Runear en producción
```

---

## 📚 Documentación

| Doc | Descripción |
|-----|-------------|
| [**PROJECT_STATUS.md**](./docs/PROJECT_STATUS.md) | ✅ Estado actual, checklist, problemas |
| [**DATABASE_SETUP.md**](./docs/DATABASE_SETUP.md) | 📋 Plan Drizzle + PostgreSQL paso a paso |
| [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) | 🏗️ Diagrama de arquitectura y data flows |
| [**DEVELOPMENT.md**](./docs/DEVELOPMENT.md) | 🛠️ Guía de desarrollo, snippets, troubleshooting |
| [**AUDIT_REGISTRO_COMPLETO.md**](./docs/AUDIT_REGISTRO_COMPLETO.md) | 🔐 Auditoría de seguridad (crítica → producción) |

---

## ✨ Features Principales

### SimpleAutos & SimplePropiedades (ambos)
- 🏠 Landing responsive con búsqueda avanzada
- 📋 Listados con filtros multi-nivel
- 🔍 Página de detalle con gallery + specs
- ✏️ Wizard de publicación (4 pasos)
- 📊 Dashboard usuario con métricas
- ❤️ Favoritos/guardados
- 👤 Perfil público profesional con estrellas
- 📱 Feed social (like, comment, save)
- 💎 CRM modular para contactos
- 🚀 Boost/destacados (3 planes)
- 🔔 Notificaciones
- 📸 Integración Instagram (simulación)
- 🌙 Modo claro/oscuro

### SimpleAdmin
- 📈 Dashboard global
- 👥 Gestión de usuarios
- 📋 Moderación de publicaciones
- 📋 Sistema de reportes
- ⚙️ Configuración del sistema

---

## 🎨 Diseño

Estética **Antigravity** (Google) — minimalista, monocromático, profesional:

- **Paleta**: Negro, blanco, grises neutrales
- **Acentos sutiles por vertical**:
  - SimpleAutos: `#ff3600` 🔴
  - SimplePropiedades: `#3232FF` 🔵
  - SimpleTiendas: `#7A5CFF` 🟣 (próximamente)
  - Admin/Plataforma: monocromático puro
- **Tipografía**: Inter, letter-spacing `-0.03em` en headings
- **Espaciado**: Whitespace generoso, clamp() para responsividad
- **Animaciones**: Hover subtle, transiciones smooth
- **Modo**: Light + Dark automático

---

## 🔐 Seguridad: Estado Actual

| Aspecto | Estado | Notas |
|---------|--------|-------|
| CORS | ✅ | Configurado |
| JWT | ✅ | 14 días, HttpOnly cookies |
| Validación (Zod) | ✅ | Input validation en cliente + servidor |
| Encriptación contraseñas | ❌ | TODO: implementar bcrypt |
| Verificación email | ❌ | TODO: tokens + confirmación |
| Rate limiting | ❌ | TODO: 5 intentos/hora |
| Refresh tokens | ❌ | TODO: implementar |
| HTTPS | ❌ | Producción solo |

**⚠️ NO apto para producción sin los fixes. Ver [AUDIT_REGISTRO_COMPLETO.md](./docs/AUDIT_REGISTRO_COMPLETO.md)**

---

## 🗄️ Database (Próximo Sprint)

### Configuración Drizzle + PostgreSQL

```bash
# 1. Setup PostgreSQL local
# Ver DATABASE_SETUP.md para instrucciones

# 2. Generar migrations
npm run db:generate

# 3. Ejecutar migrations
npm run db:migrate

# 4. Verificar con UI
npm run db:studio

# 5. API automáticamente usa BD
```

**Tablas planeadas:**
- `users` (email, password_hash, role, etc)
- `listings` (autos, propiedades)
- `saved_listings` (favoritos)
- `follows` (seguidores)
- `boost_orders` (publicidad)
- `address_book` (direcciones)
- `payment_orders` (pagos)
- `subscriptions` (planes)

Ver [DATABASE_SETUP.md](./docs/DATABASE_SETUP.md) para schemas completos.

---

## 🚦 Próximas Prioridades

### Sprint 1: Base de Datos (Semana 1-2)
- [ ] Implementar Drizzle schemas
- [ ] PostgreSQL migrations
- [ ] Reemplazar Maps → queries
- [x] +10 días

### Sprint 2: Seguridad (Semana 2-3)
- [ ] bcrypt passwords
- [ ] Verificación email
- [ ] Rate limiting
- [ ] +10 días

### Sprint 3: Features (Semana 3-4)
- [ ] Pagos real (MercadoPago)
- [ ] Notificaciones real
- [ ] Instagram real
- [ ] +10 días

---

## 📊 Verificación

```bash
# Todos los endpoints OK
npm run dev:all
# Visita cada puerto y verifica que carga

# O via API:
curl http://localhost:3000    # ✅ SimpleAutos
curl http://localhost:3001    # ✅ SimplePropiedades
curl http://localhost:3002    # ✅ SimpleAdmin
curl http://localhost:3003    # ✅ SimplePlataforma
curl http://localhost:4000    # ✅ API (sin UI, JSON only)
```

---

## 🛠️ Desarrollo

```bash
# Crear nueva ruta
# Ver DEVELOPMENT.md → "Agregar una nueva página"

# Agregar API endpoint
# Ver DEVELOPMENT.md → "Agregar una nueva API endpoint"

# Usar componentes compartidos
import { ListingCard } from '@simple/ui';
import type { ListingRecord } from '@simple/types';
import { VERTICALS } from '@simple/config';

# Troubleshooting
# Ver DEVELOPMENT.md → "Common Issues & Fixes"
```

---

## 🤝 Contributing

1. Crear rama: `git checkout -b feature/nombre-feature`
2. Commit: `git commit -m "feat: descripción"`
3. Push: `git push origin feature/nombre-feature`
4. Pull request con descripción

**Nota:** Todos los cambios deben mantener tipos TypeScript válidos (`npm run type-check`) y pasar linter.

---

## 📝 Licencia

Privado - Proyecto en desarrollo

---

## 📞 Contacto & Soporte

- 📧 Documentación: Ver carpeta `/docs`
- 🐛 Issues: GitHub issues
- 💬 Chat: (Configurar si es necesario)

---

## 🚀 Roadmap

```
✅ Q1 2026: MVP frontend (34 rutas)
⏳ Q2 2026: Backend + DB persistente
⏳ Q2 2026: Pagos + seguridad
⏳ Q3 2026: SimpleTiendas (3ª vertical)
⏳ Q3 2026: Integraciones real
⏳ Q4 2026: Performance + scaling
```

**Estado actual:** End of Q1 → Iniciando Q2

---

**Última actualización:** 9 de marzo de 2026

## Diseño

Estilo Antigravity (Google) — minimalista, monocromático, profesional:

- **Paleta**: Negro, blanco, grises (B/W/G)
- **Acentos sutiles por vertical**:
  - SimpleAutos: `#ff3600` (solo en focus rings)
  - SimplePropiedades: `#3232FF` (solo en focus rings)
  - SimpleTiendas: `#7A5CFF` (próximamente)
  - SimpleAdmin / SimplePlataforma: sin accent, solo B/W/G
- **Tipografía**: Inter, letter-spacing -0.03em en headings
- **Modo**: Light/Dark con toggle en cada app

## Rutas

### SimpleAutos (14 rutas)
```
/                     Landing con búsqueda
/ventas               Listados venta + filtros
/arriendos            Listados arriendo
/subastas             Listados subastas
/vehiculo/[slug]      Detalle vehículo
/perfil/[username]    Perfil público vendedor
/feed                 Feed social
/panel                Dashboard usuario
/panel/publicar       Wizard publicación (4 pasos)
/panel/guardados      Favoritos
/panel/crm            CRM de contactos
/panel/publicidad     Campañas y boost de publicaciones
/panel/notificaciones Notificaciones
/panel/instagram      Integración Instagram (simulación)
```

### SimplePropiedades (14 rutas)
```
/                     Landing inmobiliaria
/ventas               Propiedades en venta
/arriendos            Propiedades en arriendo
/proyectos            Proyectos nuevos (desde plano)
/propiedad/[slug]     Detalle propiedad
/perfil/[username]    Perfil corredor
/feed                 Feed social
/panel                Dashboard corredor
/panel/publicar       Wizard publicación (4 pasos)
/panel/guardados      Favoritos
/panel/crm            CRM contactos inmobiliarios
/panel/publicidad     Campañas y boost de publicaciones
/panel/notificaciones Notificaciones
/panel/instagram      Instagram (simulación)
```

### SimpleAdmin (5 rutas)
```
/                Dashboard ecosistema
/usuarios        Gestión usuarios
/publicaciones   Moderación contenido
/reportes        Reportes y flags
/configuracion   Ajustes del sistema
```

### SimplePlataforma (1 ruta)
```
/                Landing ecosistema
```

## Estructura del Monorepo

```
SimpleV2/
├── apps/
│   ├── simpleautos/        # Next.js — port 3000
│   ├── simplepropiedades/  # Next.js — port 3001
│   ├── simpleadmin/        # Next.js — port 3002
│   └── simpleplataforma/   # Next.js — port 3003
├── packages/
│   ├── types/              # Tipos compartidos
│   ├── config/             # Configuración
│   ├── utils/              # Utilidades
│   └── ui/                 # Componentes UI
├── services/
│   └── api/                # Hono API — port 4000
└── package.json            # Monorepo root
```

## Requisitos

- Node.js >= 22
- PostgreSQL (para API)

## Google Maps

Para que el autocompletado de direcciones y la vista previa del mapa funcionen bien, necesitas configurar Google Maps.

### APIs que debes habilitar en Google Cloud

- `Maps JavaScript API`
- `Places API`
- `Maps Embed API`
- `Geocoding API`

Referencias oficiales:

- Maps Embed API: https://developers.google.com/maps/documentation/embed/get-started
- Places Autocomplete con Maps JavaScript: https://developers.google.com/maps/documentation/javascript/place-autocomplete-overview
- Geocoding API: https://developers.google.com/maps/documentation/geocoding/overview

### Variables que usa este monorepo

Frontend `apps/simpleautos/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=tu_browser_key
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=tu_browser_key
```

Frontend `apps/simplepropiedades/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=tu_browser_key
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=tu_browser_key
```

Backend `services/api/.env`:

```env
GOOGLE_MAPS_API_KEY=tu_server_key
SESSION_SECRET=cambia_este_secreto
```

También quedaron ejemplos listos en:

- `apps/simpleautos/.env.local.example`
- `apps/simplepropiedades/.env.local.example`
- `services/api/.env.example`

### Restricciones recomendadas

- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`
  - tipo: `Sitios web`
  - APIs: `Maps JavaScript API`, `Places API`, `Maps Embed API`
  - referrers:
    - `http://localhost:3000/*`
    - `http://127.0.0.1:3000/*`
    - `http://localhost:3001/*`
    - `http://127.0.0.1:3001/*`
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`
  - en local puede ser la misma `browser key`
- `GOOGLE_MAPS_API_KEY`
  - tipo ideal: `Direcciones IP`
  - API: `Geocoding API`

### Después de configurarlo

1. Crea los archivos `.env.local` en `apps/simpleautos` y `apps/simplepropiedades`.
2. Crea el archivo `.env` en `services/api`.
3. Reinicia `next dev` y `tsx watch`.

Sin esas keys:

- la vista previa interna usa un fallback limitado
- el autocompletado de Google Places no se activa
- la geocodificación server-side puede quedar degradada
