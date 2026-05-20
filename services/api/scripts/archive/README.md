# Scripts archivados (ops / one-off)

Herramientas de mantenimiento que **no** están en `package.json`. Ejecutar desde `services/api`:

```bash
pnpm exec tsx scripts/archive/<script>.ts
# o
node scripts/archive/<script>.mjs
```

| Script | Uso |
|--------|-----|
| `seed-superadmin.mjs` | Crear superadmin inicial vía API HTTP |
| `promote-to-superadmin.mjs` | Promover usuario por API |
| `reset-password.ts` | Reset local de contraseña (dev) |
| `cleanup-users.ts` | Borrar usuarios de prueba (dev) |
| `migrate-admin-accounts.ts` (+ `.sql`) | Migración histórica admin por vertical |
| `apply-pending-migrations.ts` | Journal por hash (casos de drift) |
| `apply-0041-check-only.ts` | CHECK 0041 sin DROP destructivo |
| `run-single-migration-file.ts` | Aplicar un `.sql` del journal por tag |

Los scripts canónicos siguen en `scripts/` y en `pnpm` (`db:setup`, seeds, etc.).
