# Architecture - Simple Ecosystem

## 🏗️ Arquitectura General

El ecosistema Simple sigue una arquitectura de **Monorepo Modular** donde:
- Las **verticales** (apps) son independientes pero comparten código
- Los **packages** contienen código reutilizable
- El **backend** es unificado para todas las verticales
- Cada vertical tiene su propio dominio y deployment

```
┌─────────────────────────────────────────────────────────┐
│                     Monorepo Root                       │
│                   (Simple/)                             │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐      ┌────▼────┐     ┌────▼────┐
    │  apps/  │      │packages/│     │backend/ │
    └─────────┘      └─────────┘     └─────────┘
         │                │                │
    ┌────┼────┐      ┌────┼────────────┐  │
    │    │    │      │    │    │    │  │  │
    ▼    ▼    ▼      ▼    ▼    ▼    ▼  ▼  ▼
 autos props stores ui auth db utils  supabase
```

---

## 📦 Monorepo con npm Workspaces

### Configuración Root `package.json`

```json
{
  "name": "simple-ecosystem",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/simpleautos",
    "dev:autos": "npm run dev --workspace=apps/simpleautos",
    "dev:props": "npm run dev --workspace=apps/simplepropiedades",
    "build": "npm run build --workspaces --if-present",
    "build:autos": "npm run build --workspace=apps/simpleautos",
    "build:props": "npm run build --workspace=apps/simplepropiedades",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "turbo": "^2.0.0"
  }
}
```

### Estructura de Workspaces

Cada package y app tiene su propio `package.json`:

**Package Example:** `packages/ui/package.json`
```json
{
  "name": "@simple/ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./layout": "./src/components/layout/index.ts",
    "./forms": "./src/components/forms/index.ts"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@simple/config": "*"
  }
}
```

**App Example:** `apps/simpleautos/package.json`
```json
{
  "name": "simpleautos",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "next": "16.0.10",
    "react": "^19.1.0",
    "@simple/ui": "*",
    "@simple/auth": "*",
    "@simple/config": "*",
    "@simple/shared-types": "*",
    "@simple/listings": "*"
  }
}
```

---

## 🎨 Packages Compartidos

### 1. `@simple/ui` - Componentes UI

```typescript
// packages/ui/src/index.ts (entrypoint)
// Importa todo desde un único lugar: '@simple/ui'

// Uso en una vertical
import { Header, Footer, Button, FormInput as Input } from '@simple/ui';
```

**Estructura:**
```
packages/ui/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── index.ts
│   │   ├── forms/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── index.ts
│   │   └── ...
│   ├── styles/
│   │   └── globals.css
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 2. `@simple/config` - Configuraciones y Temas

```typescript
// packages/config/src/theme.ts
export const verticalThemes = {
  autos: {
    primary: '#FFB600',
    name: 'SimpleAutos',
    domain: 'simpleautos.com',
  },
  properties: {
    primary: '#009BA3',
    name: 'SimplePropiedades',
    domain: 'simplepropiedades.com',
  },
  stores: {
    primary: '#7A5CFF',
    name: 'SimpleTiendas',
    domain: 'simpletiendas.com',
  },
  food: {
    primary: '#FFB800',
    name: 'SimpleFood',
    domain: 'simplefood.com',
  },
};

export const sharedColors = {
  lightbg: '#F8F8F8',
  lightcard: '#FFFFFF',
  lighttext: '#0C0C0C',
  lightmuted: '#5B5B5B',
  lightborder: '#D8D6D2',
  darkbg: '#0F0F10',
  darkcard: '#161616',
  darktext: '#F4F4F5',
  darkmuted: '#9E9EA4',
  darkborder: '#2A2A2F',
  accent: '#0F9D92',
};

// Uso
import { verticalThemes } from '@simple/config';
const theme = verticalThemes[vertical];
```

### 3. `@simple/auth` - Sistema de Autenticación

```typescript
// packages/auth/src/context/AuthContext.tsx
export const AuthProvider: React.FC<Props> = ({ children, vertical }) => {
  // Lógica de autenticación compartida
};

// packages/auth/src/hooks/useAuth.ts
export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};

