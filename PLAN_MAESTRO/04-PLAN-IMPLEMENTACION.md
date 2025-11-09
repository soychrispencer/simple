# 🚀 Plan de Implementación - Ecosistema Simple

**Autor:** Christian  
**Fecha:** 8 de noviembre de 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Overview de Fases](#overview-de-fases)
2. [Fase 0: Setup Inicial](#fase-0-setup-inicial)
3. [Fase 1: Foundation](#fase-1-foundation)
4. [Fase 2: Verticales Core](#fase-2-verticales-core)
5. [Fase 3: CRM](#fase-3-crm)
6. [Fase 4: Optimización](#fase-4-optimización)
7. [Cronograma Estimado](#cronograma-estimado)

---

## 🎯 Overview de Fases

```
Fase 0: Setup Inicial (1 semana)
├── Configurar Monorepo (Turborepo + PNPM)
├── Configurar Supabase proyecto real
├── Setup CI/CD básico
└── Documentación inicial

Fase 1: Foundation (2-3 semanas)
├── Design System (packages/ui)
├── Database client (packages/database)
├── Auth system (packages/auth)
├── Payments integration (packages/payments)
└── Shared utilities (packages/utils, packages/config)

Fase 2: Verticales Core (4-6 semanas)
├── SimpleAutos MVP
│   ├── Venta de vehículos
│   ├── Arriendo
│   └── Subastas básicas
└── SimplePropiedades MVP
    ├── Venta de propiedades
    └── Arriendo

Fase 3: CRM (3-4 semanas)
├── Dashboard analytics
├── Gestión de leads
├── Gestión de publicaciones
└── Sistema de suscripciones

Fase 4: Optimización (ongoing)
├── Performance
├── SEO
├── Analytics
└── Testing
```

---

## 🏗️ Fase 0: Setup Inicial

### Objetivos
- Crear estructura del monorepo
- Configurar herramientas de desarrollo
- Conectar Supabase real
- Establecer flujo de trabajo

### Tareas

#### 1. Inicializar Monorepo

```bash
# Crear directorio principal
mkdir simple
cd simple

# Inicializar PNPM workspace
pnpm init

# Instalar Turborepo
pnpm add -D turbo

# Crear estructura base
mkdir -p apps packages docs supabase
```

#### 2. Configurar Turborepo

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^test"],
      "outputs": ["coverage/**"]
    }
  }
}
```

#### 3. Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json (root)
{
  "name": "simple",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "@simple/eslint-config": "workspace:*",
    "@simple/typescript-config": "workspace:*",
    "prettier": "^3.4.2"
  },
  "packageManager": "pnpm@9.15.2",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

#### 4. Configurar Supabase

```bash
# Instalar Supabase CLI
pnpm add -D supabase

# Inicializar (linkar con proyecto existente)
npx supabase init

# Crear .env.local en cada app
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

#### 5. Configurar ESLint y Prettier

```javascript
// packages/config/eslint-config/index.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

#### 6. GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit: Monorepo setup"
git remote add origin https://github.com/christian/simple.git
git push -u origin main
```

### Entregables Fase 0
- ✅ Monorepo funcional con Turborepo
- ✅ Supabase conectado
- ✅ ESLint, Prettier configurados
- ✅ Scripts de desarrollo funcionando
- ✅ Documentación básica en README

---

## 🎨 Fase 1: Foundation (Packages Compartidos)

### Objetivos
- Crear todos los packages reutilizables
- Implementar design system completo
- Configurar autenticación
- Integrar MercadoPago

### 1.1 Package: @simple/ui (Design System)

```bash
cd packages
mkdir -p ui/src/components ui/src/styles
cd ui
pnpm init
```

**Estructura:**
```
ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Card/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── ListingCard/
│   │   └── index.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── tokens.css
│   │   └── index.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   └── cn.ts
│   └── index.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

**package.json:**
```json
{
  "name": "@simple/ui",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "test": "vitest"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "@tabler/icons-react": "^3.34.1"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^15.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Componentes Prioritarios:**
1. Button (variants: primary, secondary, ghost, danger)
2. Card (variants: default, elevated, outlined)
3. Input (con label, error, helper text)
4. Select, Textarea, Checkbox, Radio
5. Modal, Dialog
6. Badge, Tag
7. Header (adaptable por vertical)
8. Footer
9. ListingCard (adaptable para autos/propiedades)
10. SearchFilters
11. UserMenu
12. NotificationBell

### 1.2 Package: @simple/database

```bash
cd packages
mkdir -p database/src/{client,queries,mutations,types}
cd database
pnpm init
```

**Estructura:**
```
database/
├── src/
│   ├── client/
│   │   ├── index.ts          # Supabase client singleton
│   │   └── middleware.ts     # Auth helpers
│   ├── queries/
│   │   ├── vehicles.ts       # SELECT queries
│   │   ├── properties.ts
│   │   ├── users.ts
│   │   └── index.ts
│   ├── mutations/
│   │   ├── vehicles.ts       # INSERT/UPDATE/DELETE
│   │   ├── properties.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── database.ts       # Generated types
│   │   └── index.ts
│   └── index.ts
└── package.json
```

**client/index.ts:**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'simple-auth',
  },
});

// Server-side client (con service role)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Generar tipos desde Supabase:**
```bash
npx supabase gen types typescript --project-id tu-project-id > src/types/database.ts
```

### 1.3 Package: @simple/auth

```bash
cd packages
mkdir -p auth/src/{hooks,context,utils}
cd auth
pnpm init
```

**Estructura:**
```
auth/
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useUser.ts
│   │   ├── useSession.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── auth.ts
│   │   ├── session.ts
│   │   └── index.ts
│   ├── types.ts
│   └── index.ts
└── package.json
```

**AuthContext.tsx:**
```typescript
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@simple/database';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 1.4 Package: @simple/payments

```bash
cd packages
mkdir -p payments/src/{mercadopago,hooks}
cd payments
pnpm init
```

**Estructura:**
```
payments/
├── src/
│   ├── mercadopago/
│   │   ├── client.ts
│   │   ├── preferences.ts
│   │   ├── webhooks.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useMercadoPago.ts
│   │   └── index.ts
│   ├── types.ts
│   └── index.ts
└── package.json
```

**mercadopago/client.ts:**
```typescript
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
    idempotencyKey: 'simple-ecosystem',
  },
});

