# Deploy en VPS con Coolify

Guía para desplegar `simpleautos` y `simplepropiedades` desde el monorepo.

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
- Dockerfile Path: `deploy/coolify/simpleautos.Dockerfile`
- Build Context: raíz del repo.
- Port: `3001`.
- Domain: `https://simpleautos.app`.

Variables de entorno:

- Usa como base `apps/simpleautos/.env.production.example`.
- Claves mínimas: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`.

Branding esperado:

- Color primario: `#ff3600`.
- WhatsApp: `+56 9 7862 3828`.
- Correo: `hola@simpleautos.app`.
- Logos PNG: `apps/simpleautos/public/brand/`.

## 4) Servicio: SimplePropiedades

Crear un segundo servicio en Coolify:

- Build Pack: `Dockerfile`.
- Dockerfile Path: `deploy/coolify/simplepropiedades.Dockerfile`
- Build Context: raíz del repo.
- Port: `3002`.
- Domain: `https://simplepropiedades.app`.

Variables de entorno:

- Usa como base `apps/simplepropiedades/.env.production.example`.
- Claves mínimas: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Branding esperado:

- Color primario: `#3232ff`.
- WhatsApp: `+56 9 7862 3828`.
- Correo: `hola@simplepropiedades.app`.
- Logos PNG: `apps/simplepropiedades/public/brand/`.

## 5) SSL y health check

- Habilita SSL automático en ambos dominios desde Coolify.
- Healthcheck recomendado: `GET /`.

## 6) Checklist post deploy

- Home responde en ambos dominios.
- Login/registro/confirmación de correo con URL correcta del dominio.
- Footer/contacto muestran WhatsApp y correo correctos.
- Colores de marca aplicados:
  - Autos: `#ff3600`
  - Propiedades: `#3232ff`
- Logos cargando desde:
  - `/brand/logo.png` (en cada vertical)
  - `/brand/favicon.png` (en cada vertical)
