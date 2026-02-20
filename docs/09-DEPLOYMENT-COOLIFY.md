# Deploy en VPS con Coolify

Guia para desplegar `simpleautos`, `simplepropiedades` y `simple-api` desde el monorepo.

## 1) DNS y dominios

- `simpleautos.app` -> A/AAAA al VPS con Coolify.
- `simplepropiedades.app` -> A/AAAA al VPS con Coolify.

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

## 5) Servicio: simple-api (staging recomendado)

Crear un tercer servicio en Coolify:

- Build Pack: `Dockerfile`.
- Dockerfile Path: `services/api/Dockerfile`
- Build Context: raiz del repo.
- Port: `4000`.
- Domain (staging): `https://api-staging.simpleplataforma.app`.

Variables de entorno minimas:

- `NODE_ENV=production`
- `API_HOST=0.0.0.0`
- `API_PORT=4000`
- `CORS_ORIGIN=https://staging.simpleautos.app,https://www.simpleautos.app`
- `LISTINGS_REPOSITORY=supabase`
- `SUPABASE_URL=<tu supabase url>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>`

Healthcheck recomendado:

- `GET /api/health`

Smoke test desde local:

```bash
npm run api:smoke -- --base=https://api-staging.simpleplataforma.app
```

Si el smoke falla, no habilitar el feature flag en frontend.

## 6) Activar flag solo en staging (simpleautos)

En el servicio staging de `simpleautos`:

- `NEXT_PUBLIC_ENABLE_SIMPLE_API_LISTINGS=true`
- `NEXT_PUBLIC_SIMPLE_API_BASE_URL=https://api-staging.simpleplataforma.app`

Luego redeploy y validar home sliders (`venta`, `arriendo`, `subasta`).

## 7) SSL y health check

- Habilita SSL automático en ambos dominios desde Coolify.
- Healthcheck recomendado: `GET /api/health`.

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
