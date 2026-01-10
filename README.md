# Simple Ecosystem

> Un ecosistema unificado de verticales especializadas: SimpleAutos, SimplePropiedades, SimpleTiendas y más.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

---

## 🌟 Visión

Simple es un ecosistema de plataformas verticales que comparten diseño, autenticación, componentes y backend, ofreciendo experiencias especializadas para diferentes mercados:

- **SimpleAutos** 🚗 - Compra, venta, arriendo y subasta de vehículos
- **SimplePropiedades** 🏡 - Compra y arriendo de propiedades
- **SimpleTiendas** 🏪 - Marketplace para comercios
- **SimpleFood** 🍽️ - Marketplace y descubrimiento gastronómico

**Valores Clave:** Modernidad, Simplicidad, Limpieza, Conexión

---

## 📁 Estructura del Proyecto

```
Simple/
├── docs/                      # 📚 Documentación completa del ecosistema
│   ├── 00-MASTER-PLAN.md
│   ├── 01-ARCHITECTURE.md
│   ├── 02-MIGRATION-GUIDE.md
│   ├── 03-BACKEND.md
│   ├── 04-COMPONENT-GUIDE.md
│   ├── 05-DEVELOPMENT-GUIDE.md
│   ├── 06-ROADMAP.md
│   ├── 07-LOGO-SYSTEM.md
│   └── 08-DEPLOYMENT-VERCEL.md
│
├── apps/                      # 🚀 Verticales (aplicaciones Next.js)
│   ├── simpleautos/          # Vertical de vehículos
│   ├── simplepropiedades/    # Vertical de propiedades
│   ├── simpletiendas/        # Vertical de comercios
│   └── simplefood/           # Vertical gastronómica
│
├── packages/                  # 📦 Código compartido
│   ├── ui/                   # Componentes UI compartidos
│   ├── config/               # Configuraciones y temas
│   ├── auth/                 # Sistema de autenticación
│   ├── shared-types/         # Tipos compartidos
│   ├── panel/                # Manifests/estructura de panel
│   ├── profile/              # Módulos de perfil
│   ├── listings/             # Helpers de listados multi-vertical
│   └── logging/              # Logging compartido
│
├── backend/                   # 🗄️ Backend unificado
│   └── supabase/             # Configuración, migrations y functions
│
├── scripts/                   # 🛠️ Scripts de utilidad
│   └── *.js / *.mjs / *.py
│
├── package.json              # Root package (workspaces)
└── README.md                 # Este archivo
```

---

## 🚀 Quick Start

### Prerequisitos

- Node.js 20+
- npm 10+
- Cuenta de Supabase (Cloud)
- Cuenta de MercadoPago (para pagos)

### Instalación

```bash
# Clonar repositorio
cd c:\Users\chris\OneDrive\Desktop\Simple

# Instalar dependencias
npm install

# Configurar variables de entorno (ver .env.example en cada vertical)
cp apps/simpleautos/.env.example apps/simpleautos/.env.local
cp apps/simplepropiedades/.env.example apps/simplepropiedades/.env.local
```

### Desarrollo

```bash
# Correr SimpleAutos (puerto 3000)
npm run dev:autos

# Correr SimplePropiedades (puerto 3001)
npm run dev:props

# Correr SimpleTiendas (puerto 3002)
npm run dev:tiendas

# Correr SimpleFood (puerto 3003)
npm run dev:food

# Correr todas las verticales (en paralelo)
npm run dev:all
```

### Build

```bash
# Build de todas las apps
npm run build

# Build de una vertical específica
npm run build:autos
npm run build:props
```

---

## 🎨 Verticales

### SimpleAutos 🚗
**URL:** https://simpleautos.com  
**Color:** `#FFB600` (Amarillo/Dorado)  
**Descripción:** Plataforma para compra, venta, arriendo y subasta de vehículos nuevos y usados.

**Funcionalidades:**
- Listados de venta, arriendo y subasta
- Búsqueda avanzada con filtros
- Panel de usuario
- Sistema de pagos para destacados y boosts
- CRM para concesionarias

### SimplePropiedades 🏡
**URL:** https://simplepropiedades.com  
**Color:** `#009BA3` (Turquesa neón)  
**Descripción:** Plataforma para compra y arriendo de propiedades.

**Funcionalidades:**
- Listados de venta y arriendo
- Búsqueda por ubicación y características
- Tours virtuales programados
- CRM para inmobiliarias
- Gestión de contratos

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **State:** React Context + Server Components
- **Forms:** React Hook Form + Zod

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Payments:** MercadoPago
- **Email:** Nodemailer
- **Logs:** Winston

