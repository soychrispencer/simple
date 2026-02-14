# Migration Guide - Simple Ecosystem

## 🎯 Objetivo

Migrar SimpleAutos desde su estructura actual a la nueva arquitectura de monorepo **sin perder ningún código ni funcionalidad**. Esta guía detalla cada paso del proceso.

---

## ⚠️ Principios Fundamentales

1. **NO ELIMINAR CÓDIGO:** Todo el código existente se conserva
2. **MIGRACIÓN GRADUAL:** Mover y refactorizar en pequeños pasos verificables
3. **TESTING CONTINUO:** Verificar funcionalidad después de cada cambio
4. **COMMITS FRECUENTES:** Git commit después de cada paso exitoso
5. **BACKUP:** Hacer backup completo antes de comenzar

---

## 📋 Pre-requisitos

- [ ] Backup completo de la carpeta `Simple/simpleautos`
- [ ] Git inicializado y último commit realizado
- [ ] Node.js 20+ instalado
- [ ] Supabase project activo (no usar local)
- [ ] Variables de entorno documentadas

---

## 🔄 Fases de Migración

### **FASE 0: Preparación** ⚡

#### Paso 0.1: Crear backup
```bash
cd c:\Users\chris\Desktop\Simple
# Crear copia de seguridad
xcopy simpleautos simpleautos-backup /E /I /H /Y
```

#### Paso 0.2: Verificar Git status
```bash
cd simpleautos
git status
git add .
git commit -m "checkpoint: pre-migration state"
```

#### Paso 0.3: Documentar estado actual
- [ ] Anotar todas las variables de entorno en uso
- [ ] Listar todas las dependencias del package.json
- [ ] Documentar rutas críticas de la aplicación
- [ ] Screenshot de la app funcionando

---

### **FASE 1: Crear Estructura Base** 🏗️

#### Paso 1.1: Crear carpetas del monorepo
```bash
cd c:\Users\chris\Desktop\Simple

# Crear estructura
mkdir apps
mkdir packages
mkdir backend
mkdir scripts
# docs ya existe
```

#### Paso 1.2: Crear package.json raíz
Crear `c:\Users\chris\Desktop\Simple\package.json`

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
    "dev:autos": "npm run dev --workspace=simpleautos",
    "build:autos": "npm run build --workspace=simpleautos",
    "lint": "npm run lint --workspaces --if-present"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### Paso 1.3: Crear .gitignore raíz
```bash
# .gitignore
node_modules/
.next/
.env*.local
.DS_Store
*.log
dist/
build/
.turbo/
```

#### Paso 1.4: Verificar estructura
```bash
dir
# Debe mostrar: apps, packages, backend, docs, scripts, simpleautos, package.json
```

---

### **FASE 2: Mover SimpleAutos** 📦

#### Paso 2.1: Mover carpeta completa
```bash
# Windows CMD
move simpleautos apps\simpleautos

# Verificar
dir apps
# Debe mostrar: simpleautos
```

#### Paso 2.2: Actualizar package.json de SimpleAutos
Editar `apps\simpleautos\package.json`:

```json
{
  "name": "simpleautos",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    // ... todas las dependencias actuales se mantienen igual
  }
}
```

#### Paso 2.3: Probar que sigue funcionando
```bash
cd apps\simpleautos
npm install
npm run dev
```

**✅ Checkpoint:** La app debe correr en http://localhost:3001 igual que antes

#### Paso 2.4: Commit
```bash
git add .
git commit -m "chore: move simpleautos to apps/ directory"
```

---

### **FASE 3: Crear Packages Base** 📚

#### Paso 3.1: Crear estructura de @simple/config

```bash
cd c:\Users\chris\Desktop\Simple
mkdir packages\config
cd packages\config
```

Crear `packages\config\package.json`:
```json
{
  "name": "@simple/config",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./theme": "./src/theme.ts",
    "./colors": "./src/colors.ts"
  },
  "dependencies": {
    "typescript": "^5.0.0"
  }
}
```

Crear `packages\config\src\index.ts`:
```typescript
export * from './theme';
export * from './colors';
export * from './constants';
```

