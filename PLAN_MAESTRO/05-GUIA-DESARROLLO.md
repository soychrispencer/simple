# 📖 Guía de Desarrollo - Ecosistema Simple

**Autor:** Christian  
**Fecha:** 8 de noviembre de 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Convenciones de Código](#convenciones-de-código)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Nombres y Nomenclatura](#nombres-y-nomenclatura)
4. [TypeScript Best Practices](#typescript-best-practices)
5. [React Patterns](#react-patterns)
6. [Git Workflow](#git-workflow)
7. [Testing Guidelines](#testing-guidelines)

---

## 💻 Convenciones de Código

### Reglas Generales

```typescript
// ✅ BIEN: Código limpio y legible
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    console.error('Error fetching vehicle:', error);
    return null;
  }
  
  return data;
}

// ❌ MAL: Código confuso
export async function gvbi(i:string){const{d,e}=await supabase.from('vehicles').select('*').eq('id',i).single();if(e)return null;return d;}
```

### Principios SOLID

1. **Single Responsibility:** Cada función/componente debe hacer UNA cosa
2. **Open/Closed:** Abierto para extensión, cerrado para modificación
3. **Liskov Substitution:** Subtipos deben ser intercambiables
4. **Interface Segregation:** Interfaces pequeñas y específicas
5. **Dependency Inversion:** Depender de abstracciones, no de implementaciones

### Formateo

```typescript
// Configuración en .prettierrc
{
  "semi": true,                // Siempre punto y coma
  "trailingComma": "es5",      // Comas finales
  "singleQuote": true,         // Comillas simples
  "printWidth": 100,           // Máximo 100 caracteres
  "tabWidth": 2,               // 2 espacios
  "useTabs": false             // Espacios, no tabs
}
```

---

## 📁 Estructura de Archivos

### Componentes

```
ComponentName/
├── ComponentName.tsx        # Componente principal
├── ComponentName.test.tsx   # Tests
├── ComponentName.stories.tsx # Storybook (opcional)
├── types.ts                 # Tipos específicos
├── styles.module.css        # Estilos (si es necesario)
└── index.ts                 # Barrel export
```

**Ejemplo:**
```
Button/
├── Button.tsx
├── Button.test.tsx
├── types.ts
└── index.ts
```

### Páginas Next.js

```
app/
├── (public)/                # Rutas públicas
│   ├── layout.tsx
│   ├── page.tsx
│   └── ventas/
│       ├── page.tsx         # /ventas
│       └── [slug]/
│           └── page.tsx     # /ventas/[slug]
├── (auth)/                  # Rutas de autenticación
│   ├── login/
│   └── registro/
└── (dashboard)/             # Rutas protegidas
    └── panel/
        └── page.tsx
```

### Estructura de Packages

```
packages/
├── ui/
│   ├── src/
│   │   ├── components/
│   │   ├── styles/
│   │   ├── lib/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── database/
    ├── src/
    │   ├── client/
    │   ├── queries/
    │   ├── mutations/
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

---

## 🏷️ Nombres y Nomenclatura

### Variables y Funciones

```typescript
// ✅ BIEN: camelCase descriptivo
const vehicleCount = 10;
const isUserAuthenticated = true;

function calculateTotalPrice(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ MAL: Nombres cortos o confusos
const vc = 10;
const auth = true;
function calc(i: Item[]): number { ... }
```

### Componentes

```typescript
// ✅ BIEN: PascalCase
export function VehicleCard({ vehicle }: VehicleCardProps) {
  return <div>...</div>;
}

// ❌ MAL: Otras convenciones
export function vehicleCard() { ... }
export function vehicle_card() { ... }
```

### Constantes

```typescript
// ✅ BIEN: UPPER_SNAKE_CASE para constantes globales
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
export const API_BASE_URL = 'https://api.simple.com';

// Para enums, usar PascalCase
export enum VehicleStatus {
  Draft = 'draft',
  Active = 'active',
  Sold = 'sold',
}
```

### Tipos e Interfaces

```typescript
// ✅ BIEN: PascalCase, sufijo Props para props de componentes
export interface Vehicle {
  id: string;
  brand: string;
  model: string;
}

export interface VehicleCardProps {
  vehicle: Vehicle;
  onFavorite?: (id: string) => void;
}

// Para tipos de unión, usar PascalCase
export type ListingStatus = 'draft' | 'active' | 'sold';
```

### Archivos

```
// Componentes: PascalCase
VehicleCard.tsx
ListingFilters.tsx

// Utilidades: camelCase
formatPrice.ts
validateEmail.ts

// Páginas: kebab-case o estructura de carpetas
page.tsx
layout.tsx
[slug]/page.tsx

// Tests: mismo nombre + .test
VehicleCard.test.tsx
formatPrice.test.ts
```

---

## 🔷 TypeScript Best Practices

### 1. Tipar Todo

```typescript
// ✅ BIEN
interface User {
  id: string;
  email: string;
  name: string;
}

async function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ MAL: Sin tipos
async function getUser(id) {
  // ...
}
```

### 2. Evitar `any`

```typescript
// ✅ BIEN: Usar unknown y type guards
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  // ...
}

// ❌ MAL: Usar any
function processData(data: any) {
  return data.toUpperCase(); // No type safety
}
```

### 3. Usar Generics

```typescript
// ✅ BIEN: Reutilizable y type-safe
interface ApiResponse<T> {
  data: T;
  error: Error | null;
  loading: boolean;
}

function useFetch<T>(url: string): ApiResponse<T> {
  // ...
}

const { data } = useFetch<Vehicle[]>('/api/vehicles');
```

### 4. Utility Types

```typescript
// Partial: Hace todos los campos opcionales
type UpdateVehicle = Partial<Vehicle>;

// Pick: Selecciona campos específicos
type VehiclePreview = Pick<Vehicle, 'id' | 'title' | 'price'>;

// Omit: Excluye campos
type VehicleWithoutDates = Omit<Vehicle, 'created_at' | 'updated_at'>;

// Record: Objeto con keys y values tipados
type VehiclesByBrand = Record<string, Vehicle[]>;
```

### 5. Type Guards

```typescript
function isVehicle(listing: Vehicle | Property): listing is Vehicle {
  return 'brand' in listing;
}

// Uso
if (isVehicle(listing)) {
  console.log(listing.brand); // TypeScript sabe que es Vehicle
}
```

---

## ⚛️ React Patterns

### 1. Server Components por Defecto

```typescript
// ✅ BIEN: Server Component (por defecto)
export default async function VehiclesPage() {
  const vehicles = await getVehicles();
  
  return (
    <div>
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  );
}
```

### 2. Client Components Solo Cuando es Necesario

```typescript
// ✅ BIEN: Client Component solo para interactividad
'use client';
import { useState } from 'react';

export function SearchFilters() {
  const [filters, setFilters] = useState({});
  
  return (
    <div>
      {/* Filtros interactivos */}
    </div>
  );
}
```

### 3. Composición sobre Herencia

```typescript
// ✅ BIEN: Composición
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

function Button({ children, variant = 'primary' }: ButtonProps) {
  return <button className={variant}>{children}</button>;
}

// Uso
<Button variant="primary">Click me</Button>
```

### 4. Custom Hooks

```typescript
// ✅ BIEN: Extraer lógica reutilizable
function useVehicles(filters: VehicleFilters) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchVehicles() {
      setLoading(true);
      const data = await getVehicles(filters);
      setVehicles(data);
      setLoading(false);
    }
    
    fetchVehicles();
  }, [filters]);
  
  return { vehicles, loading };
}

// Uso
function VehiclesList({ filters }: Props) {
  const { vehicles, loading } = useVehicles(filters);
  
  if (loading) return <Spinner />;
  return <div>...</div>;
}
```

### 5. Error Boundaries

```typescript
// error.tsx en app directory
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Algo salió mal</h2>
      <button onClick={reset}>Intentar de nuevo</button>
    </div>
  );
}
```

### 6. Loading States

```typescript
// loading.tsx en app directory
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  );
}
```

---

## 🔀 Git Workflow

### Branch Strategy

```
main                 # Producción (protegida)
├── develop          # Desarrollo (protegida)
    ├── feature/auth-system
    ├── feature/vehicle-listing
    ├── fix/login-error
    └── refactor/database-queries
