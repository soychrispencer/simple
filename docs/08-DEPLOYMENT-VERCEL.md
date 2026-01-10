# Deployment a Producción (Vercel) — Simple Ecosystem

Esta guía es **paso a paso** para publicar el ecosistema en producción usando **Vercel**.

El repositorio es un **monorepo** (workspaces) con:
- `apps/*` (verticales Next.js)
- `packages/*` (código compartido)
- `backend/supabase/*` (migraciones/seed)

## Idea clave (para tu duda)

- **Sí, debes subir TODO el repo** (la carpeta raíz del monorepo) a Git.
- **No despliegas todo como un solo sitio**.
- En Vercel creas **1 proyecto por vertical**, todos apuntando al **mismo repo**, pero con distinto `Root Directory`.

Ejemplo:
- Proyecto Vercel `simpleautos` → Root: `apps/simpleautos` → dominio: `simpleautos.app`
- Proyecto Vercel `simplepropiedades` → Root: `apps/simplepropiedades` → dominio: `simplepropiedades.app`
- Proyecto Vercel `simpletiendas` → Root: `apps/simpletiendas` → dominio: `simpletiendas.app`

---

## Paso 0 — Preparar cuentas

Necesitas:
- Cuenta Vercel
- Cuenta Supabase (Cloud)
- Cuenta MercadoPago (para SimpleAutos)

---

## Paso 1 — Subir el repo a Git (una sola vez)

> Vercel despliega desde Git. Si nunca has subido un proyecto, este es el primer gran paso.

1) Crea un repo en GitHub/GitLab/Bitbucket (vacío), por ejemplo: `simple-ecosystem`.

2) En tu PC (Windows), en la raíz del proyecto `Simple`:

```bash
git init
git add .
git commit -m "Initial commit"

git remote add origin <URL-DE-TU-REPO>
git push -u origin main
```

Notas:
- No subas secretos. Los secretos van en Vercel (Environment Variables) o en un `.env` local NO commiteado.

---

## Paso 2 — Crear el proyecto de SimpleAutos en Vercel

1) En Vercel: **Add New → Project**
2) Importa el repo.
3) En configuración del proyecto:

- **Root Directory**: `apps/simpleautos`
- **Framework Preset**: Next.js
- **Build Command**: `npm run build --workspace=simpleautos`
- **Install Command**: `npm install`

> Aunque el Root sea `apps/simpleautos`, Vercel clona el repo completo; eso permite usar `packages/*`.

4) Deploy.

---

## Paso 3 — Conectar dominio `simpleautos.app`

1) Vercel → Project `simpleautos` → Settings → Domains
2) Agrega `simpleautos.app` (y opcional `www.simpleautos.app`).
3) Vercel te mostrará los **DNS records** requeridos.
4) En tu proveedor de dominio, copia esos registros.
5) Espera a que Vercel marque el dominio como **Valid**.

---

## Paso 4 — Variables de entorno (SimpleAutos)

Vercel → Project `simpleautos` → Settings → Environment Variables

Configura al menos en **Production**:

### App URLs
- `NEXT_PUBLIC_APP_URL=https://simpleautos.app`
- `PUBLIC_APP_URL=https://simpleautos.app`

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>`
- `SUPABASE_SERVICE_ROLE_KEY=<service_role_key>`

### MercadoPago
- `MERCADOPAGO_ACCESS_TOKEN=<prod_access_token>`

Opcionales (recomendados en prod):
- `SESSION_COOKIE_DOMAIN=.simpleautos.app`
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_SAMESITE=lax`

Importante:
- Por ahora, **no configures** `MERCADOPAGO_WEBHOOK_SECRET` (la verificación de firma es best-effort; el webhook ya valida el pago consultando la API de MercadoPago).

Cuando agregues variables, haz **Redeploy** para que apliquen.

---

## Paso 5 — Configurar Supabase para producción

### 5.1 Auth URLs
En Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://simpleautos.app`
- Agrega Redirect URLs necesarias (mínimo el dominio).

### 5.2 Aplicar migraciones/seed a producción
Este repo trae un helper para empujar migraciones a producción:
- Script: `scripts/supabase-push.mjs`
- Comando: `npm run supabase:db:push:prod`

Necesitas definir `SUPABASE_PROD_DB_URL` en tu `.env` local (en la raíz del repo, NO en Vercel).

1) Crea/edita `.env` en la raíz (solo local):

```dotenv
SUPABASE_PROD_DB_URL=postgresql://...?
```

2) Ejecuta:

```bash
npm run supabase:db:push:prod
```

Esto debe dejar el plan `pro` activo en `subscription_plans` (requerido para activar suscripción desde el webhook).

---

## Paso 6 — Configurar MercadoPago (producción)

Checklist mínimo:
- Usa credenciales de **producción** en Vercel (`MERCADOPAGO_ACCESS_TOKEN`).
- El checkout configura automáticamente:
  - `back_urls` → vuelve a `/panel/mis-suscripciones?status=...`
  - `notification_url` → `https://simpleautos.app/api/payments/webhook`

En el dashboard de MercadoPago, confirma que tu app reciba webhooks de tipo `payment`.

---

## Paso 7 — Probar end-to-end (SimpleAutos)

1) Abre: `https://simpleautos.app/panel/mis-suscripciones`
2) Click “Activar Pro”
3) Completa pago
4) Debes volver con `?status=success`
5) La UI debería refrescar y mostrar suscripción/pagos reales.

Si algo falla, los 3 puntos más comunes son:
- `NEXT_PUBLIC_APP_URL` incorrecta (webhook/back_urls quedan mal)
- faltan credenciales Supabase admin (`SUPABASE_SERVICE_ROLE_KEY`)
- en Supabase prod no están aplicadas migraciones/seed (no existe plan `pro` activo)

---

## Paso 8 — Repetir por vertical (Propiedades / Tiendas)

Crea un proyecto Vercel por vertical:

- `simplepropiedades`:
  - Root Directory: `apps/simplepropiedades`
  - Dominio: `simplepropiedades.app`
  - Env: `NEXT_PUBLIC_APP_URL=https://simplepropiedades.app` (y Supabase)

- `simpletiendas`:
  - Root Directory: `apps/simpletiendas`
  - Dominio: `simpletiendas.app`
  - Env: `NEXT_PUBLIC_APP_URL=https://simpletiendas.app` (y Supabase)

Sugerencia:
- Mantén Supabase compartido si quieres un solo login/SSO/usuario entre verticales (el backend del repo está diseñado para multi-vertical).

---

## ¿Qué hacemos ahora?

1) Primero desplegamos **solo SimpleAutos** hasta que el pago Pro funcione real.
2) Luego repetimos el patrón para Propiedades y Tiendas.