Crear `packages\config\src\theme.ts`:
```typescript
export const verticalThemes = {
  autos: {
    name: 'SimpleAutos',
    primary: '#FF3600',
    domain: 'simpleautos.app',
  },
  properties: {
    name: 'SimplePropiedades',
    primary: '#3232FF',
    domain: 'simplepropiedades.app',
  },
  stores: {
    name: 'SimpleTiendas',
    primary: '#7A5CFF',
    domain: 'simpletiendas.app',
  },
  food: {
    name: 'SimpleFood',
    primary: '#FFB800',
    domain: 'simplefood.app',
  },
} as const;

export type VerticalName = keyof typeof verticalThemes;
export type VerticalTheme = typeof verticalThemes[VerticalName];
```

Crear `packages\config\src\colors.ts`:
```typescript
export const sharedColors = {
  // Light mode
  lightbg: '#F8F8F8',
  lightcard: '#FFFFFF',
  lighttext: '#0C0C0C',
  lightmuted: '#5B5B5B',
  lightborder: '#D8D6D2',
  // Dark mode
  darkbg: '#0F0F10',
  darkcard: '#161616',
  darktext: '#F4F4F5',
  darkmuted: '#9E9EA4',
  darkborder: '#2A2A2F',
  accent: '#0F9D92',
} as const;
```

Crear `packages\config\src\constants.ts`:
```typescript
export const APP_NAME = 'Simple';
export const SUPPORT_EMAIL = 'support@simple.com';
export const ITEMS_PER_PAGE = 20;
```

Crear `packages\config\tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Paso 3.2: Instalar en root
```bash
cd c:\Users\chris\Desktop\Simple
npm install
```

**✅ Checkpoint:** No debe haber errores de instalación

---

### **FASE 4: Extraer Componentes a @simple/ui** 🎨

#### Paso 4.1: Crear estructura de @simple/ui

```bash
cd c:\Users\chris\Desktop\Simple\packages
mkdir ui
cd ui
mkdir src
cd src
mkdir components
mkdir styles
```

Crear `packages\ui\package.json`:
```json
{
  "name": "@simple/ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./layout": "./src/components/layout/index.ts",
    "./forms": "./src/components/forms/index.ts",
    "./cards": "./src/components/cards/index.ts"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.2.0",
    "@simple/config": "workspace:*",
    "next": "15.4.7",
    "next-themes": "^0.4.6"
  },
  "devDependencies": {
    "@types/react": "^19.1.12",
    "typescript": "^5.0.0"
  }
}
```

#### Paso 4.2: Copiar Header (primer componente)

**Copiar** `apps\simpleautos\src\components\layout\Header.tsx` a `packages\ui\src\components\layout\Header.tsx`

Modificar para hacerlo genérico:
```typescript
// packages/ui/src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { verticalThemes } from '@simple/config';

interface HeaderProps {
  vertical: keyof typeof verticalThemes;
}

