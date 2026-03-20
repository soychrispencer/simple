# Sistema de Bootstrap - Guía de Setup Inicial

## Descripción General

El sistema incluye un endpoint especial `/api/admin/bootstrap` que permite crear el primer usuario administrador sin requerir autenticación previa. Esto es útil para la inicialización de nuevos ambientes.

## Punto de Entrada
- **Endpoint:** `POST /api/admin/bootstrap`
- **Base URL:** `http://localhost:4000` (desarrollo)
- **Autenticación:** No requerida (solo la primera vez)
- **Restricción:** Solo funciona si NO existe ningún admin/superadmin en la base de datos

## Payload Requerido

```json
{
  "name": "Nombre del Administrador",
  "email": "admin@ejemplo.com",
  "password": "contraseña_segura"
}
```

### Validaciones
- `name`: Mínimo 2 caracteres
- `email`: Formato válido, única en la base de datos
- `password`: Mínimo 6 caracteres

## Respuestas

### ✅ Éxito (201)
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "admin@ejemplo.com",
    "name": "Nombre del Administrador",
    "role": "superadmin",
    "status": "verified",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

### ❌ Error - Admin ya existe (403)
```json
{
  "ok": false,
  "error": "Ya existe un administrador en el sistema"
}
```

### ❌ Error - Validación (400)
```json
{
  "ok": false,
  "error": "Payload inválido"
}
```

## Método Programático - Usando Script

### 1. Con el script `seed-superadmin.mjs`
```bash
cd services/api
npx tsx scripts/seed-superadmin.mjs admin@simpleplataforma.app Pik@0819 "Admin Simple"
```

**Salida esperada:**
```
🌱 Creando usuario superadmin inicial...
   Email: admin@simpleplataforma.app
   Nombre: Admin Simple
   API: http://localhost:4000

📡 Conectando a la API...
✅ Usuario superadmin creado exitosamente!

🎯 Puedes loguearte en SimpleAdmin con:
   Email:       admin@simpleplataforma.app
   Contraseña:  Pik@0819
   URL:         http://localhost:3002
```

### 2. Con curl
```bash
curl -X POST http://localhost:4000/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Simple",
    "email": "admin@simpleplataforma.app",
    "password": "Pik@0819"
  }'
```

### 3. Con PowerShell
```powershell
$body = @{
  name = "Admin Simple"
  email = "admin@simpleplataforma.app"
  password = "Pik@0819"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/admin/bootstrap" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

## Acceso al Panel Admin

Después de crear el usuario superadmin, puedes acceder al panel de administración:

1. **URLs de los Apps:**
   - SimpleAdmin: http://localhost:3002
   - SimpleAutos: http://localhost:3000
   - SimplePropiedades: http://localhost:3001
   - SimplePlataforma: http://localhost:3003

2. **Credenciales:**
   - Email: (la que especificaste en bootstrap)
   - Contraseña: (la que especificaste en bootstrap)

3. **Funcionalidades Disponibles:**
   - ✅ Gestión de usuarios (ver, editar, cambiar rol, eliminar)
   - ✅ Cambiar estado de usuario (activo/verificado/suspendido)
   - ✅ Cambiar rol de usuario (user/admin/superadmin)
   - ✅ Gestión de anuncios y publicaciones
   - ✅ Monitoreo de leads y conversaciones

## Importante ⚠️

1. **Una sola vez:** El endpoint solo funciona la primera vez que se ejecuta. Los intentos subsecuentes retornarán error 403.

2. **Seguridad:** El usuario se crea inmediatamente como `superadmin` con status `verified`. En producción, considera validar el email o requerir confirmación.

3. **Ambiente:** Esta funcionalidad es principalmente para desarrollo. En producción, considera:
   - Proteger el endpoint con IP whitelist
   - Requerir token especial o contraseña maestra
   - Loguear todos los intentos
   - Usar solo en setup inicial, luego deshabilitar

## Troubleshooting

### "Ya existe un administrador en el sistema"
- Significa que ya hay un admin creado previamente
- Opciones:
  1. Usar credenciales del admin existente
  2. Usar script `promote-to-superadmin.mjs` si necesitas cambiar el rol de un usuario existente
  3. Limpiar la base de datos y reintentar

### "No se pudo conectar al API"
- Verifica que el servidor está corriendo: `npm run dev` en `services/api`
- Verifica el puerto: `http://localhost:4000` (default)
- Verifica conectividad de red

### "Payload inválido"
- Verifica que el JSON está bien formado
- Revisa validaciones: name (mín 2), email (válido), password (mín 6)

## Endpoints Relacionados

### Después de Bootstrap

Estos endpoints requieren autenticación como admin:

- `GET /api/admin/users` - Listar todos los usuarios
- `PATCH /api/admin/users/:id/role` - Cambiar rol
- `PATCH /api/admin/users/:id/status` - Cambiar estado
- `DELETE /api/admin/users/:id` - Soft delete usuario
- `PUT /api/admin/users/:id` - Editar datos del usuario

Ver documentación API completa en `docs/` para más detalles.
