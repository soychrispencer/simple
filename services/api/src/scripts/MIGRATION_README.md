# Migración de Cuentas Admin

Este documento describe la migración que divide `admin@simpleplataforma.app` en cuentas por vertical.

## 📋 Resumen de Cambios

| Antes | Después |
|-------|---------|
| `admin@simpleplataforma.app` (con publicaciones de autos) | `admin@simpleplataforma.app` (solo administrativo) |
| | `admin@simpleautos.app` (con publicaciones de autos) |
| | `admin@simplepropiedades.app` (listo para usar) |

## 🎯 Resultado Final

### Cuentas después de la migración:

1. **admin@simpleplataforma.app** 
   - Uso: Panel administrativo de Simple
   - Publicaciones: Ninguna (movidas a simpleautos)

2. **admin@simpleautos.app**
   - Uso: Publicaciones de vehículos
   - Perfil público: `https://simpleautos.app/perfil/simpleautos`
   - Contraseña: Misma que admin@simpleplataforma.app

3. **admin@simplepropiedades.app**
   - Uso: Publicaciones de propiedades
   - Perfil público: `https://simplepropiedades.app/perfil/simplepropiedades`
   - Contraseña: Misma que admin@simpleplataforma.app

## 🚀 Opciones de Ejecución

### Opción 1: Script Automático (Recomendado)

```bash
# 1. Hacer backup primero (IMPORTANTE)
cd /ruta/al/proyecto
docker exec simple-postgres pg_dump -U postgres simple_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Ejecutar script de migración
cd services/api
npx tsx src/scripts/migrate-admin-accounts.ts
```

### Opción 2: SQL Manual (Alternativa)

```bash
# 1. Hacer backup
docker exec simple-postgres pg_dump -U postgres simple_db > backup_pre_migracion.sql

# 2. Ejecutar script SQL
psql -h localhost -U postgres -d simple_db -f src/scripts/migrate-admin-accounts.sql
```

## ✅ Verificación Post-Migración

Después de ejecutar, verifica:

1. **Login en SimpleAutos:**
   - Email: `admin@simpleautos.app`
   - Password: (la misma que usabas antes)
   - Verificar que las publicaciones aparecen en el panel

2. **Perfil público:**
   - Visitar: `https://simpleautos.app/perfil/simpleautos`
   - Verificar que muestra el catálogo de publicaciones

3. **Panel SimplePropiedades:**
   - Login con: `admin@simplepropiedades.app`
   - Listo para crear nuevas publicaciones

## 🔧 Rollback (en caso de problemas)

Si algo sale mal, puedes revertir:

```bash
# Restaurar desde backup
docker exec -i simple-postgres psql -U postgres -d simple_db < backup_YYYYMMDD_HHMMSS.sql
```

O manualmente, mover publicaciones de vuelta:

```sql
-- Obtener IDs
SELECT id, email FROM users WHERE email IN ('admin@simpleplataforma.app', 'admin@simpleautos.app');

-- Migrar de vuelta (reemplazar UUIDs)
UPDATE listings 
SET owner_id = 'UUID-ANTIGUO' 
WHERE owner_id = 'UUID-AUTOS' 
  AND vertical = 'autos';
```

## 📊 Qué hace la migración

1. ✅ Crea `admin@simpleautos.app` (misma contraseña)
2. ✅ Crea `admin@simplepropiedades.app` (misma contraseña)
3. ✅ Mueve todas las publicaciones de autos al nuevo usuario
4. ✅ Mueve los borraders de autos al nuevo usuario
5. ✅ Crea perfiles públicos para ambos nuevos usuarios
6. ✅ Mantiene `admin@simpleplataforma.app` intacto para admin

## ⚠️ Precauciones

- **SIEMPRE** haz backup antes de ejecutar
- El script es idempotente (puede ejecutarse múltiples veces sin duplicar datos)
- Si los usuarios nuevos ya existen, se salta su creación
- Si los perfiles públicos ya existen, se saltan su creación

## 🆘 Soporte

Si encuentras problemas:

1. Revisar logs de ejecución
2. Verificar que DATABASE_URL esté configurado correctamente
3. Confirmar que el usuario `admin@simpleplataforma.app` existe
4. Restaurar backup y reintentar

---

# Reorganización de Acceso Vertical-Scoped (2025)

## Descripción

Se implementó un sistema de administración vertical-scoped. Cada admin solo puede ver
los usuarios, publicaciones y leads de su vertical asignada. El superadmin ve todo.

## Cuentas definitivas

| Email | Rol | primary_vertical | Nombre |
|-------|-----|-----------------|--------|
| `admin@simpleplataforma.app` | `superadmin` | NULL (todo) | Admin Plataforma |
| `admin@simpleautos.app` | `admin` | `autos` | Admin SimpleAutos |
| `admin@simplepropiedades.app` | `admin` | `propiedades` | Admin SimplePropiedades |
| `admin@simpleagenda.app` | `admin` | `agenda` | Admin SimpleAgenda |
| `admin@simpleserenatas.app` | `admin` | `serenatas` | Admin SimpleSerenatas |

**Contraseña para todos:** `Pik@0819`

## Ejecutar seed (local y producción)

```bash
# Local
cd services/api
DATABASE_URL=<url> pnpm seed:admins

# o directamente
DATABASE_URL=<url> npx tsx src/scripts/seed-admin-users.ts
```

El script es idempotente: actualiza si el usuario ya existe, crea si no existe.
No toca publicaciones ni datos existentes.

## Cambios de schema

- Nueva columna `users.primary_vertical` (varchar 20, nullable).
- Migración: `drizzle/0039_user_primary_vertical.sql`
- `NULL` = superadmin (acceso global); valor = vertical asignada.

## Lógica de autorización

- `isAdminForVertical(user, vertical)` en `src/index.ts`.
- Admin router (`modules/admin/router.ts`): overview, users, listings, leads filtrados por vertical del admin.
- Mutaciones de usuarios (role/status/delete/edit): solo superadmin.
- CRM router (`modules/crm/router.ts`): service leads filtrados por vertical del admin.