```

### Convención de Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Formato
<type>(<scope>): <subject>

# Tipos
feat:      Nueva funcionalidad
fix:       Bug fix
docs:      Documentación
style:     Formateo, sin cambio de código
refactor:  Refactorización
test:      Tests
chore:     Tareas de mantenimiento

# Ejemplos
feat(auth): add social login with Google
fix(vehicles): correct price formatting
docs(readme): update installation instructions
refactor(ui): extract Button component
test(auth): add unit tests for login
chore(deps): update dependencies
```

### Pull Request Template

```markdown
## 📝 Descripción
Breve descripción de los cambios

## 🎯 Tipo de Cambio
- [ ] Nueva funcionalidad
- [ ] Bug fix
- [ ] Refactorización
- [ ] Documentación

## ✅ Checklist
- [ ] El código sigue las convenciones del proyecto
- [ ] He añadido tests para mis cambios
- [ ] Todos los tests pasan
- [ ] He actualizado la documentación
- [ ] No hay console.logs ni debuggers

## 📸 Screenshots (si aplica)
[Capturas de pantalla o GIFs]

## 🔗 Issue Relacionado
Closes #123
```

### Git Hooks (Husky)

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

## 🧪 Testing Guidelines

### 1. Unit Tests (Vitest)

```typescript
// Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    screen.getByText('Click').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('shows loading state', () => {
    render(<Button loading>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 2. Integration Tests

```typescript
// vehicleSearch.test.ts
import { describe, it, expect } from 'vitest';
import { searchVehicles } from './searchVehicles';

