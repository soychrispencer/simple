# Database Setup: Drizzle ORM + PostgreSQL 🗄️

**Objetivo:** Migrar de Maps en memoria a PostgreSQL + Drizzle ORM persistente

---

## 📋 Checklist de Implementación

### Fase 1: Configuración Inicial (Día 1-2)

- [ ] Crear `drizzle.config.ts` en `/services/api`
- [ ] Instalar/verificar PostgreSQL localmente
- [ ] Crear `.env.local` con `DATABASE_URL`
- [ ] Definir schemas en `/services/api/src/db/schema.ts`
- [ ] Generar migrations: `npm run db:generate`
- [ ] Ejecutar migrations: `npm run db:migrate`
- [ ] Verificar conexión: `npm run db:studio`

**Archivos a crear:**
```
services/api/src/db/
├── schema.ts        (Nuevos esquemas Drizzle)
├── types.ts         (Tipos TypeScript para BD)
└── index.ts         (Instancia de cliente Drizzle)

└── drizzle/
    └── 0001_initial.sql (Primera migración)
```

### Fase 2: Implementar Schemas (Día 2-3)

#### Tabla: `users`
```sql
users
├── id (UUID, PK)
├── email (VARCHAR UNIQUE)
├── password_hash (VARCHAR) -- bcrypt
├── name (VARCHAR)
├── phone (VARCHAR, nullable)
├── role (VARCHAR: 'user' | 'admin' | 'superadmin')
├── status (VARCHAR: 'active' | 'verified' | 'suspended')
├── avatar_url (VARCHAR, nullable)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── last_login_at (TIMESTAMP, nullable)
```

#### Tabla: `listings`
```sql
listings
├── id (UUID, PK)
├── owner_id (UUID, FK → users)
├── vertical (VARCHAR: 'autos' | 'propiedades')
├── section (VARCHAR: 'sale' | 'rent' | 'auction' | 'project')
├── title (VARCHAR)
├── description (TEXT)
├── price_label (VARCHAR)
├── location (VARCHAR, nullable)
├── location_data (JSONB: GeoPoint)
├── href_slug (VARCHAR UNIQUE, nullable)
├── status (VARCHAR: 'draft' | 'active' | 'paused' | 'sold' | 'archived')
├── raw_data (JSONB)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── expires_at (TIMESTAMP, nullable)
```

#### Tabla: `saved_listings`
```sql
saved_listings
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── listing_id (UUID, FK → listings)
├── saved_at (TIMESTAMP)
└── UNIQUE (user_id, listing_id)
```

#### Tabla: `follows`
```sql
follows
├── id (UUID, PK)
├── follower_id (UUID, FK → users)
├── followee_id (UUID, FK → users)
├── vertical (VARCHAR: 'autos' | 'propiedades')
├── followed_at (TIMESTAMP)
└── UNIQUE (follower_id, followee_id, vertical)
```

#### Tabla: `boost_orders`
```sql
boost_orders
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── listing_id (UUID, FK → listings, nullable)
├── vertical (VARCHAR: 'autos' | 'propiedades')
├── section (VARCHAR: 'sale' | 'rent' | 'auction' | 'project')
├── plan_id (VARCHAR: 'boost_starter' | 'boost_pro' | 'boost_max')
├── days (INT)
├── price (DECIMAL)
├── status (VARCHAR: 'scheduled' | 'active' | 'paused' | 'ended')
├── start_at (TIMESTAMP)
├── end_at (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### Tabla: `address_book`
```sql
address_book
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── kind (VARCHAR: 'personal' | 'shipping' | 'billing' | 'company' | ...)
├── label (VARCHAR)
├── country_code (VARCHAR)
├── region_id (VARCHAR, nullable)
├── region_name (VARCHAR, nullable)
├── commune_id (VARCHAR, nullable)
├── commune_name (VARCHAR, nullable)
├── neighborhood (VARCHAR, nullable)
├── address_line_1 (VARCHAR, nullable)
├── address_line_2 (VARCHAR, nullable)
├── postal_code (VARCHAR, nullable)
├── contact_name (VARCHAR, nullable)
├── contact_phone (VARCHAR, nullable)
├── is_default (BOOLEAN)
├── geo_point (JSONB)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### Tabla: `payment_orders`
```sql
payment_orders
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── vertical (VARCHAR: 'autos' | 'propiedades')
├── type (VARCHAR: 'boost' | 'advertising' | 'subscription')
├── amount (DECIMAL)
├── currency (VARCHAR: 'CLP' | 'UF')
├── status (VARCHAR: 'pending' | 'confirmed' | 'failed')
├── external_id (VARCHAR, nullable) -- MercadoPago ID
├── raw_data (JSONB)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### Tabla: `active_subscriptions`
```sql
active_subscriptions
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── vertical (VARCHAR: 'autos' | 'propiedades')
├── plan_id (VARCHAR: 'free' | 'basic' | 'pro' | 'business')
├── start_at (TIMESTAMP)
├── end_at (TIMESTAMP, nullable) -- null = indefinido
├── auto_renew (BOOLEAN)
├── status (VARCHAR: 'active' | 'paused' | 'cancelled')
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

