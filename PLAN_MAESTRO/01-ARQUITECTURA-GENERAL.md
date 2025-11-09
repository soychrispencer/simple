# 🏗️ Arquitectura General - Ecosistema Simple

**Autor:** Christian  
**Fecha:** 8 de noviembre de 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Principios de Diseño](#principios-de-diseño)
3. [Estructura del Monorepo](#estructura-del-monorepo)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Dominios y Routing](#dominios-y-routing)
6. [Flujo de Autenticación](#flujo-de-autenticación)

---

## 🎯 Visión General

**Simple** es un ecosistema modular de marketplaces verticales con un CRM integrado y un sistema de autenticación unificado. Cada vertical mantiene su identidad visual única mientras comparte la misma base de componentes, lógica de negocio y experiencia de usuario.

### Verticales Iniciales

1. **SimpleAutos** - Marketplace de vehículos (venta, arriendo, subastas)
2. **SimplePropiedades** - Marketplace inmobiliario (venta, arriendo)

### Productos Transversales

- **Simple CRM** - Gestión de leads, clientes, publicaciones, analytics
- **Simple Admin** - Panel de administración del ecosistema
- **Simple Auth** - Sistema de autenticación unificado (SSO)

---

## 🎨 Principios de Diseño

### 1. **Minimalismo Apple-Inspired**
- Colores sobrios: negro, blanco, grises
- Espacios generosos, tipografía clara
- Animaciones sutiles y fluidas
- Modo claro y oscuro perfecto

### 2. **Unificación con Diferenciación**
```
Componentes Compartidos:
├── Header (logo + color acento por vertical)
├── Footer 
├── Panel de usuario (mismo layout)
├── Formularios (mismo estilo)
├── Tarjetas de listings (adaptables)
└── Sistema de autenticación

Diferenciadores:
├── Color primario por vertical
├── Iconografía específica
├── Terminología del dominio
└── Campos específicos de cada vertical
```

### 3. **Mobile-First & Responsive**
- Diseño optimizado para móvil primero
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)

### 4. **Performance & SEO**
- Static Site Generation (SSG) para páginas públicas
- Incremental Static Regeneration (ISR) para listings
- Server Components por defecto
- Optimización de imágenes con Next.js Image

---

## 📁 Estructura del Monorepo

```
simple/
├── apps/
│   ├── simpleautos/              # Next.js 15 App
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (public)/
│   │   │   │   │   ├── ventas/
│   │   │   │   │   ├── arriendos/
│   │   │   │   │   └── subastas/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── registro/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   └── panel/
│   │   │   │   └── api/
│   │   │   ├── components/       # Componentes específicos
│   │   │   └── lib/               # Utilidades específicas
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   ├── simplepropiedades/         # Next.js 15 App
│   │   └── [estructura similar a simpleautos]
│   │
│   ├── crm/                       # Next.js 15 App (CRM)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── leads/
│   │   │   │   │   ├── clientes/
│   │   │   │   │   ├── publicaciones/
│   │   │   │   │   └── analytics/
│   │   │   │   └── api/
│   │   │   └── components/
│   │   └── package.json
│   │
│   └── admin/                     # Panel de administración
│       └── [estructura similar]
│
├── packages/
│   ├── ui/                        # Design System Compartido
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button/
│   │   │   │   ├── Card/
│   │   │   │   ├── Input/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Header/
│   │   │   │   ├── Footer/
│   │   │   │   ├── ListingCard/
│   │   │   │   └── ...
│   │   │   ├── styles/
│   │   │   │   ├── globals.css
│   │   │   │   └── tokens.css
│   │   │   └── index.ts
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   ├── database/                  # Supabase Client & Types
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── queries/
│   │   │   ├── mutations/
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── auth/                      # Lógica de autenticación
│   │   ├── src/
│   │   │   ├── hooks/
│   │   │   ├── context/
│   │   │   ├── utils/
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── payments/                  # Integración MercadoPago
│   │   ├── src/
│   │   │   ├── mercadopago.ts
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── config/                    # Configuración compartida
│   │   ├── eslint-config/
│   │   ├── typescript-config/
│   │   └── tailwind-config/
│   │
│   └── utils/                     # Utilidades compartidas
│       ├── src/
│       │   ├── format.ts
│       │   ├── validation.ts
│       │   └── constants.ts
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── config.toml
│
├── docs/                          # Documentación
│   ├── architecture/
│   ├── components/
│   ├── api/
│   └── guides/
│
├── turbo.json                     # Configuración Turborepo
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # PNPM workspaces
└── README.md
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript 5.7+
- **Estilos:** Tailwind CSS 4
- **Componentes:** React 19+
- **Iconos:** @tabler/icons-react
- **Tema:** next-themes
- **Formularios:** React Hook Form + Zod
- **Estado:** React Context + Zustand (si necesario)
- **Animaciones:** Framer Motion (opcional, sutiles)

### Backend & Base de Datos
- **BaaS:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (con SSO)
- **Storage:** Supabase Storage
- **Edge Functions:** Supabase Functions
- **Real-time:** Supabase Realtime

### Pagos
- **Proveedor:** MercadoPago
- **Integración:** SDK oficial + webhooks

### DevOps & Monorepo
- **Gestor de Monorepo:** Turborepo
- **Package Manager:** PNPM
- **Linting:** ESLint 9
- **Formatting:** Prettier
- **Testing:** Vitest + Testing Library
- **CI/CD:** GitHub Actions
- **Hosting:** Vercel (apps) + Supabase (backend)
- **Monitoring:** Sentry
- **Analytics:** Vercel Analytics + Supabase Analytics

### Herramientas de Desarrollo
- **VS Code Extensions:**
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier
  - Error Lens
  - GitLens

---

## 🌐 Dominios y Routing

### Estructura de Dominios

```
Production:
├── simpleautos.com          → apps/simpleautos
├── simplepropiedades.com    → apps/simplepropiedades
├── crm.simple.com           → apps/crm
└── admin.simple.com         → apps/admin

Development:
├── localhost:3000           → simpleautos
├── localhost:3001           → simplepropiedades
├── localhost:3002           → crm
└── localhost:3003           → admin
```

### Cross-Domain Authentication (SSO)

Supabase Auth maneja el SSO automáticamente mediante:
1. **Shared Session Cookie Domain:** `.simple.com`
2. **Token Refresh Cross-Domain**
3. **Unified User Profile**

```typescript
// Configuración en cada app
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'simple-auth', // ← Clave compartida
    },
  }
);
```

---

## 🔐 Flujo de Autenticación

### 1. Login/Registro Unificado

```
Usuario ingresa en simpleautos.com/login
    ↓
