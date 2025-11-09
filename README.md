# 🚀 Ecosistema Simple

Monorepo unificado de marketplaces verticales con CRM integrado.

## 📦 Estructura

```
simple/
├── apps/
│   ├── simpleautos/         # Marketplace de vehículos
│   ├── simplepropiedades/   # Marketplace inmobiliario
│   ├── crm/                 # CRM empresarial
│   └── admin/               # Panel de administración
│
├── packages/
│   ├── ui/                  # Design System compartido
│   ├── database/            # Cliente Supabase + queries
│   ├── auth/                # Autenticación SSO
│   ├── payments/            # Integración MercadoPago
│   ├── utils/               # Utilidades compartidas
│   └── config/              # Configuración compartida
│
├── supabase/                # Base de datos y backend
└── PLAN_MAESTRO/            # 📚 Documentación completa
```

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript 5.7+
- **Estilos:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Pagos:** MercadoPago
- **Monorepo:** Turborepo + PNPM

## 🚀 Comandos

### Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar todas las apps
pnpm dev

# Ejecutar una app específica
pnpm dev --filter simpleautos
pnpm dev --filter simplepropiedades
pnpm dev --filter crm
```

### Build

```bash
# Build todas las apps
pnpm build

# Build una app específica
pnpm build --filter simpleautos
```

### Linting y Formateo

```bash
# Lint todo el monorepo
pnpm lint

# Formatear código
pnpm format

# Type checking
pnpm typecheck
```

### Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests con coverage
pnpm test:coverage
```

## 📚 Documentación

Para entender la arquitectura completa del proyecto, revisa la documentación en `/PLAN_MAESTRO/`:

1. **01-ARQUITECTURA-GENERAL.md** - Visión general y stack tecnológico
2. **02-BASE-DE-DATOS.md** - Esquema de base de datos completo
3. **03-DESIGN-SYSTEM.md** - Sistema de diseño y componentes
4. **04-PLAN-IMPLEMENTACION.md** - Roadmap y fases de desarrollo
5. **05-GUIA-DESARROLLO.md** - Convenciones de código y mejores prácticas

## 🎨 Colores por Vertical

- **SimpleAutos:** `#FF3600` (Naranja/Rojo)
- **SimplePropiedades:** `#2563eb` (Azul)
- **CRM:** `#8b5cf6` (Morado)
- **Admin:** `#059669` (Verde)

## 🔧 Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.env.local` en cada app con:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# MercadoPago
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu-public-key
MERCADOPAGO_ACCESS_TOKEN=tu-access-token

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Instalar Dependencias

```bash
pnpm install
```

### 3. Generar Tipos de Supabase

```bash
pnpm supabase:gen-types
```

### 4. Iniciar Desarrollo

```bash
pnpm dev
```

## 📝 Convenciones de Código

- **Componentes:** PascalCase (`VehicleCard.tsx`)
- **Funciones:** camelCase (`formatPrice()`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_UPLOAD_SIZE`)
- **Archivos:** kebab-case o PascalCase según tipo

### Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(auth): add Google OAuth
fix(vehicles): correct price formatting
docs(readme): update installation guide
```

## 👥 Contribución

1. Crear branch desde `develop`
2. Hacer cambios siguiendo convenciones
3. Crear Pull Request
4. Code review requerido
5. Tests deben pasar

## 📞 Contacto

**Desarrollador:** Christian

**Documentación completa:** `/PLAN_MAESTRO/`

---

**Estado:** 🚧 En desarrollo - Fase 0 (Setup Inicial)

**Última actualización:** 8 de noviembre de 2025
