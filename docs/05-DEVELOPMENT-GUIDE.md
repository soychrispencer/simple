# Development Guide - Simple Ecosystem

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Git
- Supabase Account (Cloud, not local)
- MercadoPago Account

### Initial Setup

1. **Clone and Install**
```bash
cd c:\Users\chris\OneDrive\Desktop\Simple
npm install
```

2. **Setup Environment Variables**

Create `.env.local` files in each vertical:

**apps/simpleautos/.env.local:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# App Config
NEXT_PUBLIC_VERTICAL=autos
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your-token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=your-public-key

# Email (opcional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**apps/simplepropiedades/.env.local:**
```bash
# Same as above but with:
NEXT_PUBLIC_VERTICAL=properties
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

3. **Run Development Servers**

```bash
# Terminal 1 · SimpleAutos → http://localhost:3000
npm run dev:autos

# Terminal 2 · SimplePropiedades → http://localhost:3001
npm run dev:props

# Terminal 3 · SimpleTiendas → http://localhost:3002
npm run dev:tiendas

# Terminal 4 · SimpleFood → http://localhost:3003
npm run dev:food

# O bien levanta todo junto
npm run dev:all
```

4. **Backend compartido (Supabase + CLI)**

- Todo lo relacionado con migraciones, seeds y funciones de Supabase vive en `backend/supabase/` y se opera con la CLI oficial (`npm run supabase:*`).
- Comandos relevantes:

```bash
# Inicia stack local (requiere Docker)
npm run supabase:start

# Resetea base local y vuelve a aplicar migrations + seed.sql (requiere Docker)
npm run supabase:db:reset

# Empuja migraciones a staging (usa SUPABASE_STAGING_DB_URL)
npm run supabase:db:push:staging

# Empuja migraciones a producción (usa SUPABASE_PROD_DB_URL)
npm run supabase:db:push:prod
```

- No mantengas carpetas `supabase/` dentro de cada app; cualquier cambio de esquema debe agregarse en `backend/supabase/migrations` (y documentarse en este archivo).

- Si necesitas automatizar otra acción (ej. `db pull`, `db dump`), crea un script en `scripts/` y consúmelo desde un comando `npm run supabase:<nombre>` para mantener todo centralizado.

---

## 📝 Coding Conventions

### File Naming

```
✅ GOOD
components/VehicleCard.tsx
components/vehicle-wizard/Step1.tsx
lib/formatPrice.ts
hooks/useAuth.ts
types/vehicle.ts

❌ BAD
components/vehiclecard.tsx
components/Vehicle_Card.tsx
lib/format_price.ts
```

**Rules:**
- Components: PascalCase
- Files/Folders: camelCase or kebab-case
- Types/Interfaces: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE

---

### TypeScript Best Practices

#### Always Define Types
```typescript
// ✅ GOOD
interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
  className?: string;
}

export function VehicleCard({ vehicle, onClick, className }: VehicleCardProps) {
  // ...
}

// ❌ BAD
export function VehicleCard(props: any) {
  // ...
}
```

#### Use Type Imports
```typescript
// ✅ GOOD
import type { Vehicle } from '@/types/vehicle';
import type { Profile } from '@simple/shared-types';

// ❌ BAD
import { Vehicle } from '@/types/vehicle'; // if it's just a type
```

#### Prefer Interfaces for Objects
```typescript
// ✅ GOOD
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type for unions/primitives
type Status = 'active' | 'inactive' | 'pending';
```

---

### Component Structure

```typescript
'use client'; // Only if needed

// 1. Imports
import { useState } from 'react';
import type { Vehicle } from '@/types/vehicle';
import { Button } from '@simple/ui';

// Regla: importa paquetes compartidos desde su entrypoint (por ejemplo, `@simple/ui`, `@simple/auth`, etc.).
// Evita subpaths tipo `@simple/ui/...` o `@simple/auth/...`.
// Excepción intencional: `@simple/config/tailwind-preset` y `@simple/config/tokens.css` (assets/config exportados).

// ESLint: las reglas compartidas (incluyendo `no-restricted-imports`) viven en el root y se componen desde `eslint.shared.mjs`.
// Los patrones restringidos están centralizados en `eslint.restricted-imports.mjs` para evitar duplicación.

// 2. Types/Interfaces
interface VehicleCardProps {
  vehicle: Vehicle;
  onFavorite?: (id: string) => void;
}

// 3. Component
export function VehicleCard({ vehicle, onFavorite }: VehicleCardProps) {
  // 3.1 Hooks
  const [isFavorited, setIsFavorited] = useState(false);
  
  // 3.2 Handlers
  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    onFavorite?.(vehicle.id);
  };
  
  // 3.3 Early returns
  if (!vehicle) {
    return null;
  }
  
  // 3.4 Render
  return (
    <div className="...">
      <h3>{vehicle.title}</h3>
      <Button onClick={handleFavorite}>
        {isFavorited ? 'Unfavorite' : 'Favorite'}
      </Button>
    </div>
  );
}