// Uso en vertical
import { AuthProvider, useAuth } from '@simple/auth';
```

### 4. Supabase - Cliente y Tipos

En este monorepo, el cliente de Supabase vive **dentro de cada vertical** (app), bajo `src/lib/supabase/*`.

```typescript
// apps/<vertical>/src/lib/supabase/supabase.ts
export function getSupabaseClient() {
  // createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Uso
import { getSupabaseClient } from '@/lib/supabase/supabase';
const supabase = getSupabaseClient();
```

Para tipos compartidos entre verticales (dominio), usamos `@simple/shared-types`:

```typescript
import type { Profile } from '@simple/shared-types';
```

### 5. Pagos

Las integraciones de pago se implementan por vertical via rutas `app/api/payments/*` (por ejemplo webhooks), evitando un paquete “payments” genérico hasta que exista una abstracción realmente común.

### 6. Utilidades

Preferimos utilidades colocadas por contexto:
- En cada app: `src/lib/*`.
- Si es realmente transversal: mover a un paquete `@simple/*` con entrypoint único y `exports` explícitos.

---

## 🚀 Verticales (Apps)

Cada vertical es una aplicación Next.js independiente.

### Modelo multi-vertical
- **Usuarios únicos:** `public.profiles` extiende `auth.users`. Este registro representa la identidad global y nunca se duplica.
- **Verticales declaradas:** `public.verticals (id, name, key)` actúa como catálogo maestro. Cada feature frontend consulta primero este catálogo para conocer branding y capacidades.
- **Empresas y permisos:** `public.companies` almacena la entidad empresarial. `public.company_users` vincula usuarios ↔ empresas con `role (owner|admin|member)` y `permissions` JSONB. Un usuario puede pertenecer a múltiples empresas y cada empresa puede estar activa solo en algunas verticales.
- **Listados genéricos:** `public.listings` ahora referencia `vertical_id`, `company_id` y `user_id`. Las tablas 1:1 (`listings_vehicles`, `listings_properties`, `listings_food`, ...) guardan los campos específicos sin romper reutilización.
- **Contexto en frontend:** `VerticalContext` (en construcción) entregará `{ profile, companies, currentCompany, vertical }`. Además se complementará con `PanelShellContext` para exponer módulos habilitados.
- **API awareness:** todas las rutas server-side reciben `verticalKey` + `companyId`. Los servicios comparten `ListingService` base y añaden joins condicionales según vertical.
- **Seguridad:** las políticas RLS usan `auth.uid()` y `company_id`. Solo miembros de la empresa ven y editan registros internos; el resto ve datos públicos (`status = 'active'`).

#### PanelShell & módulos dinámicos
- `PanelShell` se importa desde `@simple/ui` y es el contenedor único del panel. Cada app registrará sus módulos (sidebar item + componente) mediante un manifiesto `panelModules.ts`.
- `PanelSidebar` dejará de tener arrays hardcodeados y en su lugar leerá el manifiesto compartido, aplicando permisos y etiquetas según `company_users`.
- Cada vertical ya cuenta con `apps/<vertical>/src/panelModules.ts`, donde se declaran secciones del sidebar, widgets de dashboard y atajos rápidos junto con su estado (`active`, `beta`, `planned`).
- El CRM se integra como un módulo más, lo que permite habilitar o deshabilitar secciones por vertical sin duplicar layouts.

> Para agregar una nueva vertical: 1) crear entrada en `@simple/config` + `verticals` table, 2) generar tabla específica `listings_<vertical>`, 3) añadir tema/tokens/Tailwind, 4) registrar rutas y componentes.

### Configuración de Vertical

**`apps/simpleautos/src/config/vertical.ts`**
```typescript
import { verticalThemes } from '@simple/config';

export const verticalConfig = {
  name: 'autos',
  theme: verticalThemes.autos,
  features: {
    sales: true,
    rentals: true,
    auctions: true,
  },
  listingTypes: ['sale', 'rent', 'auction'] as const,
};

export type VerticalConfig = typeof verticalConfig;
```

### Importación de Packages

```typescript
// apps/simpleautos/src/app/layout.tsx
import { Header, Footer } from '@simple/ui';
import { AuthProvider } from '@simple/auth';
import { ThemeProvider } from '@simple/config';
import { verticalConfig } from '@/config/vertical';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider theme={verticalConfig.theme}>
          <AuthProvider vertical={verticalConfig.name}>
            <Header />
            {children}
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Componentes Específicos

Cada vertical tiene sus propios componentes específicos:

```
apps/simpleautos/src/components/
├── vehicle-wizard/        # Específico de autos
├── vehicle-card/          # Específico de autos
└── filters/               # Filtros específicos de autos
```

---

## 🔧 Backend Unificado

### Estructura de Base de Datos

```sql
-- Tabla genérica de listados
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  vertical TEXT NOT NULL CHECK (vertical IN ('autos', 'properties', 'stores')),
  listing_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- Campos comunes...
);

-- Tabla específica de vehículos
CREATE TABLE public.vehicles (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  -- Campos específicos de vehículos...
);

-- Tabla específica de propiedades
CREATE TABLE public.properties (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  property_type TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  -- Campos específicos de propiedades...
);
```

### Row Level Security (RLS)

```sql
-- Política para ver listados activos
CREATE POLICY "Anyone can view active listings"
ON public.listings
FOR SELECT
USING (status = 'active');

-- Política para editar propios listados
CREATE POLICY "Users can update their own listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = user_id);
```

### API Routes

Las verticales comparten la estructura de API:

```
apps/[vertical]/src/app/api/
├── auth/
│   ├── login/route.ts
│   ├── register/route.ts
│   └── logout/route.ts
├── listings/
│   ├── route.ts              # GET, POST
│   └── [id]/route.ts         # GET, PUT, DELETE
├── payments/
│   ├── create/route.ts
│   └── webhook/route.ts
└── profile/
    └── route.ts
```

Pero usan queries compartidas:

```typescript
// apps/<vertical>/src/lib/listings/getListingsByVertical.ts
import { getSupabaseClient } from '@/lib/supabase/supabase';

export async function getListingsByVertical(verticalKey: string) {
  const supabase = getSupabaseClient();
  return supabase
    .from('listings')
    .select('*, profiles(*)')
    .eq('vertical', verticalKey)
    .eq('status', 'active');
}
```

---

## 🎭 Sistema de Temas

### Tailwind Configuration

Cada vertical extiende la configuración base:

**`packages/config/src/tailwind-preset.js`**
```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Se inyecta dinámicamente el color primario
        lightbg: '#F8F8F8',
        lightcard: '#FFFFFF',
        lighttext: '#0C0C0C',
        lightborder: '#D8D6D2',
        darkbg: '#0F0F10',
        darkcard: '#161616',
        darktext: '#F4F4F5',
        darkborder: '#2A2A2F',
        accent: '#0F9D92',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
    },
  },
};
```

**`apps/simpleautos/tailwind.config.js`**
```javascript
const preset = require('@simple/config/tailwind-preset');

module.exports = {
  presets: [preset],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFB600', // Color específico de SimpleAutos
      },
    },
  },
};
```

### Dynamic Theme Provider

```typescript
// packages/config/src/ThemeProvider.tsx
export const ThemeProvider: React.FC<Props> = ({ theme, children }) => {
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', theme.primary);
  }, [theme]);

  return <>{children}</>;
};
```

---

## 🔄 Data Flow

### 1. Autenticación
```
Usuario → AuthModal (@simple/ui)
  → useAuth (@simple/auth)
    → Supabase Auth (cliente por vertical)
      → Backend (Supabase)
        → Response → AuthContext actualizado
```

### 2. Creación de Listado
```
Usuario → ListingForm (vertical específico)
  → Usa inputs de @simple/ui
    → Tipos compartidos con @simple/shared-types
      → API Route (/api/listings)
        → Mutations/Helpers compartidas (@simple/listings)
          → Backend Supabase
            → Trigger para notificaciones
              → Response → UI actualizado
```

### 3. Pago
```
Usuario → Botón de pago (UI)
  → Servicio de pagos (integración externa)
    → API Route (/api/payments/create)
      → MercadoPago API
        → Redirect → Webhook
          → Update payment status
            → Update listing boost
```

---

## 📁 Imports y Paths

### TypeScript Paths Configuration

Los paquetes `@simple/*` se resuelven como dependencias normales (npm workspaces) y se controlan además por `exports` de cada paquete. No necesitamos `paths` para ellos.

**Vertical `tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 🚦 Estado y Cache

### Server Components (Default)
```typescript
// app/page.tsx - Server Component
import { fetchFeaturedBySlot } from '@/lib/fetchFeaturedBySlot';

export default async function Page() {
  const featured = await fetchFeaturedBySlot('home_hero');
  return <ListingsGrid listings={featured} />;
}
```

### Client Components (Cuando se necesita)
```typescript
'use client';

import { useAuth } from '@simple/auth';

export function UserMenu() {
  const { user, logout } = useAuth();
  // ...
}
```

### Cache Strategy
```typescript
// src/lib/cache/featured.ts
export async function fetchFeaturedBySlotCached(slot: string) {
  return unstable_cache(
    async () => {
      // Query...
    },
    [`featured-${slot}`],
    {
      revalidate: 60, // 1 minuto
      tags: ['listings'],
    }
  )();
}
```

---

## 🔐 Variables de Entorno

### Shared `.env.example`
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=xxx
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=noreply@simpleautos.com
SMTP_PASS=xxx

# Vertical Specific
NEXT_PUBLIC_VERTICAL=autos
NEXT_PUBLIC_APP_URL=https://simpleautos.com
```

Cada vertical tiene su propio `.env.local` con su configuración específica.

---

## 📊 Monitoring y Logs

```typescript
// packages/utils/src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { 
    service: process.env.NEXT_PUBLIC_VERTICAL,
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    // Agregar Sentry, etc.
  ],
});

// Uso en cualquier parte
import { logger } from '@simple/utils';
logger.info('Listing created', { listingId, userId });
```

---

## 🔄 Migration Strategy

1. **Phase 1:** Crear packages vacíos
2. **Phase 2:** Mover componentes uno por uno
3. **Phase 3:** Actualizar imports en SimpleAutos
4. **Phase 4:** Mover SimpleAutos a apps/
5. **Phase 5:** Crear SimplePropiedades usando packages
6. **Phase 6:** Iterar y optimizar

**Sin pérdida de código:** Todo el código actual se conserva, solo se reorganiza y se hace más reutilizable.

---

**Última Actualización:** 11 de noviembre de 2025
