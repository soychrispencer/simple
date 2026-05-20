# Scripts del Repositorio

Este directorio contiene scripts operativos y de soporte para mantenimiento local.

## Scripts actuales

- `migrate-to-cloudflare.ts`: **legacy** — migración one-off B2 → R2 (requiere credenciales B2; el runtime ya no usa Backblaze).
- `ensure-ui-built.mjs`: build de `@simple/ui` antes de dev de apps.
- `restart-simpleautos.ps1`: reinicio rápido de entorno local para `simpleautos` (PowerShell).
- `restart-simpleautos.bat`: variante CMD del reinicio rápido para `simpleautos`.

Scripts one-off de parcheo (`patch-*`, `fix-mojibake`, `refactor-ui`) fueron eliminados en mayo 2026; el diff ya está en el historial de git.

## Convenciones

- Los scripts de entorno local deben ser idempotentes y no afectar otras apps.
- Todo script nuevo debe incluir encabezado de uso y variables esperadas.
- Evitar scripts "one-off" en raíz del repo; ubicar siempre aquí y documentar.

## Recomendación

Si un script deja de usarse o su flujo queda cubierto por comandos estándar de `pnpm`, eliminarlo en lugar de mantenerlo como deuda histórica.
