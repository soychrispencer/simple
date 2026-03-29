# Deployment a Coolify - Storage Provider Setup

## Pre-requisitos

1. ✅ Cuenta de Backblaze B2 creada
2. ✅ Bucket creado (e.g., `simple-media`)
3. ✅ Application Key generado
4. ✅ Tenencias a mano:
   - `BACKBLAZE_APP_KEY_ID`
   - `BACKBLAZE_APP_KEY`
   - `BACKBLAZE_BUCKET_ID`
   - `BACKBLAZE_BUCKET_NAME`
   - `BACKBLAZE_DOWNLOAD_URL`

---

## Pasos para Coolify

### 1. **Acceder a Coolify**

```bash
# SSH a tu servidor donde corre Coolify
ssh user@your-coolify-server.com
```

### 2. **Backend - services/api**

Actualizar variables de entorno en Coolify:

#### En Dashboard de Coolify:
1. Navega a tu aplicación `@simple/api`
2. Settings → Environment Variables
3. Agrega las siguientes variables:

```env
STORAGE_PROVIDER=backblaze-b2
BACKBLAZE_APP_KEY_ID=your_key_id_here
BACKBLAZE_APP_KEY=your_app_key_here
BACKBLAZE_BUCKET_ID=your_bucket_id
BACKBLAZE_BUCKET_NAME=simple-media
BACKBLAZE_DOWNLOAD_URL=https://f123.backblazeb2.com
```

#### ⚠️ IMPORTANTE
- `BACKBLAZE_APP_KEY` debe estar entre comillas si contiene caracteres especiales
- Los valores son case-sensitive
- No agregar espacios después del `=`

### 3. **Deploy**

Una vez agregadas las variables:

```bash
# Option 1: Desde Coolify Dashboard
# Haz click en "Redeploy" en tu aplicación

# Option 2: Desde CLI (si tienes acceso)
cd services/api
npm run build
```

### 4. **Verificar**

```bash
# Ver logs (desde Coolify Dashboard o SSH)
docker logs your-api-container-name

# Buscar línea:
# [simple-api] listening on http://0.0.0.0:4000

# Si hay errores, deberías ver:
# Error: Missing required Backblaze B2 environment variables
```

### 5. **Test del Endpoint**

```bash
# Desde tu máquina local
curl -X POST https://your-api.coolify.io/api/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-photo.jpg" \
  -F "fileType=image"
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "result": {
    "fileId": "b2_...",
    "url": "https://...",
    "publicUrl": "https://...",
    ...
  }
}
```

---

## Troubleshooting en Coolify

### Error: "Missing required Backblaze B2 environment variables"

✅ **Solución:**
- Verificar que TODAS las variables estén definidas
- Sin espacios extras
- Sin comillas innecesarias
- Hacer redeploy

### Error: "Failed to authorize with B2"

✅ **Soluciones:**
- Verificar que `BACKBLAZE_APP_KEY_ID` y `BACKBLAZE_APP_KEY` sean correctos
- Key puede tener vencimiento en B2 console
- Generar nuevo Application Key si es necesario

### Error: "Upload failed"

✅ **Verificar:**
- Bucket existe en B2
- Bucket tiene permisos de escritura pública
- Quota no está excedida en B2

---

## Monitoreo Post-Deploy

### 1. **Ver uploads en B2**

Desde B2 Console:
1. Selecciona el bucket
2. **Browse Files**
3. Deberías ver archivos con estructura: `{userId}/{listingId}/{timestamp}-{filename}`

### 2. **Verificar URLs públicas**

Una URL debe ser accesible:
```
https://yourbucket.backblazeb2.com/file/simple-media/userid/temp/1711814400000-photo.jpg
```

### 3. **Monitoreo de costos B2**

En B2 Dashboard:
- **Usage & Billing**
- Ver bytes transferidos
- Estimar costo mensual

---

## Rollback (Si hay problemas)

Si algo falla y necesitas volver atrás:

```bash
# git reset al commit anterior
git reset --hard 7e82e45

# Remover las variables de entorno del API en Coolify
# (dejar STORAGE_PROVIDER vacío o comentado)

# Redeploy
```

---

## Próximas Fases

### Fase 1 (ACTUAL): ✅ Done
- Storage infrastructure lista
- API endpoint funciona

### Fase 2 (NEXT): Integración con UI
- Modificar `PanelMediaUploader` para usar uploads
- Cambiar flujo de publicación
- (~2-3 horas)

### Fase 3 (DESPUÉS): Optimizaciones
- CDN edge caching
- Transformación de imágenes
- Versioning de archivos

---

## Documentación de Referencia

- B2 API Docs: https://www.backblaze.com/b2/docs/
- Coolify Docs: https://coolify.io/
- Tu repositorio: `docs/STORAGE_SETUP.md`

---

## Duración Estimada

| Tarea | Tiempo |
|-------|--------|
| Configurar vars en Coolify | 5 min |
| Redeploy | 2-5 min |
| Verificar | 5 min |
| **Total** | **<15 min** |

🚀 **¡Listo para producción!**