// 4. Sub-components (if needed)
function VehicleDetails({ vehicle }: { vehicle: Vehicle }) {
  return <div>...</div>;
}
```

---

### Server vs Client Components

#### Use Server Components by Default
```typescript
// app/vehiculos/page.tsx
// Server Component (default)
import { getVehicles } from '@/lib/api/vehicles';

export default async function VehiculosPage() {
  const vehicles = await getVehicles();
  
  return (
    <div>
      {vehicles.map(v => (
        <VehicleCard key={v.id} vehicle={v} />
      ))}
    </div>
  );
}
```

#### Use Client Components Only When Needed
```typescript
'use client';

// Client Component (needs interactivity)
import { useState } from 'react';

export function SearchFilters() {
  const [filters, setFilters] = useState({});
  
  return (
    <form>
      {/* Interactive form elements */}
    </form>
  );
}
```

**Use Client Components for:**
- Event handlers (onClick, onChange, etc.)
- React hooks (useState, useEffect, etc.)
- Browser APIs (localStorage, window, etc.)
- Third-party libraries that need browser

---

### CSS & Styling

#### Use Tailwind Classes
```typescript
// ✅ GOOD
<div className="flex items-center gap-4 p-4 bg-lightcard dark:bg-darkcard rounded-lg">
  <h2 className="text-2xl font-bold text-lighttext dark:text-darktext">
    Title
  </h2>
</div>

// ❌ BAD - Don't use inline styles
<div style={{ display: 'flex', padding: '16px' }}>
  <h2 style={{ fontSize: '24px' }}>Title</h2>
</div>
```

#### Use CSS Variables for Dynamic Colors
```typescript
// For primary color that changes per vertical
<button 
  style={{ backgroundColor: 'var(--color-primary)' }}
  className="text-white px-4 py-2 rounded-lg"
>
  Click me
</button>

// Or use Tailwind's primary class (configured per vertical)
<button className="bg-primary text-white px-4 py-2 rounded-lg">
  Click me
</button>
```

#### Consistent Spacing
```typescript
// Use Tailwind's spacing scale
gap-2  // 0.5rem / 8px
gap-4  // 1rem / 16px
gap-6  // 1.5rem / 24px
gap-8  // 2rem / 32px

p-4    // padding: 1rem
px-6   // padding-left/right: 1.5rem
py-2   // padding-top/bottom: 0.5rem
```

---

### API Routes

```typescript
// app/api/vehicles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const make = searchParams.get('make');
    
    // Query database
    let query = supabase
      .from('listings')
      .select('*, vehicles(*), profiles(*)')
      .eq('vertical', 'autos')
      .eq('status', 'active');
    
    if (make) {
      query = query.eq('vehicles.make', make);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse body
    const body = await request.json();
    
    // Validate (use Zod)
    // ...
    
    // Create listing
    const { data, error } = await supabase
      .from('listings')
      .insert({
        user_id: user.id,
        vertical: 'autos',
        ...body,
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
    }, { status: 201 });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Error Handling

```typescript
// ✅ GOOD - Specific error handling
async function deleteVehicle(id: string) {
  try {
    const response = await fetch(`/api/vehicles/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete vehicle');
    }
    
    return await response.json();
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('Delete vehicle error:', error.message);
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

// ❌ BAD - Silent errors
async function deleteVehicle(id: string) {
  try {
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
  } catch (error) {
    // Silent failure
  }
}
```

---

### Data Fetching

#### Server-side (Preferred)
```typescript
// app/vehiculos/page.tsx
import { getSupabaseClient } from '@/lib/supabase/supabase';

export default async function VehiculosPage() {
  const supabase = getSupabaseClient();
  
  const { data: vehicles } = await supabase
    .from('listings')
    .select('*, vehicles(*)')
    .eq('vertical', 'autos')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);
  
  return <VehicleGrid vehicles={vehicles} />;
}
```

#### Client-side (When needed)
```typescript
'use client';

import { useEffect, useState } from 'react';
import type { Vehicle } from '@/types/vehicle';

export function VehicleList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadVehicles() {
      try {
        const response = await fetch('/api/vehicles');
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        setVehicles(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setLoading(false);
      }
    }
    
    loadVehicles();
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div>
      {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
    </div>
  );
}
```

---

## 🧪 Testing

### Unit Tests (Jest)

```typescript
// lib/__tests__/formatPrice.test.ts
import { formatPrice } from '../formatPrice';

describe('formatPrice', () => {
  it('formats CLP correctly', () => {
    expect(formatPrice(12500000, 'CLP')).toBe('$12.500.000');
  });
  
  it('formats USD correctly', () => {
    expect(formatPrice(15000, 'USD')).toBe('US$15,000');
  });
  
  it('handles zero', () => {
    expect(formatPrice(0, 'CLP')).toBe('$0');
  });
});
```

### Component Tests (Testing Library)

```typescript
// components/__tests__/VehicleCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VehicleCard } from '../VehicleCard';

