# Deploy en VPS con Coolify

Guia para desplegar `simpleautos`, `simplepropiedades` y `simple-api` desde el monorepo.

## 1) DNS y dominios

- `www.simpleautos.app` -> A/AAAA al VPS con Coolify.
- `www.simplepropiedades.app` -> A/AAAA al VPS con Coolify.
- (Opcional) `simpleautos.app` y `simplepropiedades.app` redirigidos a `www`.

Espera propagación antes de generar certificados.

## 2) Repositorio y branch

- Sube estos cambios a GitHub.
- En Coolify, conecta el repo y usa la rama de despliegue (ej: `main`).

## 3) Servicio: SimpleAutos

Crear un servicio en Coolify:

- Build Pack: `Dockerfile`.
- Dockerfile Path: `apps/simpleautos/Dockerfile`
- Build Context: raíz del repo.
- Port: `3000`.
- Domain: `https://simpleautos.app`.

Variables de entorno:

- Usa como base `.env.production.example` (root, fuente central).
- Claves mínimas: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`.

Branding esperado:

- Color primario: `#ff3600`.
- WhatsApp: `+56 9 7862 3828`.
- Correo: `hola@simpleautos.app`.
- Logos PNG: `apps/simpleautos/public/brand/`.

## 4) Servicio: SimplePropiedades

Crear un segundo servicio en Coolify:

- Build Pack: `Dockerfile`.
- Dockerfile Path: `apps/simplepropiedades/Dockerfile`
- Build Context: raíz del repo.
- Port: `3000`.
- Domain: `https://simplepropiedades.app`.

Variables de entorno:

- Usa como base `.env.production.example` (root, fuente central).
- Claves mínimas: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Branding esperado:

- Color primario: `#3232ff`.
- WhatsApp: `+56 9 7862 3828`.
- Correo: `hola@simplepropiedades.app`.
- Logos PNG: `apps/simplepropiedades/public/brand/`.

## 5) Servicio: simple-api

Crear un tercer servicio en Coolify:

- Build Pack: `Dockerfile`.
- Dockerfile Path: `services/api/Dockerfile`
- Build Context: raiz del repo.
- Port: `4000`.
- Domain: `https://api.simpleplataforma.app` (o el que definas para API).

Variables de entorno minimas:

- `NODE_ENV=production`
- `API_HOST=0.0.0.0`
- `API_PORT=4000`
- `CORS_ORIGIN=https://www.simpleautos.app,https://www.simplepropiedades.app`
- `LISTINGS_REPOSITORY=supabase`
- `SUPABASE_URL=<tu supabase url>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>`

Healthcheck recomendado:

- `GET /api/health`

Smoke test desde local:

```bash
npm run api:smoke -- --base=https://api.simpleplataforma.app
```

Si el smoke falla, no habilitar el feature flag en frontend.

## 6) Activar flag en frontends

En el servicio de `simpleautos`:

- `NEXT_PUBLIC_SIMPLE_API_BASE_URL=https://api.simpleplataforma.app`
- (Opcional) `NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS=true` o `false`

En el servicio de `simplepropiedades`:

- `NEXT_PUBLIC_SIMPLE_API_BASE_URL=https://api.simpleplataforma.app`
- (Opcional) `NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS=true` o `false`

Luego redeploy y validar home sliders:

- Autos: `venta`, `arriendo`, `subasta`
- Propiedades: `venta`, `arriendo`

## 7) SSL y health check

- Habilita SSL automático en ambos dominios desde Coolify.
- Healthcheck recomendado para `simple-api`: `http://localhost:4000/api/health` (interno del contenedor, sin HTTPS).
- Si Coolify marca `wget/curl not found`, usa una imagen que incluya una de esas herramientas o desactiva healthcheck temporalmente en UI.

## 8) Checklist post deploy

- Home responde en ambos dominios.
- Login/registro/confirmación de correo con URL correcta del dominio.
- Footer/contacto muestran WhatsApp y correo correctos.
- Colores de marca aplicados:
  - Autos: `#ff3600`
  - Propiedades: `#3232ff`
- Logos cargando desde:
  - `/brand/logo.png` (en cada vertical)
  - `/brand/favicon.png` (en cada vertical)
- `simple-api` responde:
  - `/api/health`
  - `/v1/listings?vertical=autos&type=sale&limit=3`
  - `/v1/listings?vertical=properties&type=sale&limit=3`
