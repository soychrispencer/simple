# Architecture Overview 🏗️

**Última actualización:** 9 de marzo de 2026

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  SimpleAutos (3000)  │  SimplePropiedades (3001)               │
│  SimpleAdmin (3002)  │  SimplePlataforma (3003)                │
│                                                                 │
│  Tech: Next.js 16 + React 19 + TailwindCSS 4 + Turbopack      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Hono)                         │
│                    Port 4000 - /api/*                           │
├─────────────────────────────────────────────────────────────────┤
│  Auth           Listings       CRM          Payments            │
│  /auth/register  /listings     /crm         /checkout           │
│  /auth/login     /listings/:id /contacts    /confirm            │
│  /auth/me        /listings/:id /stats       /boost/orders       │
│  /auth/logout    /search       /export      /subscriptions      │
└─────────────────────────────────────────────────────────────────┘
           ↓                  ↓                  ↓
┌──────────────────┬──────────────────┬──────────────────┐
│   JWT/Session    │   Validación     │   Business Logic │
│   Middleware     │   (Zod)          │   Functions      │
└──────────────────┴──────────────────┴──────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Drizzle ORM)                     │
│                                                                 │
│  Query Builder:  db.select(), db.insert(), db.update() etc     │
│  Relations:      belongsTo, hasMany, etc                       │
│  Migrations:     /services/api/drizzle/*.sql                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                        │
│                                                                 │
│  Tables: users, listings, saved_listings, follows, etc         │
│  Port: 5432                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
SimpleV2/
├── apps/
│   ├── simpleautos/          Next.js app (vertical 1)
│   │   ├── src/
│   │   │   ├── app/          Routes + layouts
│   │   │   ├── components/   Smart components
│   │   │   ├── context/      Auth context
│   │   │   ├── lib/          Utilidades
│   │   │   └── hooks/        Custom hooks
│   │   ├── public/           Assets (seeds, images)
│   │   └── tsx, Next config  Config files
│   │
│   ├── simplepropiedades/    Next.js app (vertical 2) - Igual estructura
│   ├── simpleadmin/          Next.js app (admin panel)
│   └── simpleplataforma/     Next.js app (landing)
│
├── packages/                 Código compartido (npm workspace)
│   ├── types/                TypeScript types
│   │   ├── index.ts          Exports todas las interfaces
│   │   └── *.d.ts            Definiciones
│   │
│   ├── config/               Constantes y configuración
│   │   ├── index.ts          Verticales, validaciones, etc
│   │   └── *.ts              Feature configs
│   │
│   ├── ui/                   Componentes reutilizables
│   │   ├── index.tsx         All components export
│   │   ├── theme-base.css    Estilos globales
│   │   └── lib/              UI utilities
│   │
│   └── utils/                Funciones auxiliares
│       ├── index.ts          Exports
│       └── *.ts              Helpers
│
├── services/
│   └── api/                  Backend Hono
│       ├── src/
│       │   ├── index.ts      Server principal
│       │   ├── db/           Database layer
│       │   │   ├── schema.ts (Drizzle schemas)
│       │   │   ├── types.ts   Types para BD
│       │   │   └── index.ts   Client instance
│       │   ├── routes/       API endpoints
│       │   ├── middleware/   Auth, error handling
│       │   └── mercadopago.ts Payment integration
│       ├── drizzle.config.ts Config para migrations
│       └── package.json      Dependencies
│
├── docs/                     📚 Documentación
│   ├── PROJECT_STATUS.md     Estado actual
│   ├── DATABASE_SETUP.md     Setup Drizzle
│   ├── ARCHITECTURE.md       Este archivo
│   ├── DEVELOPMENT.md        Guía dev
│   └── *.md                  Otros docs
│
├── .env.local (no en repo)   Secrets
├── .gitignore                Archivos ignorados
├── package.json              Workspace root
└── README.md                 Guía rápida
```

---

## Data Flow (Ejemplo: Crear Listing)

```
1. FRONTEND (SimpleAutos)
   User hace click en "Publicar"
   ↓
2. FORM VALIDATION
   FormData → Zod schema validación local
   ↓
3. API REQUEST
   POST /api/listings
   Body: { title, description, price, ... }
   Headers: Authorization: Bearer <JWT_TOKEN>
   ↓
4. BACKEND (Hono)
   - Middleware JWT: Verificar token
   - Validación Zod: REvalidar datos
   - Business Logic: generateSlug, validatePrice, etc
   - Database Query: db.insert(listings).values({...})
   ↓
5. DATABASE (PostgreSQL)
   INSERT INTO listings (
     id, owner_id, vertical, title, ...
   ) VALUES (...)
   ↓
6. RESPONSE
   { ok: true, listing: { id, slug, ... } }
   ↓
7. FRONTEND
   Update UI, redirect a /panel/publicaciones
```

---

## Authentication Flow

```
LOGIN

1. User ingresa email + password
   ↓
2. POST /api/auth/login
   Body: { email, password }
   ↓
3. Backend:
   - Find user by email (db.query.users.findFirst)
   - Compare password: bcrypt.compare(pwd, hash)
   - If valid: generate JWT token
   - setTimeout cookie with HttpOnly + SameSite
   ↓
4. Response:
   Cookie: 🍪 token=<JWT>; HttpOnly; SameSite=Lax
   Body: { ok: true, user: { id, email, name, role } }
   ↓
5. Frontend stores in auth context (automatic from cookie)
   ↓
6. Future requests: automatically include cookie
   ↓
7. Backend verifies JWT en middleware

LOGOUT
1. POST /api/auth/logout
2. Backend: delete cookie (maxAge=0)
3. Frontend: clear auth context
```

---

## Request/Response Pattern (Zod)

```typescript
// Schema
const createListingSchema = z.object({
  vertical: z.enum(['autos', 'propiedades']),
  title: z.string().min(3).max(220),
  price: z.number().positive(),
  location: z.string().optional(),
});

// API Endpoint
app.post('/api/listings', async (c) => {
  const user = authUser(c);  // Get from JWT
  if (!user) return c.json({ ok: false }, 401);
  
  // Parse & validate
  const body = await c.req.json();
  const parsed = createListingSchema.safeParse(body);
  
  if (!parsed.success) {
    return c.json({
      ok: false,
      errors: parsed.error.flatten()
    }, 400);
  }
  
  // Database
  const listing = await db.insert(listings).values({
    owner_id: user.id,
    ...parsed.data,
    created_at: new Date(),
  }).returning();
  
  // Response
  return c.json({
    ok: true,
    listing
  });
});
```

---

## Security Layers

```
┌─────────────────────────────────────┐
│    CORS Headers                     │ ← Allow specific origins
├─────────────────────────────────────┤
│    JWT Authentication               │ ← Verify token signature
├─────────────────────────────────────┤
│    Input Validation (Zod)           │ ← Sanitize inputs
├─────────────────────────────────────┤
│    Password Hashing (bcrypt)        │ ← Never store plaintext
├─────────────────────────────────────┤
│    Rate Limiting                    │ ← (TODO) Prevent brute force
├─────────────────────────────────────┤
│    HTTPS / SSL                      │ ← Production only
├─────────────────────────────────────┤
│    HttpOnly Cookies                 │ ← Prevent XSS theft
├─────────────────────────────────────┤
│    SameSite Cookies                 │ ← Prevent CSRF
├─────────────────────────────────────┤
│    Database Parameterized Queries   │ ← Prevent SQL injection
└─────────────────────────────────────┘
```

---

## Deployment Architecture (Future)

```
┌─────────────────────────────────────┐
│         CDN (Cloudflare)            │
│         Cache + DDoS protection     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│    Vercel (Frontend)                │ ← Next.js hosting
│    - SimpleAutos                    │
│    - SimplePropiedades              │
│    - SimpleAdmin                    │
│    - SimplePlataforma               │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│    Railway / Render (Backend)       │ ← Hono API
│    Auto-scaling containers          │
│    /api/* routes                    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│    Vercel Postgres / Railway DB     │ ← PostgreSQL
│    Automated backups                │
│    Replication                      │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│    Third-party Services             │
│    - MercadoPago (payments)         │
│    - SendGrid (email)               │
│    - AWS S3 (images)                │
└─────────────────────────────────────┘
```

---

## Performance Considerations

### Frontend
- **Code Splitting**: Next.js automático por ruta
- **Image Optimization**: `next/image` componente
- **CSS-in-JS**: TailwindCSS → CSS puro
- **Lazy Loading**: Componentes dinámicos
- **Caching**: Static generated pages

### Backend
- **Query Optimization**: Índices en BD
- **Connection Pooling**: PgBouncer
- **Caching**: Redis (Redis Cloud, valkey.com)
- **Compression**: gzip en responses
- **Rate Limiting**: redis + sliding window

### Database
- Índices en: `email`, `owner_id`, `vertical`, `section`
- Partitioning: listings por año (si crece mucho)
- Full-text search: PostgreSQL native
- Read replicas: Para consultas pesadas