Supabase Auth valida credenciales
    ↓
Se crea sesión con cookie .simple.com
    ↓
Usuario puede navegar a simplepropiedades.com
    ↓
La sesión persiste automáticamente (SSO)
```

### 2. Perfiles Multi-Vertical

```sql
-- Tabla principal de usuarios (manejada por Supabase Auth)
auth.users

-- Perfil extendido
public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Relación usuario-vertical
public.user_verticals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  vertical TEXT, -- 'autos' | 'propiedades'
  role TEXT, -- 'buyer' | 'seller' | 'agent' | 'admin'
  company_id UUID REFERENCES companies,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)

-- Empresas (concesionarias, inmobiliarias, etc.)
public.companies (
  id UUID PRIMARY KEY,
  name TEXT,
  vertical TEXT,
  subscription_tier TEXT, -- 'free' | 'basic' | 'pro' | 'enterprise'
  subscription_status TEXT,
  created_at TIMESTAMPTZ
)
```

### 3. Tipos de Usuario

```typescript
type UserRole = 
  | 'buyer'        // Comprador/Arrendatario individual
  | 'seller'       // Vendedor independiente
  | 'agent'        // Agente de empresa
  | 'admin';       // Administrador de empresa

type Vertical = 
  | 'autos' 
  | 'propiedades';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  verticals: Array<{
    vertical: Vertical;
    role: UserRole;
    companyId?: string;
    isActive: boolean;
  }>;
}
```

---

## 🎨 Sistema de Colores por Vertical

```typescript
// packages/ui/src/styles/tokens.css

:root {
  /* Base System (compartido) */
  --color-bg-light: #ffffff;
  --color-bg-dark: #111111;
  --color-card-light: #ffffff;
  --color-card-dark: #1a1a1a;
  --color-text-light: #000000;
  --color-text-dark: #ffffff;
  --color-border-light: rgba(0, 0, 0, 0.1);
  --color-border-dark: rgba(255, 255, 255, 0.1);
  
  /* Neutral Grays (Apple-inspired) */
  --gray-50: #fafafa;
  --gray-100: #f5f5f5;
  --gray-200: #e5e5e5;
  --gray-300: #d4d4d4;
  --gray-400: #a3a3a3;
  --gray-500: #737373;
  --gray-600: #525252;
  --gray-700: #404040;
  --gray-800: #262626;
  --gray-900: #171717;
}

/* SimpleAutos */
[data-vertical="autos"] {
  --color-primary: #FF3600;
  --color-primary-hover: #E63000;
  --color-primary-light: #FF6B3D;
}

/* SimplePropiedades */
[data-vertical="propiedades"] {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #3b82f6;
}

/* CRM */
[data-vertical="crm"] {
  --color-primary: #8b5cf6;
  --color-primary-hover: #7c3aed;
  --color-primary-light: #a78bfa;
}
```

---

## 📱 Responsive Breakpoints

```javascript
// tailwind.config.js (compartido)
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // Mobile landscape
      'md': '768px',   // Tablet
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
      '2xl': '1536px', // Extra large
    },
  },
};
```

---

## 🚀 Siguiente Paso

Revisar el documento **02-BASE-DE-DATOS.md** para entender el esquema completo de Supabase.