export function Header({ vertical }: HeaderProps) {
  const theme = verticalThemes[vertical];
  const { theme: colorMode, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-lightcard dark:bg-darkcard border-b border-lightborder dark:border-darkborder">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span 
              className="text-2xl font-bold"
              style={{ color: theme.primary }}
            >
              {theme.name}
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/ventas">Comprar</Link>
            <Link href="/arriendos">Arrendar</Link>
            <Link href="/subastas">Subastas</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(colorMode === 'dark' ? 'light' : 'dark')}
              className="p-2"
            >
              {colorMode === 'dark' ? '🌞' : '🌙'}
            </button>
            <button 
              className="px-4 py-2 rounded-lg"
              style={{ 
                backgroundColor: theme.primary,
                color: '#fff' 
              }}
            >
              Publicar
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

Crear `packages\ui\src\components\layout\index.ts`:
```typescript
export { Header } from './Header';
// export { Footer } from './Footer'; // Próximamente
```

#### Paso 4.3: Actualizar SimpleAutos para usar @simple/ui

Agregar dependencia en `apps\simpleautos\package.json`:
```json
{
  "dependencies": {
    "@simple/ui": "workspace:*",
    "@simple/config": "workspace:*",
    // ... resto de dependencias
  }
}
```

Instalar:
```bash
cd c:\Users\chris\Desktop\Simple
npm install
```

Actualizar `apps\simpleautos\src\app\layout.tsx`:
```typescript
import { Header } from '@simple/ui';
// ... resto de imports

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Header vertical="autos" />
            {children}
            {/* <Footer /> cuando esté listo */}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### Paso 4.4: Probar
```bash
cd apps\simpleautos
npm run dev
```

**✅ Checkpoint:** Header debe verse y funcionar igual que antes

#### Paso 4.5: Commit
```bash
git add .
git commit -m "feat: extract Header component to @simple/ui"
```

---

### **FASE 5: Extraer más Componentes** (Iterativo)

Repetir el proceso de Fase 4 para cada componente:

**Orden sugerido:**
1. ✅ Header (ya hecho)
2. Footer
3. Button
4. Input
5. Select
6. AuthModal
7. ToastProvider
8. ListingCard (hacer genérica)
9. Panel components

**Para cada componente:**
1. Copiar a packages/ui
2. Hacerlo genérico (remover lógica específica de autos)
3. Actualizar imports en SimpleAutos
4. Probar
5. Commit

---

### **FASE 6: Crear @simple/auth** 🔐

#### Paso 6.1: Estructura
```bash
mkdir packages\auth
cd packages\auth
mkdir src
cd src
mkdir context
mkdir hooks
mkdir utils
```

#### Paso 6.2: Mover AuthContext

**Copiar** `apps\simpleautos\src\context\AuthContext.tsx` a `packages\auth\src\context\AuthContext.tsx`

Hacerlo independiente de la vertical:
```typescript
// packages/auth/src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  // ... resto de métodos
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children,
  supabaseClient, // Inyectar cliente
}: {
  children: React.ReactNode;
  supabaseClient: any; // Tipo específico
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ... lógica de auth

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### Paso 6.3: Actualizar SimpleAutos
```typescript
// apps/simpleautos/src/app/layout.tsx
import { AuthProvider } from '@simple/auth';
import { createBrowserClient } from '@/lib/supabase/supabase-browser';

export default function RootLayout({ children }) {
  const supabase = createBrowserClient();
  
  return (
    <AuthProvider supabaseClient={supabase}>
      {children}
    </AuthProvider>
  );
}
```

---

### **FASE 7: Backend en Inglés** 🗄️

#### Paso 7.1: Mover configuración de Supabase
```bash
cd c:\Users\chris\Desktop\Simple
mkdir backend\supabase
move apps\simpleautos\supabase\* backend\supabase\
```

#### Paso 7.2: Crear schema en inglés

Crear `backend\database\schema\base.sql`:
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  vertical TEXT NOT NULL CHECK (vertical IN ('autos', 'properties', 'stores')),
  account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'business')),
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vertical TEXT NOT NULL CHECK (vertical IN ('autos', 'properties', 'stores')),
  listing_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'rented', 'archived')),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'CLP',
  location_country TEXT,
  location_region TEXT,
  location_city TEXT,
  views_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listings_vertical ON public.listings(vertical);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listings_featured ON public.listings(is_featured, featured_until) WHERE is_featured = TRUE;
```

Crear `backend\database\schema\vehicles.sql`:
```sql
-- Vehicles table (extends listings)
CREATE TABLE IF NOT EXISTS public.vehicles (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
  condition TEXT NOT NULL CHECK (condition IN ('new', 'used')),
  mileage INT,
  fuel_type TEXT,
  transmission TEXT,
  body_type TEXT,
  doors INT,
  seats INT,
  color_exterior TEXT,
  color_interior TEXT,
  vin TEXT,
  engine_size TEXT,
  horsepower INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vehicles_make_model ON public.vehicles(make, model);
CREATE INDEX idx_vehicles_year ON public.vehicles(year);
```

Crear `backend\database\schema\properties.sql`:
```sql
-- Properties table (extends listings)
CREATE TABLE IF NOT EXISTS public.properties (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'apartment', 'commercial', 'land', 'office')),
  bedrooms INT,
  bathrooms NUMERIC,
  area_size NUMERIC NOT NULL,
  area_unit TEXT DEFAULT 'm2' CHECK (area_unit IN ('m2', 'ft2')),
  lot_size NUMERIC,
  year_built INT,
  parking_spaces INT DEFAULT 0,
  has_elevator BOOLEAN DEFAULT FALSE,
  floor_number INT,
  total_floors INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_properties_type ON public.properties(property_type);