### DevOps
- **Hosting:** Vercel
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry
- **Analytics:** Vercel Analytics

---

## 📦 Packages Compartidos

### @simple/ui
Componentes UI reutilizables para todas las verticales.

```typescript
import { Header, Footer, Button, FormInput as Input, Card } from '@simple/ui';
```

### @simple/config
Configuraciones, temas y constantes compartidas.

```typescript
import { verticalThemes } from '@simple/config';
const theme = verticalThemes.autos; // { primary: '#FFB600', ... }
```

### @simple/auth
Sistema de autenticación unificado.

```typescript
import { AuthProvider, useAuth } from '@simple/auth';
const { user, logout } = useAuth();
```

### @simple/shared-types
Tipos compartidos entre verticales.

```typescript
import type { RentPeriod } from '@simple/shared-types';
```

---

## 📖 Documentación

Toda la documentación está centralizada en la carpeta `/docs`:

- **[Master Plan](./docs/00-MASTER-PLAN.md)** - Visión y plan completo del ecosistema
- **[Architecture](./docs/01-ARCHITECTURE.md)** - Arquitectura técnica detallada
- **[Migration Guide](./docs/02-MIGRATION-GUIDE.md)** - Guía de migración paso a paso
- **[Backend Reference](./docs/03-BACKEND.md)** - Stack, esquema, auditoría y operaciones
- **[Component Guide](./docs/04-COMPONENT-GUIDE.md)** - Header/Footer compartidos
- **[Development Guide](./docs/05-DEVELOPMENT-GUIDE.md)** - Guía para desarrolladores
- **[Roadmap](./docs/06-ROADMAP.md)** - Próximos hitos
- **[Logo System](./docs/07-LOGO-SYSTEM.md)** - Identidad visual del ecosistema

---

## 🔐 Backend en Inglés

Todo el backend (base de datos, API, variables) está en inglés profesional:

```sql
-- Tablas principales
public.profiles
public.listings
public.vehicles
public.properties
public.payments
public.subscriptions
public.notifications
```

**Principio:** Backend en inglés, frontend en español.

---

## 🎯 Principios de Desarrollo

1. **No Duplicar Código** - Si se usa en 2+ verticales, va a `packages/`
2. **Backend en Inglés** - Toda la base de datos y API en inglés
3. **Frontend en Español** - UI de cara al usuario en español
4. **Tipos Estrictos** - TypeScript strict mode activado
5. **Documentación Viva** - Actualizar `docs/` con cada cambio importante
6. **Performance First** - Lighthouse score >90 en todas las verticales

---

## 🧪 Testing

```bash
# Correr tests
npm test

# Tests en watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## 🚢 Deployment

### Vercel (Recomendado)

```bash
# Deploy SimpleAutos
cd apps/simpleautos
vercel

# Deploy SimplePropiedades
cd apps/simplepropiedades
vercel
```

### Variables de Entorno

Configurar en Vercel o en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
```

---

## 📊 Status del Proyecto

### Completado ✅
- [x] Documentación completa del ecosistema
- [x] Análisis de arquitectura
- [x] Plan de migración definido

### En Progreso ⏳
- [ ] Creación de estructura física
- [ ] Setup de monorepo
- [ ] Extracción de componentes compartidos

### Pendiente 📋
- [ ] Backend en inglés
- [ ] SimplePropiedades
- [ ] CRM empresarial
- [ ] Deployment en producción

Ver [Roadmap completo](./docs/06-ROADMAP.md) para más detalles.

---

## 🤝 Contribuir

Este es un proyecto privado de Christian. Para contribuir:

1. Leer toda la documentación en `/docs`
2. Seguir las convenciones en [Development Guide](./docs/05-DEVELOPMENT-GUIDE.md)
3. Hacer commits descriptivos con conventional commits
4. Actualizar documentación con cambios significativos

---

## 📄 Licencia

Copyright © 2025 Christian - Simple Ecosystem  
Todos los derechos reservados.

---

## 📞 Contacto

**Autor:** Christian  
**Proyecto:** Simple Ecosystem  
**Inicio:** 11 de noviembre de 2025

---

## 🙏 Agradecimientos

Gracias a todas las tecnologías y herramientas que hacen posible este ecosistema:
- Next.js Team
- Supabase Team
- Vercel
- Tailwind CSS
- Y toda la comunidad open source

---

**Última actualización:** 11 de noviembre de 2025
