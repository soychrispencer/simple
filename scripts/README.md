# Scripts del Repositorio

Este directorio contiene scripts operativos y de soporte para mantenimiento local.

## Scripts actuales

- `migrate-to-cloudflare.ts`: migración de objetos desde Backblaze B2 hacia Cloudflare R2.
- `restart-simpleautos.ps1`: reinicio rápido de entorno local para `simpleautos` (PowerShell).
- `restart-simpleautos.bat`: variante CMD del reinicio rápido para `simpleautos`.

## Convenciones

- Los scripts de entorno local deben ser idempotentes y no afectar otras apps.
- Todo script nuevo debe incluir encabezado de uso y variables esperadas.
- Evitar scripts "one-off" en raíz del repo; ubicar siempre aquí y documentar.

## Recomendación

Si un script deja de usarse o su flujo queda cubierto por comandos estándar de `pnpm`, eliminarlo en lugar de mantenerlo como deuda histórica.
