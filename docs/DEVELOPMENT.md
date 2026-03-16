# Development Guide 🚀

**Para desarrolladores que trabajan en SimpleV2**

---

## Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env.local (ver template abajo)
# 3. Iniciar todo
npm run dev:all

# 4. Abrir navegadores
# SimpleAutos:       http://localhost:3000
# SimplePropiedades: http://localhost:3001
# SimpleAdmin:       http://localhost:3002
# SimplePlataforma:  http://localhost:3003
# API:               http://localhost:4000 (sin UI)
```

---

## Scripts disponibles

```bash
# DESARROLLO
npm run dev:all            # Todas las apps + API simultaneamente
npm run dev:autos          # Solo SimpleAutos
npm run dev:propiedades    # Solo SimplePropiedades
npm run dev:simpleadmin    # Solo SimpleAdmin
npm run dev:simpleplataforma # Solo SimplePlataforma
npm run dev:api            # Solo API backend

# CONSTRUCCIÓN
npm run build              # Build todas las apps
npm run build:autos        # Build SimpleAutos
npm run start              # Start en producción

# LINTING & VALIDACIÓN
npm run lint               # ESLint all workspaces
npm run type-check         # TypeScript check

# DATABASE (cuando esté implementado)
npm run db:generate        # Generar migrations
npm run db:migrate         # Ejecutar migrations
npm run db:push            # Push schema a DB
npm run db:studio          # Drizzle Studio UI
```

---

## Agregar una nueva página/ruta

### SimpleAutos Example: Nueva ruta `/panel/mensajes`

1. **Crear archivo:**
   ```
   apps/simpleautos/src/app/panel/mensajes/page.tsx
   ```

2. **Scaffold básico:**
   ```typescript
   'use client';
   import { useContext } from 'react';
   import { AuthContext } from '@/context/auth-context';
   import { IconMessageCircle } from '@tabler/icons-react';

   export default function MessagesPage() {
     const { user } = useContext(AuthContext);
     
     if (!user) return <div>Debes iniciar sesión</div>;

     return (
       <div className="container-app py-20">
         <h1 className="text-3xl font-bold mb-8">
           <IconMessageCircle className="inline mr-2" />
           Tus Mensajes
         </h1>
         {/* Contenido */}
       </div>
     );
   }
   ```

3. **Agregar al nav (si aplica):**
   ```typescript
   // apps/simpleautos/src/app/layout.tsx
   const NAV_ITEMS = [
     // ...
     { label: 'Mensajes', href: '/panel/mensajes' }
   ];
   ```

4. **Testear:**
   - `npm run dev:autos`
   - Visit http://localhost:3000/panel/mensajes

---

## Estructura de carpetas por App

```
apps/simpleautos/
├── src/
│   ├── app/
│   │   ├── layout.tsx           Layout principal
│   │   ├── globals.css          Estilos globales
│   │   ├── page.tsx             / Página inicio
│   │   ├── ventas/
│   │   │   └── page.tsx         /ventas
│   │   ├── arriendos/
│   │   │   └── page.tsx         /arriendos
│   │   ├── subastas/
│   │   │   └── page.tsx         /subastas
│   │   ├── vehiculo/
│   │   │   └── [slug]/
│   │   │       └── page.tsx     /vehiculo/[slug]
│   │   ├── perfil/
│   │   │   └── [username]/
│   │   │       └── page.tsx     /perfil/[username]
│   │   ├── feed/
│   │   │   └── page.tsx         /feed
│   │   ├── panel/
│   │   │   ├── layout.tsx       Sidebar + persistente
│   │   │   └── page.tsx         /panel Dashboard
│   │   │   ├── publicar/
│   │   │   ├── publicaciones/
│   │   │   ├── guardados/
│   │   │   ├── crm/
│   │   │   ├── boost/
│   │   │   ├── notificaciones/
│   │   │   └── instagram/
│   │   │
│   │   ├── api/                 API routes (si es necesario)
│   │   └── (auth)/              Route group para auth
│   │
│   ├── components/
│   │   ├── hero-banner.tsx      Componentes específicos app
│   │   ├── filter-sidebar.tsx
│   │   ├── listing-card.tsx
│   │   └── ...
│   │
│   ├── context/
│   │   └── auth-context.tsx
│   │
│   ├── lib/
│   │   ├── api-client.ts        Funciones fetch a /api
│   │   ├── hooks.ts             Custom hooks
│   │   └── utils.ts             Utilities
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useListing.ts
│   │   └── ...
│   │
│   └── types/
│       └── index.ts             Types locales (si hay)
│
├── public/
│   ├── seeds/                   Datos seed
│   ├── images/                  Imágenes estáticas
│   └── icons/
│
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── package.json
```

---

## Agregar una nueva API endpoint

### Ejemplo: `POST /api/listings` (crear publicación)

1. **Agregt al backend (`services/api/src/index.ts`):**
   ```typescript
   import { z } from 'zod';

   // Schema de validación
   const createListingSchema = z.object({
     vertical: z.enum(['autos', 'propiedades']),
     title: z.string().min(3).max(220),
     description: z.string().max(6000),
     price: z.string().min(1),
     location: z.string().optional(),
   });

   // Endpoint
   app.post('/api/listings', (c) => {
     const user = authUser(c);
     if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

     const body = await c.req.json();
     const parsed = createListingSchema.safeParse(body);
     
     if (!parsed.success) {
       return c.json({ 
         ok: false, 
         errors: parsed.error.flatten() 
       }, 400);
     }

     const { vertical, title, description, price, location } = parsed.data;

     // TODO: Cuando esté BD:
     // const listing = await db.insert(listings).values({...});

     // Ahora: Maps de prueba
     const listing = {
       id: `listing-${Date.now()}`,
       owner_id: user.id,
       vertical,
       title,
       description,
       price,
       location,
       status: 'active',
       created_at: Date.now(),
     };
     
     listingsById.set(listing.id, listing);

     return c.json({ ok: true, listing });
   });
   ```

2. **Llamar desde frontend:**
   ```typescript
   // apps/simpleautos/src/lib/api-client.ts
   export async function createListing(data: CreateListingInput) {
     const response = await fetch('/api/listings', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data),
       credentials: 'include', // Include cookies (JWT)
     });
     
     if (!response.ok) {
       const error = await response.json();
       throw new Error(error.error || 'Error creating listing');
     }
     
     return response.json();
   }
   ```

3. **Usar en componente:**
   ```typescript
   // apps/simpleautos/src/app/panel/publicar/page.tsx
   import { createListing } from '@/lib/api-client';

   export default function PublishPage() {
     const handleSubmit = async (data) => {
       try {
         const result = await createListing(data);
         if (result.ok) {
           router.push('/panel/publicaciones');
         }
       } catch (err) {
         alert(err.message);
       }
     };
     // Form...
   }
   ```

---

## Usar componentes compartidos

### De `packages/ui`

```typescript
// apps/simpleautos/src/app/ventas/page.tsx
import { 
  PublishWizard,
  FilterSidebar,
  ListingCard,
  PaginationControls,
  AuthModal,
} from '@simple/ui';

