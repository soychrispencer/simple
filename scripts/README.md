# Scripts

Scripts de mantenimiento y soporte para desarrollo local y deploy.

## Scripts actuales

- `ensure-ui-built.mjs` — Build de `@simple/ui` antes de dev de apps
- `setup-env.mjs` — Configurar variables de entorno
- `free-dev-ports.mjs` — Liberar puertos de desarrollo
- `wait-for-api.mjs` — Esperar a que el API esté listo
- `coolify-deploy.mjs` — Deploy a Coolify
- `coolify-env-audit.mjs` — Auditar env vars de Coolify
- `coolify-env-set.mjs` — Configurar env vars en Coolify

## Convenciones

- Scripts idempotentes, sin efectos secundarios entre apps
- Incluir encabezado de uso y variables esperadas
- Scripts obsoletos se eliminan, no se archivan
