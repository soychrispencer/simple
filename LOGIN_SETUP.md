# 🔐 Configuración del Login en SimpleAgenda

## Problema Identificado

El error **"Correo electrónico o contraseña incorrectos"** ocurre porque:
- El usuario superadmin **no existe en la BD**
- El script de seed-superadmin nunca fue ejecutado

## ✅ Solución: Ejecutar Seed-Superadmin

### Paso 1: Asegurar que la API está corriendo
```bash
npm run dev:api
```
Verifica que esté en `http://localhost:4000` y retorne `{ ok: true, service: "simple-v2-api" }`

### Paso 2: Ejecutar el script de seed en OTRA terminal
```bash
cd c:\Users\chris\Desktop\Simple\services\api
node scripts/seed-superadmin.mjs admin@simpleplataforma.app Pik@0819 "Admin User"
```

**Output esperado:**
```
✅ Usuario superadmin creado exitosamente!
   Email:       admin@simpleplataforma.app
   Contraseña:  Pik@0819
```

### Paso 3: Intentar login nuevamente
1. Ve a `http://localhost:3004/panel` (SimpleAgenda)
2. Haz clic en "Iniciar sesión"
3. Usa las credenciales:
   - Email: `admin@simpleplataforma.app`
   - Contraseña: `Pik@0819`

## 🎨 Mejoras de Diseño Implementadas

- ✅ Inputs con mejor contraste (`background: var(--surface)`)
- ✅ Mejor espaciado en formularios (`space-y-3.5`)
- ✅ Colores de borde consistentes (`var(--border)`)
- ✅ Textos más legibles (`color: var(--fg)`)

## 📋 Verificación

Si aún falla, verifica:
1. API está corriendo: `curl http://localhost:4000/health`
2. La BD tiene el usuario: Revisa los logs de seed
3. Las credenciales son correctas (sin espacios)
4. No hay rate limiting: Espera 5 min y reintenta

## 🔍 Debugging

Si necesitas más detalles, abre la consola de Dev Tools (F12) en el navegador:
- Network → revisar respuesta en `/api/auth/login`
- Console → revisar errores

---

**Contáctame si persisten los problemas** 🚀