export default function VentasPage() {
  return (
    <div>
      <FilterSidebar />
      <ListingCard />
    </div>
  );
}
```

### De `packages/types`

```typescript
// Cualquier archivo
import type {
  AppUser,
  ListingRecord,
  BoostOrder,
  VerticalType,
} from '@simple/types';
```

### De `packages/config`

```typescript
// Config compartida
import {
  VERTICALS,
  LISTING_SECTIONS,
  PUBLISH_WIZARD_STEPS,
  MAX_IMAGES_PER_LISTING,
} from '@simple/config';
```

---

## Testing

### Manual E2E Testing

```bash
# 1. Iniciar dev servers
npm run dev:all

# 2. Test login
http://localhost:3000 → Click "Ingresar" → Test login/registro

# 3. Test crear publicación
/panel/publicar → Llenar form → Submit

# 4. Test búsqueda
/ → Buscar algo → Ver resultados

# 5. Revisar API responses
DevTools → Network → Watch requests to /api/*
```

### Verificación de Rutas

```bash
# Todos los endpoints OK
curl http://localhost:3000   # SimpleAutos OK
curl http://localhost:3001   # SimplePropiedades OK
curl http://localhost:3002   # SimpleAdmin OK
curl http://localhost:3003   # SimplePlataforma OK
curl http://localhost:4000/api/health  # API OK (si existe)
```

---

## Common Issues & Fixes

### Error: "Port 3000 already in use"
```bash
# Find proceso usando puerto
netstat -ano | findstr :3000  (Windows)
lsof -i :3000                    (macOS/Linux)

# Kill proceso
taskkill /PID 12345 /F  (Windows)
kill -9 12345                  (macOS/Linux)
```

### Error: "Cannot find module '@simple/ui'"
```bash
# Reinstalar
npm install

# Verificar symlinks
npm ls @simple/ui
```

### CORS error en fetch
```typescript
// Agregar credentials
fetch('/api/something', {
  credentials: 'include'  // ← Importante para cookies
})
```

### TypeScript errors después cambios
```bash
# Limpiar cache
rm -rf .next
npm run build

# O verificar tipos
npm run type-check
```

---

## Environment Variables

Crear `.env.local` en `/services/api`:

```bash
# Database (cuando esté implementado)
DATABASE_URL="postgresql://user:pass@localhost:5432/simple_v2"

# JWT
SESSION_SECRET="your-secret-key-at-least-32-chars-long"
JWT_EXPIRES_IN="14d"

# Node
NODE_ENV="development"

# APIs externas (future)
# MERCADOPAGO_ACCESS_TOKEN=...
# SENDGRID_API_KEY=...
```

No commitear `.env.local`

---

## Code Style & Conventions

### Naming
- **Components**: PascalCase → `ListingCard`, `AuthModal`
- **Funciones**: camelCase → `fetchListings()`, `validateEmail()`
- **Constantes**: UPPER_SNAKE_CASE → `MAX_LISTINGS`, `BOOST_PLANS`
- **Types**: PascalCase → `AppUser`, `ListingRecord`
- **Archivos**: kebab-case → `auth-modal.tsx`, `use-auth.ts`

### Imports
```typescript
// 1. React/Next imports
import { useState, useContext } from 'react';
import Link from 'next/link';

// 2. Monorepo imports
import { ListingCard } from '@simple/ui';
import type { ListingRecord } from '@simple/types';
import { VERTICALS } from '@simple/config';

// 3. Local imports
import { useAuth } from '@/hooks';
import { fetchListings } from '@/lib/api-client';
```

### Components
```typescript
// 'use client' si usa hooks
'use client';

interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export default function MyComponent({ title, onSubmit, isLoading = false }: Props) {
  return <div>{title}</div>;
}
```