CREATE INDEX idx_properties_bedrooms ON public.properties(bedrooms);
```

#### Paso 7.3: Crear migration script

Crear `backend\database\migrations\001_initial_schema.sql`:
```sql
-- Migración completa desde español a inglés
-- IMPORTANTE: Este script mapea las tablas existentes a la nueva estructura

BEGIN;

-- Crear nuevas tablas con schema en inglés (si no existen)
\i ../schema/base.sql
\i ../schema/vehicles.sql
\i ../schema/properties.sql

-- Migrar datos existentes de vehiculos a vehicles
INSERT INTO public.vehicles (
  listing_id,
  make,
  model,
  year,
  condition,
  mileage,
  fuel_type,
  transmission,
  body_type,
  doors,
  seats,
  color_exterior,
  color_interior
)
SELECT 
  id as listing_id,
  marca as make,
  modelo as model,
  anio as year,
  condicion as condition,
  kilometraje as mileage,
  combustible as fuel_type,
  transmision as transmission,
  tipo_vehiculo as body_type,
  puertas as doors,
  asientos as seats,
  color_exterior,
  color_interior
FROM public.vehiculos
WHERE NOT EXISTS (SELECT 1 FROM public.vehicles WHERE listing_id = vehiculos.id);

-- Etc para otras tablas...

COMMIT;
```

#### Paso 7.4: Aplicar migración
```bash
# Conectar a Supabase remoto y ejecutar
# CUIDADO: Hacer backup de la BD antes
```

---

### **FASE 8: Crear SimplePropiedades** 🏡

#### Paso 8.1: Copiar estructura de SimpleAutos
```bash
cd c:\Users\chris\Desktop\Simple\apps
xcopy simpleautos simplepropiedades /E /I /H
```

#### Paso 8.2: Actualizar package.json
```json
{
  "name": "simplepropiedades",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@simple/ui": "workspace:*",
    "@simple/auth": "workspace:*",
    "@simple/config": "workspace:*",
    // ... resto
  }
}
```

#### Paso 8.3: Crear configuración de vertical
Crear `apps\simplepropiedades\src\config\vertical.ts`:
```typescript
import { verticalThemes } from '@simple/config';

export const verticalConfig = {
  name: 'properties' as const,
  theme: verticalThemes.properties,
  features: {
    sales: true,
    rentals: true,
    auctions: false, // No hay subastas de propiedades
  },
  listingTypes: ['sale', 'rent'] as const,
};
```

#### Paso 8.4: Actualizar layout
```typescript
// apps/simplepropiedades/src/app/layout.tsx
import { Header } from '@simple/ui';
import { verticalConfig } from '@/config/vertical';

