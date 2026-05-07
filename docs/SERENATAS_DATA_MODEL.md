# SimpleSerenatas — modelo de datos y decisión canónica

## Decisión (MVP coordinador + pagos actuales)

| Concepto | Tabla canónica para nuevas rutas API / panel | Notas |
|----------|-----------------------------------------------|--------|
| **Serenata con cliente, coordinador, pago MP, estados** | `serenatas` | Pagos (`serenata_payments`), lineup y tracking del panel nuevo apuntan aquí. |
| **Solicitudes / grupos / rutas legadas** | `serenata_requests`, `serenata_groups`, `serenata_routes`, … | Se mantienen para flujos ya construidos; **no** duplicar nuevas features en ambos modelos sin plan de migración. |

## Entorno

Antes de probar el panel contra una base local o staging:

```bash
cd services/api
pnpm db:migrate
```

`DATABASE_URL` debe ser la misma familia de migraciones que el código (ver [ENV_CONVENTIONS.md](./ENV_CONVENTIONS.md)). Si faltan tablas (`42P01`), el despliegue o la BD están desalineados con el repo.

## Convergencia futura (no bloqueante MVP)

- Documentar por endpoint qué tabla usa (`serenatas` vs `serenata_requests`).
- Cuando el producto lo exija, una migración de datos unificada debe ir acompañada de tests e2e del flujo feliz.

## Referencia de esquema

Definiciones Drizzle: [services/api/src/db/schema.ts](../services/api/src/db/schema.ts) (`serenatas`, `serenata_requests`, `serenata_musicians`, …).