export const preference = new Preference(client);

export async function createPaymentPreference(data: {
  title: string;
  quantity: number;
  price: number;
  userId: string;
  listingId: string;
  listingType: 'vehicle' | 'property';
}) {
  const response = await preference.create({
    body: {
      items: [
        {
          title: data.title,
          quantity: data.quantity,
          unit_price: data.price,
        },
      ],
      payer: {
        id: data.userId,
      },
      external_reference: `${data.listingType}-${data.listingId}`,
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/panel/pagos/success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/panel/pagos/failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/panel/pagos/pending`,
      },
      auto_return: 'approved',
    },
  });

  return response;
}
```

### 1.5 Package: @simple/utils

```bash
cd packages
mkdir -p utils/src
cd utils
pnpm init
```

**Utilidades:**
- `format.ts`: Formateo de precios, fechas, números
- `validation.ts`: Schemas de Zod
- `constants.ts`: Constantes compartidas
- `seo.ts`: Utilidades SEO
- `image.ts`: Optimización de imágenes

### Entregables Fase 1
- ✅ @simple/ui completo con componentes base
- ✅ @simple/database con queries y mutations
- ✅ @simple/auth con SSO funcionando
- ✅ @simple/payments con MercadoPago integrado
- ✅ @simple/utils con helpers comunes
- ✅ Storybook para documentar componentes (opcional)

---

## 🚗 Fase 2: Verticales Core

### 2.1 SimpleAutos

**Prioridad de Features:**

1. **Venta de Vehículos (Semana 1-2)**
   - [ ] Página de listado con filtros
   - [ ] Página de detalle del vehículo
   - [ ] Formulario de publicación (wizard)
   - [ ] Panel de vendedor (mis publicaciones)
   - [ ] Sistema de favoritos

2. **Arriendo de Vehículos (Semana 2-3)**
   - [ ] Listado de arriendos con filtros de fechas
   - [ ] Calendario de disponibilidad
   - [ ] Sistema de reservas
   - [ ] Confirmación de arriendo

3. **Subastas (Semana 3-4)**
   - [ ] Listado de subastas activas
   - [ ] Sistema de pujas en tiempo real
   - [ ] Countdown timer
   - [ ] Notificaciones de outbid

**Estructura de App:**
```
apps/simpleautos/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx              # Home
│   │   │   ├── ventas/
│   │   │   │   ├── page.tsx          # Listado
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Detalle
│   │   │   ├── arriendos/
│   │   │   │   └── ...
│   │   │   └── subastas/
│   │   │       └── ...
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── registro/
│   │   ├── (dashboard)/
│   │   │   └── panel/
│   │   │       ├── publicaciones/
│   │   │       ├── favoritos/
│   │   │       ├── mensajes/
│   │   │       └── configuracion/
│   │   ├── api/
│   │   │   ├── vehicles/
│   │   │   ├── bookings/
│   │   │   └── webhooks/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/           # Componentes específicos de autos
│   │   ├── VehicleFilters/
│   │   ├── VehicleCard/
│   │   ├── VehicleWizard/
│   │   └── AuctionTimer/
│   └── lib/                  # Utilidades específicas
│       ├── vehicleHelpers.ts
│       └── auctionLogic.ts
└── package.json
```

### 2.2 SimplePropiedades

**Prioridad de Features:**

1. **Venta de Propiedades (Semana 1-2)**
   - [ ] Listado con filtros (tipo, precio, ubicación)
   - [ ] Detalle con galería y mapa
   - [ ] Formulario de publicación
   - [ ] Panel de propietario

2. **Arriendo de Propiedades (Semana 2-3)**
   - [ ] Listado de arriendos
   - [ ] Sistema de reservas de visitas
   - [ ] Contacto con propietario/inmobiliaria

**Estructura similar a SimpleAutos, adaptada para propiedades.**

### Componentes Compartidos a Reutilizar
- Header (cambiar logo y color)
- Footer (mismo)
- ListingCard (adaptar campos)
- SearchFilters (adaptar opciones)
- UserMenu (mismo)
- AuthModal (mismo)
- Panel layout (mismo)

### Entregables Fase 2
- ✅ SimpleAutos MVP completo (venta, arriendo, subastas)
- ✅ SimplePropiedades MVP completo (venta, arriendo)
- ✅ Ambas apps compartiendo componentes exitosamente
- ✅ SSO funcionando entre verticales
- ✅ Pagos con MercadoPago funcionando

---

## 📊 Fase 3: CRM

### Objetivos
- Dashboard para empresas
- Gestión de leads
- Analytics básico
- Sistema de suscripciones

### 3.1 Dashboard Principal

```
apps/crm/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx              # Overview
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   ├── publicaciones/
│   │   │   ├── clientes/
│   │   │   ├── analytics/
│   │   │   └── configuracion/
│   │   └── api/
│   └── components/
│       ├── Dashboard/
│       ├── LeadCard/
│       ├── Analytics/
│       └── Charts/
└── package.json
```

### 3.2 Features

1. **Dashboard Overview**
   - Métricas clave (leads, conversiones, ventas)
   - Gráficos de tendencias
   - Actividad reciente

2. **Gestión de Leads**
   - Lista de leads con estados
   - Asignación a agentes
   - Seguimiento de actividades
   - Notas y tareas

3. **Gestión de Publicaciones**
   - Ver todas las publicaciones de la empresa
   - Editar/pausar/eliminar
   - Estadísticas por publicación

4. **Analytics**
   - Conversiones por vertical
   - Fuentes de leads
   - Performance de agentes
   - ROI de publicaciones destacadas

5. **Suscripciones**
   - Gestión de plan actual
   - Upgrade/downgrade
   - Facturación
   - Límites y uso

### Entregables Fase 3
- ✅ CRM funcional con dashboard
- ✅ Gestión de leads completa
- ✅ Analytics básico
- ✅ Sistema de suscripciones con MercadoPago
- ✅ Multi-tenant (empresas separadas)

---

## ⚡ Fase 4: Optimización

### 4.1 Performance

- [ ] Implementar ISR en listings
- [ ] Optimizar imágenes (WebP, AVIF)
- [ ] Lazy loading inteligente
- [ ] Code splitting
- [ ] Bundle analysis

### 4.2 SEO

- [ ] Metadata dinámica por página
- [ ] Sitemap.xml generado automáticamente
- [ ] Structured data (JSON-LD)
- [ ] Open Graph tags
- [ ] Canonical URLs

### 4.3 Testing

- [ ] Unit tests (Vitest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Visual regression tests

### 4.4 Monitoring

- [ ] Sentry error tracking
- [ ] Vercel Analytics
- [ ] Supabase Analytics
- [ ] Custom logging

### 4.5 Accesibilidad

- [ ] Audit con Lighthouse
- [ ] Keyboard navigation
- [ ] Screen reader testing
- [ ] ARIA labels
- [ ] Contrast checks

---

## 📅 Cronograma Estimado

```
┌─────────────┬──────────────────────────────────────────┐
│ Semana      │ Tareas                                   │
├─────────────┼──────────────────────────────────────────┤
│ 1           │ Fase 0: Setup Inicial                    │
├─────────────┼──────────────────────────────────────────┤
│ 2-3         │ Fase 1: @simple/ui + @simple/database    │
│ 4           │ Fase 1: @simple/auth + @simple/payments  │
├─────────────┼──────────────────────────────────────────┤
│ 5-6         │ Fase 2: SimpleAutos (Venta)              │
│ 7-8         │ Fase 2: SimpleAutos (Arriendo, Subastas) │
│ 9-10        │ Fase 2: SimplePropiedades                │
├─────────────┼──────────────────────────────────────────┤
│ 11-12       │ Fase 3: CRM (Dashboard, Leads)           │
│ 13-14       │ Fase 3: CRM (Analytics, Suscripciones)   │
├─────────────┼──────────────────────────────────────────┤
│ 15+         │ Fase 4: Optimización continua            │
└─────────────┴──────────────────────────────────────────┘

Total estimado: 14-16 semanas para MVP completo
```

---

## 🎯 Prioridades para el Primer Sprint (2 semanas)

### Sprint 1: Foundation Setup

**Semana 1:**
- [x] Crear estructura del monorepo
- [ ] Configurar Turborepo
- [ ] Conectar Supabase
- [ ] Crear esquema de base de datos inicial
- [ ] Configurar ESLint, Prettier
- [ ] Setup CI/CD básico

**Semana 2:**
- [ ] Crear @simple/ui con componentes base (Button, Card, Input)
- [ ] Crear @simple/database con client y queries básicas
- [ ] Crear @simple/auth con AuthContext
- [ ] Documentar arquitectura
- [ ] Crear primera app (simpleautos) con layout básico

### Criterios de Éxito Sprint 1
- ✅ Monorepo ejecutando `pnpm dev` exitosamente
- ✅ Autenticación funcionando (login/registro)
- ✅ Primera página con Header y Footer
- ✅ Documentación completa del plan

---

## 🚀 Siguiente Paso

Comenzar con **Fase 0: Setup Inicial**. Revisar el documento **05-GUIA-DESARROLLO.md** para convenciones de código y mejores prácticas.
