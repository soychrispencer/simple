# Deployment Playbook

Guía unificada para despliegue, migraciones de storage y operación de Instagram/Cloudflare.

## Alcance

Este playbook reemplaza la necesidad de consultar múltiples documentos para una misma operación.
Centraliza los pasos mínimos para:

- Deploy de apps/API.
- Migración Backblaze B2 -> Cloudflare R2.
- Operación del Worker de overlays para Instagram.

## Flujo recomendado

1. Revisar variables en `services/api/.env.example` y entorno de plataforma.
2. Ejecutar build y verificación:
   - `pnpm -r exec tsc --noEmit`
   - `pnpm -r run build`
3. Desplegar API y apps según `docs/COOLIFY_DEPLOYMENT.md`.
4. Validar endpoints críticos y health checks.
5. Si hay migración de media, seguir checklists de R2 y worker.

## Storage y migración

- Fuente principal: `docs/MIGRATION_BACKBLAZE_TO_CLOUDFLARE.md`
- Script operativo: `scripts/migrate-to-cloudflare.ts`
- Worker edge: `infrastructure/cloudflare/workers/instagram-overlay/README.md`

## Instagram / Cloudflare

- Fuente principal: `docs/MIGRATION_CLOUDFLARE_INSTAGRAM.md`
- Configurar bucket, token R2 y despliegue de worker antes de activar rutas en backend.

## Documentos de referencia

- Deploy plataforma: `docs/COOLIFY_DEPLOYMENT.md`
- Variables de entorno: `docs/ENV_CONVENTIONS.md`
- Setup storage base: `docs/STORAGE_SETUP.md`

## Nota de mantenimiento

Si una guía de deploy/migración cambia, actualiza este playbook y deja el detalle profundo en el documento temático correspondiente.