export const metadata = {
  title: 'SimplePropiedades',
  description: 'Compra y arriendo de propiedades',
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider theme={verticalConfig.theme}>
          <AuthProvider vertical={verticalConfig.name}>
            <Header vertical="properties" />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### Paso 8.5: Adaptar tipos específicos
Crear `apps\simplepropiedades\src\types\property.ts`:
```typescript
import type { Property } from '@simple/shared-types';

export interface Property {
  listing_id: string;
  property_type: 'house' | 'apartment' | 'commercial' | 'land' | 'office';
  bedrooms: number;
  bathrooms: number;
  area_size: number;
  area_unit: 'm2' | 'ft2';
  // ... resto
}

export interface PropertyListing {
  id: string;
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  property: Property;
}
```

#### Paso 8.6: Crear componentes específicos
```typescript
// apps/simplepropiedades/src/components/PropertyCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@simple/ui';
import type { PropertyListing } from '@/types/property';

export function PropertyCard({ property }: { property: PropertyListing }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{property.title ?? 'Propiedad'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <span>{property.property.bedrooms} dormitorios</span>
          <span>{property.property.bathrooms} baños</span>
          <span>{property.property.area_size} m²</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Paso 8.7: Probar
```bash
cd apps\simplepropiedades
npm install
npm run dev -- --port 3002
```

**✅ Checkpoint:** SimplePropiedades debe funcionar en http://localhost:3002

---

## 🧪 Testing y Validación

### Checklist de Testing Post-Migración

#### SimpleAutos
- [ ] Home page carga correctamente
- [ ] Búsqueda de vehículos funciona
- [ ] Listado de vehículos se muestra
- [ ] Login/Register funciona
- [ ] Crear nuevo vehículo funciona
- [ ] Upload de imágenes funciona
- [ ] Panel de usuario funciona
- [ ] Sistema de pagos funciona
- [ ] Notificaciones funcionan
- [ ] Dark mode funciona

#### SimplePropiedades
- [ ] Home page carga
- [ ] Búsqueda de propiedades funciona
- [ ] Listado de propiedades se muestra
- [ ] Login compartido funciona (mismo usuario en ambas verticales)
- [ ] Crear nueva propiedad funciona
- [ ] Tema verde se aplica correctamente

#### Compartido
- [ ] Componentes UI se ven consistentes en ambas verticales
- [ ] Autenticación compartida funciona
- [ ] Base de datos tiene estructura correcta en inglés
- [ ] Todas las dependencias instaladas correctamente
- [ ] No hay errores en consola
- [ ] Build de producción funciona para ambas apps

---

## 🚨 Troubleshooting

### Error: Cannot find module '@simple/ui'

**Solución:**
```bash
cd c:\Users\chris\Desktop\Simple
npm install
```

### Error: Type errors en imports

**Solución:** Verificar que todos los `tsconfig.json` estén configurados correctamente con paths.

### Error: Supabase no conecta

**Solución:** Verificar que las variables de entorno estén correctamente configuradas en cada vertical.

### CSS no se carga

**Solución:** Verificar que Tailwind config incluya los paths de packages:
```javascript
content: [
  './src/**/*.{js,ts,jsx,tsx}',
  '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
],
```

---

## ⚙️ Migrar boosts legacy al nuevo esquema

1. **Preparar entorno**: exporta/define `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` antes de ejecutar.
2. **Dry run**: `node scripts/supabase/migrate_vehicle_boosts.mjs` valida cuántos boosts se migrarán y si existen slots sin mapping.
3. **Aplicar**: `node scripts/supabase/migrate_vehicle_boosts.mjs --apply` crea/actualiza filas en `listing_boosts` y sincroniza `listing_boost_slots` usando las fechas del boost legacy.
4. **Verificar**: el script imprime un resumen; confirma que los registros migrados poseen `metadata.legacy_boost_id`.
5. **Ajustar slots**: si se listan slots desconocidos, edita `LEGACY_SLOT_KEY_MAP` dentro del script y repite.

---

## 📊 Progreso de Migración

### Componentes Migrados a Packages

**@simple/ui:**
- [ ] Header
- [ ] Footer
- [ ] Button
- [ ] Input
- [ ] Select
- [ ] Textarea
- [ ] AuthModal
- [ ] ToastProvider
- [ ] ListingCard
- [ ] Panel components

**@simple/auth:**
- [ ] AuthContext
- [ ] useAuth hook
- [ ] Auth utilities

**@simple/config:**
- [x] Theme system
- [x] Colors
- [x] Constants

**Supabase (por vertical):**
- [x] Cliente Supabase en cada app (`src/lib/supabase/*`)
- [x] Types de dominio compartidos en `@simple/shared-types`

---

## ✅ Definition of Done

La migración está completa cuando:

1. ✅ SimpleAutos funciona 100% desde `apps/simpleautos`
2. ✅ SimplePropiedades funciona al 100%
3. ✅ Al menos 80% de componentes UI están en packages
4. ✅ Sistema de auth es compartido
5. ✅ Backend está en inglés y documentado
6. ✅ Ambas verticales comparten el mismo diseño base
7. ✅ Tests pasan en ambas verticales
8. ✅ Builds de producción funcionan
9. ✅ Documentación está actualizada
10. ✅ No hay código duplicado innecesariamente

---

**Última Actualización:** 11 de noviembre de 2025