### Fase 3: Reemplazar Maps por Queries (Día 3-5)

#### Antes (Actual):
```typescript
const usersById = new Map<string, AppUser>();
// uso: usersById.set(userId, userData);
//      usersById.get(userId);
```

#### Después (Drizzle):
```typescript
import { db } from './db';
import { users } from './db/schema';

// Crear usuario
const newUser = await db.insert(users).values({
  email, password_hash, name, role: 'user'
}).returning();

// Obtener usuario
const user = await db.query.users.findFirst({
  where: eq(users.email, userEmail)
});

// Actualizar
await db.update(users)
  .set({ updated_at: new Date() })
  .where(eq(users.id, userId));
```

#### Endpoints a Actualizar:
```python
POST /api/auth/register      # users.insert()
POST /api/auth/login         # users.findFirst()
POST /api/listings           # listings.insert()
GET  /api/listings           # listings.findMany()
GET  /api/listings/:id       # listings.findFirst()
POST /api/listings/:id       # listings.update()
DELETE /api/listings/:id     # listings.delete()
POST /api/saved              # saved_listings.insert()
GET  /api/by-user/:id        # listings.findMany() where owner_id
```

---

### Fase 4: Encriptación de Contraseñas (Día 5-6)

```typescript
import bcrypt from 'bcryptjs';

// Registrar
const hashedPassword = await bcrypt.hash(password, 12);
await db.insert(users).values({
  email,
  password_hash: hashedPassword,
  name
});

// Login
const user = await db.query.users.findFirst({
  where: eq(users.email, email)
});
const isValid = await bcrypt.compare(password, user.password_hash);
```

---

### Fase 5: Verificación de Email (Día 6-7)

```typescript
// Tabla adicional: email_verification_tokens
email_verification_tokens
├── id (UUID, PK)
├── user_id (UUID, FK)
├── token (VARCHAR UNIQUE)
├── expires_at (TIMESTAMP)
├── verified_at (TIMESTAMP, nullable)

// Workflow:
1. Usuario se registra → email sin verificar
2. Se genera token aleatorio → enviar por email
3. Usuario hace click → verifica token → set user.status = 'verified'
4. Token se marca como verified_at
```

---

## 🔧 Instalación Local (Database)

### 1. Instalar PostgreSQL

**Windows (Recomendado: PostgreSQL 15+):**
```bash
# Descarga desde https://www.postgresql.org/download/windows/
# O con Chocolatey:
choco install postgresql15
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Crear Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear DB
CREATE DATABASE simple_v2;
CREATE USER simple_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE simple_v2 TO simple_user;
\q
```

### 3. Variables de Entorno

Crear `.env.local` en `/services/api`:

```bash
# Database
DATABASE_URL="postgresql://simple_user:your-secure-password@localhost:5432/simple_v2"

# JWT
SESSION_SECRET="your-super-secret-key-min-32-chars"
JWT_EXPIRES_IN="14d"

# Node
NODE_ENV="development"
```

### 4. Ejecutar Drizzle

```bash
cd services/api

# Generar migrations
npm run db:generate

# Ejecutar migrations
npm run db:migrate

# Abrir Drizzle Studio (UI)
npm run db:studio  # → http://localhost:3001
```

---

## 📊 Verificación

```bash
# Ver estado de migrations
npm run db:status

# Ver schema en Drizzle Studio
npm run db:studio

# Hacer query manual
psql -U simple_user -d simple_v2
select * from users;
```

---

## ⚠️ Consideraciones

### Producción (Railway, Vercel Postgres, etc)
```bash
# En .env.production
DATABASE_URL="postgresql://user:pass@postgres.railway.app:xxxxx/dbname"

# Asegurar SSL
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

### Backups

```bash
# Full backup
pg_dump -U simple_user -d simple_v2 > backup.sql

# Restore
psql -U simple_user -d simple_v2 < backup.sql
```

### Performance

- Índices en `email` , `owner_id`, `vertical`, `section`
- Full-text search si es necesario
- Connection pooling (PgBouncer)

### Versionamiento

- Migrations siempre versionadas
- Nunca perder migrations anteriores
- Tests con datos de fixtures