describe('Vehicle Search', () => {
  it('filters by brand', async () => {
    const results = await searchVehicles({ brand: 'Toyota' });
    
    expect(results).toHaveLength(10);
    expect(results.every((v) => v.brand === 'Toyota')).toBe(true);
  });
  
  it('filters by price range', async () => {
    const results = await searchVehicles({
      minPrice: 10000,
      maxPrice: 20000,
    });
    
    expect(results.every((v) => v.price >= 10000 && v.price <= 20000)).toBe(true);
  });
});
```

### 3. E2E Tests (Playwright)

```typescript
// vehicleListing.spec.ts
import { test, expect } from '@playwright/test';

test('user can create a vehicle listing', async ({ page }) => {
  await page.goto('/login');
  
  // Login
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Create listing
  await page.goto('/panel/publicaciones/crear');
  await page.fill('input[name="brand"]', 'Toyota');
  await page.fill('input[name="model"]', 'Corolla');
  await page.fill('input[name="year"]', '2020');
  await page.fill('input[name="price"]', '15000');
  await page.click('button[type="submit"]');
  
  // Verify
  await expect(page.locator('text=Publicación creada exitosamente')).toBeVisible();
});
```

### 4. Coverage

```bash
# Ejecutar tests con coverage
pnpm test:coverage

# Mínimo requerido
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%
```

---

## 📦 Dependencies Management

### Actualizar Dependencias

```bash
# Ver dependencias desactualizadas
pnpm outdated

# Actualizar todas (cuidadosamente)
pnpm update

# Actualizar una específica
pnpm update next@latest

# Auditar seguridad
pnpm audit
```

### Instalar Nuevas Dependencias

```bash
# En el root (para herramientas de dev)
pnpm add -D -w prettier

# En un package específico
pnpm add --filter @simple/ui clsx

# En una app específica
pnpm add --filter simpleautos react-hook-form
```

---

## 🔒 Seguridad

### Variables de Entorno

```bash
# ✅ BIEN: Nunca commitear .env files
.env.local
.env.production

# ✅ BIEN: Usar prefijo NEXT_PUBLIC_ para variables del cliente
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# ❌ MAL: Exponer secrets en el cliente
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=... # ¡NUNCA!
```

### Sanitización de Inputs

```typescript
// ✅ BIEN: Usar Zod para validación
import { z } from 'zod';

const vehicleSchema = z.object({
  brand: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(2100),
  price: z.number().positive(),
});

function createVehicle(data: unknown) {
  const validated = vehicleSchema.parse(data);
  // Ahora `validated` es type-safe y sanitizado
}
```

### SQL Injection Prevention

```typescript
// ✅ BIEN: Supabase previene SQL injection automáticamente
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('brand', userInput); // Safe

// ❌ MAL: Nunca construir queries manualmente
const query = `SELECT * FROM vehicles WHERE brand = '${userInput}'`; // Vulnerable!
```

---

## 📊 Performance

### Code Splitting

```typescript
// ✅ BIEN: Lazy load componentes pesados
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
  ssr: false, // Si no necesita SSR
});
```

### Image Optimization

```typescript
// ✅ BIEN: Usar next/image
import Image from 'next/image';

<Image
  src="/vehicle.jpg"
  alt="Vehicle"
  width={800}
  height={600}
  priority // Para imágenes above-the-fold
  placeholder="blur"
  blurDataURL="data:image/..." // Low quality placeholder
/>
```

### Memoización

```typescript
// ✅ BIEN: Usar useMemo para cálculos costosos
const expensiveValue = useMemo(() => {
  return vehicles.reduce((sum, v) => sum + v.price, 0);
}, [vehicles]);

// ✅ BIEN: Usar useCallback para callbacks
const handleClick = useCallback((id: string) => {
  console.log('Clicked', id);
}, []);
```

---

## 🚀 Siguiente Paso

Comenzar con la implementación siguiendo el **04-PLAN-IMPLEMENTACION.md**.