const mockVehicle = {
  id: '1',
  title: 'Toyota Corolla 2020',
  price: 12500000,
  // ...
};

describe('VehicleCard', () => {
  it('renders vehicle information', () => {
    render(<VehicleCard vehicle={mockVehicle} />);
    
    expect(screen.getByText('Toyota Corolla 2020')).toBeInTheDocument();
    expect(screen.getByText('$12.500.000')).toBeInTheDocument();
  });
  
  it('calls onFavorite when favorite button clicked', () => {
    const onFavorite = jest.fn();
    render(<VehicleCard vehicle={mockVehicle} onFavorite={onFavorite} />);
    
    const favoriteBtn = screen.getByRole('button', { name: /favorite/i });
    fireEvent.click(favoriteBtn);
    
    expect(onFavorite).toHaveBeenCalledWith('1');
  });
});
```

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## 🔧 Common Tasks

### Adding a New Vertical

1. **Create app folder**
```bash
cd apps
xcopy simpleautos simplenewvertical /E /I /H
```

2. **Update package.json**
```json
{
  "name": "simplenewvertical",
  // ...
}
```

3. **Create vertical config**
```typescript
// apps/simplenewvertical/src/config/vertical.ts
import { verticalThemes } from '@simple/config';

export const verticalConfig = {
  name: 'newvertical' as const,
  theme: verticalThemes.newvertical,
  // ...
};
```

4. **Update theme in packages/config**
```typescript
// packages/config/src/theme.ts
export const verticalThemes = {
  // ...
  newvertical: {
    name: 'SimpleNewVertical',
    primary: '#COLOR',
    domain: 'simplenewvertical.com',
  },
};
```

5. **Add to root package.json scripts**
```json
{
  "scripts": {
    "dev:newvertical": "npm run dev --workspace=simplenewvertical",
  }
}
```

---

### Creating a Shared Component

1. **Create component in @simple/ui**
```typescript
// packages/ui/src/components/cards/GenericCard.tsx
interface GenericCardProps {
  title: string;
  description?: string;
  onClick?: () => void;
}

export function GenericCard({ title, description, onClick }: GenericCardProps) {
  return (
    <div 
      className="p-4 bg-lightcard dark:bg-darkcard rounded-lg cursor-pointer"
      onClick={onClick}
    >
      <h3 className="text-xl font-bold">{title}</h3>
      {description && <p className="text-gray-600">{description}</p>}
    </div>
  );
}
```

2. **Export from index**
```typescript
// packages/ui/src/index.ts
export { Card, CardHeader, CardTitle, CardContent } from './components/ui';
```

3. **Use in verticals**
```typescript
// apps/simpleautos/src/app/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@simple/ui';

export default function HomePage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Comprar Vehículos</CardTitle>
        </CardHeader>
        <CardContent>Encuentra tu vehículo ideal</CardContent>
      </Card>
    </div>
  );
}
```

---

### Database Migrations

1. **Create migration file**
```sql
-- backend/supabase/migrations/002_add_feature.sql
BEGIN;

ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS is_certified BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vehicles_certified 
ON public.vehicles(is_certified) 
WHERE is_certified = TRUE;

COMMIT;
```

2. **Apply via Supabase Dashboard**
- Go to SQL Editor
- Paste and run migration
- Document in migration log

3. **Update types**
```typescript
// packages/shared-types/src/vehicles.ts
export interface Vehicle {
  // ...
  is_certified?: boolean;
}
```

---

### Adding a New API Endpoint

1. **Create route file**
```typescript
// apps/simpleautos/src/app/api/vehicles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('listings')
    .select('*, vehicles(*), profiles(*)')
    .eq('id', params.id)
    .single();
  
  if (error || !data) {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data,
  });
}
```

2. **Document in API docs**
Add endpoint documentation to `docs/03-BACKEND.md`

3. **Create client function (optional)**
```typescript
// apps/simpleautos/src/lib/api/vehicles.ts
export async function getVehicleById(id: string) {
  const response = await fetch(`/api/vehicles/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch vehicle');
  }
  return response.json();
}
```

---

## 🐛 Debugging

### VS Code Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev:autos"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Console Logging Best Practices

```typescript
// ✅ GOOD - Structured logging
import { logger } from '@simple/utils';

logger.info('Vehicle created', {
  vehicleId: vehicle.id,
  userId: user.id,
  make: vehicle.make,
});

logger.error('Failed to create vehicle', {
  error: error.message,
  userId: user.id,
});

// ❌ BAD - Unstructured console.log
console.log('vehicle created', vehicle);
```

---

## 📚 Resources

### Internal Documentation
- [Master Plan](./00-MASTER-PLAN.md)
- [Architecture](./01-ARCHITECTURE.md)
- [Migration Guide](./02-MIGRATION-GUIDE.md)
- [Backend Reference](./03-BACKEND.md)

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Última Actualización:** 11 de noviembre de 2025
