# SimpleSerenatas — post-MVP (reactivación ordenada)

Reactivar **solo** cuando el piloto ([SERENATAS_PILOT_RUNBOOK.md](./SERENATAS_PILOT_RUNBOOK.md)) lo justifique.

## Cliente

- Navegación: `Solicitar`, `Mis serenatas` en barra inferior (ver `panel-nav-config.ts`).
- Criterio: coordinador cierra al menos N serenatas reales sin workaround crítico.

## Músico

- Invitaciones, disponibilidad, agenda — en ese orden según frecuencia de uso en piloto.

## Monetización

1. Registro contable mínimo alineado con pagos existentes (Mercado Pago en API).
2. Luego: comisión por serenata vs plan pro (suscripción).

## Panel coordinador — ítems actualmente recortados en MVP

- **Chat:** volver a incluir en `roles` de `PANEL_NAV_ITEMS` y en `ROUTE_ROLE_ACCESS` para coordinador.
- **Suscripción:** restaurar `roles: ['coordinator']` (o equivalente) cuando el flujo de cobro recurrente esté listo.

Documentar fecha y decisión al reactivar cada bloque.
