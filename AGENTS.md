# AGENTS.md

## Cursor Cloud specific instructions

Monorepo pnpm (Node >= 22, pnpm 10). Comandos estándar de dev/lint/test/build están en `README.md`, `docs/DEVELOPMENT.md` y los scripts de `package.json`. Esta sección solo cubre lo no obvio para levantar el entorno en Cloud.

### Servicios

- **PostgreSQL** (`localhost:5432`, db `simplev2`, user `postgres` / pass `password`): requerido por la API. Es dependencia de sistema (instalada vía apt, persiste en el snapshot) y **no arranca sola**. Iniciar con: `sudo pg_ctlcluster 16 main start`.
- **API Hono** (`@simple/api`, puerto `4000`): `pnpm run dev:api` (usa `tsx watch`, sin typecheck). Health: `GET http://localhost:4000/api/health`. Lee `services/api/.env.local`.
- **Frontends Next.js** (puertos 3000–3005): `pnpm run dev:simpleadmin|dev:simpleplataforma|dev:autos|dev:propiedades|dev:agenda|dev:serenatas`, o todos con `pnpm run dev:all` (cada front espera el health de la API). Los frontends hacen proxy de `/api/*` a la API.

### Setup de base de datos (gotchas)

Tras instalar deps y arrancar Postgres, antes de usar la API:

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='simplev2'" | grep -q 1 || sudo -u postgres createdb simplev2
cp services/api/.env.local.example services/api/.env.local   # si no existe
pnpm --filter @simple/api run db:setup                        # migrate + post-journal + sync hashes
```

- **Migraciones 0096–0098 no están registradas** en `POST_JOURNAL_TAGS` (`services/api/src/db/apply-post-journal-migrations.ts`) ni en el journal de drizzle, así que `db:setup` deja la tabla `users` SIN las columnas `timezone` y `dst_enabled`. La API falla al precargar caché (`column "timezone" does not exist`) hasta aplicarlas manualmente (idempotente):

```bash
sudo -u postgres psql -d simplev2 -c "ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"timezone\" varchar(50) NOT NULL DEFAULT 'America/Santiago';"
sudo -u postgres psql -d simplev2 -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS dst_enabled BOOLEAN NOT NULL DEFAULT false;"
```

- `db:seed` (CRM) llama a la API por HTTP; solo funciona con la API ya corriendo. Para datos directos en DB usar `db:seed:marketplace` o `db:seed:serenatas-e2e`.

### Frontend env

Cada app necesita `apps/<app>/.env.local` (copiar de `.env.local.example`). En el navegador, `resolveApiBase` (`packages/config`) usa mismo-origen vía rewrite de Next aunque `NEXT_PUBLIC_API_URL` apunte a otro host/puerto, por lo que las cookies de sesión funcionan sin ajustes extra de CORS.

### Registro/login en dev

Sin SMTP configurado y fuera de producción, el registro marca al usuario como `verified` e inicia sesión automáticamente (no requiere verificación por email). El campo `termsAccepted: true` es obligatorio en `POST /api/auth/register`.

### Estado conocido del repo (preexistente, no romper)

- `pnpm install --frozen-lockfile` falla: el lockfile está desfasado respecto a `services/api/package.json` (dep `twilio` removida). Usar `pnpm install --no-frozen-lockfile`.
- `eslint.config.mjs` importa `@eslint/js`; debe estar declarado como devDependency raíz para que `pnpm run lint` resuelva el módulo.
- `pnpm run lint` reporta 4 errores `prefer-const` preexistentes en `services/api` (código de app, no del entorno).
- `pnpm run test`: ~6 tests de componentes React fallan con `document is not defined` porque `vitest.config.ts` usa `environment: 'node'` global y esos tests no anotan jsdom (preexistente).
- `pnpm run build` falla en `services/api` (`tsc`) por error de tipo preexistente en `src/index.ts` (`serenataOwners`). El modo dev (`tsx watch`) no se ve afectado. Los paquetes y los frontends Next sí compilan.
