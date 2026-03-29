# SimpleAutos - Flujo de Publicación con Almacenamiento en B2

## ✅ Cambios Implementados

### 1. **StorageProvider (Arquitectura)**
- Ubicación: `packages/config/src/index.ts`
- Interface abstracta para cualquier proveedor de almacenamiento
- Tipos: `StorageProvider`, `StorageUploadInput`, `StorageUploadResult`
- Permite cambiar entre B2, AWS S3, MinIO, CloudFlare sin tocar el código

### 2. **BackblazeB2Provider (Implementación)**
- Ubicación: `services/api/src/storage-providers/backblaze-b2.ts`
- Implementa StorageProvider usando B2 API v3
- Métodos: `upload()`, `delete()`, `getUrl()`, `health()`
- Manejo automático de autorización y renovación de tokens

### 3. **Storage Factory**
- Ubicación: `services/api/src/storage-providers/index.ts`
- Instancia el proveedor correcto según variable de entorno
- Permite agregar nuevos proveedores sin cambiar el código de aplicación

### 4. **Endpoint API para Upload**
- Ubicación: `services/api/src/index.ts`
- Ruta: `POST /api/media/upload`
- Requiere autenticación
- Devuelve URL pública directa a B2

### 5. **Cliente Frontend**
- Ubicación: `apps/simpleautos/src/lib/media-upload.ts`
- Función: `uploadMediaFile()` - upload individual
- Función: `uploadMultipleMedia()` - upload múltiples archivos
- Soporte para progress tracking

### 6. **Documentación**
- Ubicación: `docs/STORAGE_SETUP.md`
- Guía completa de configuración de B2
- Estimaciones de costo
- Troubleshooting

---

## 🔧 Configuración Requerida

### Variables de Entorno (`.env` en `services/api/`)

```bash
STORAGE_PROVIDER=backblaze-b2
BACKBLAZE_APP_KEY_ID=your_key_id
BACKBLAZE_APP_KEY=your_key
BACKBLAZE_BUCKET_ID=your_bucket_id
BACKBLAZE_BUCKET_NAME=your_bucket_name
BACKBLAZE_DOWNLOAD_URL=https://yourbucket.backblazeb2.com
```

---

## 📝 Próximos Pasos Recomendados

### 1. **Integración con Flujo de Publicación**
Modificar `apps/simpleautos/src/app/panel/publicar/page.tsx`:

```typescript
import { uploadMediaFile } from '@/lib/media-upload';

// En el fragmento donde se suben fotos:
const handlePhotoUpload = async (file: File) => {
    const result = await uploadMediaFile(file, {
        fileType: 'image',
        listingId: editingId || undefined,
    });
    
    if (result.ok && result.result) {
        // Guardar URL en lugar de dataUrl
        const newPhoto = {
            ...result.result,
            id: result.result.fileId,
            previewUrl: result.result.publicUrl,
            dataUrl: result.result.publicUrl, // Para compatibilidad temporal
            isCover: false,
        };
        setPhotos([...photos, newPhoto]);
    }
};
```

### 2. **Refactorizar PanelMediaUploader**
- Cambiar de base64 (dataUrl) a URLs públicas
- Usar el cliente `uploadMediaFile` internamente
- Mantener compatibility con UI existente

### 3. **Actualizar Flujo de Almacenamiento**
En `services/api/src/index.ts` endpoint `POST /api/listings`:

```typescript
// Antes: Guardaba rawData con dataUrl en base64
// Ahora: Guarda rawData con URLs públicas
```

### 4. **Agregar Optimización de Imágenes (Opcional)**
- Usar Sharp en el backend para redimensionar antes de subir
- O delegar a B2 (B2 tiene transformación de imágenes en beta)

### 5. **Agregar CDN (Fase 2)**
- Usar Cloudflare Workers para cache
- Edge caching de imágenes

---

## 🧪 Testing

### 1. Verificar que el Storage esté disponible

```bash
# En el API (logs)
curl -X GET http://localhost:4000/health
```

### 2. Probar upload de archivo

```bash
curl -X POST http://localhost:4000/api/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@photo.jpg" \
  -F "fileType=image"
```

Respuesta esperada:

```json
{
  "ok": true,
  "result": {
    "fileId": "b2_id_...",
    "url": "https://yourbucket.backblazeb2.com/file/...",
    "publicUrl": "https://yourbucket.backblazeb2.com/file/...",
    "fileName": "photo.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 245000,
    "uploadedAt": 1711814400000
  }
}
```

---

## 🚀 Ventajas de Esta Arquitectura

✅ **Flexible**: Cambiar proveedores sin tocar lógica de negocio
✅ **Escalable**: B2 es infinitamente escalable
✅ **Barato**: $0.15/mes para moderado uso
✅ **Controlado**: Tu bucket, tusdatos, sin dependencias de CDN externo
✅ **Futuro-proof**: Preparado para agregar real CDN, transformaciones, etc.

---

## 🎯 Flujo Completo (Después de Integración)

```
Usuario
  ↓ [Sube foto]
Frontend (simpleautos)
  ↓ [Llama uploadMediaFile]
API Backend (/api/media/upload)
  ↓ [Autoriza con B2]
Backblaze B2
  ↓ [Devuelve URL pública]
API Backend
  ↓ [URL pública]
Frontend
  ↓ [Muestra preview]
Publicación (POST /api/listings)
  ↓ [Guarda solo URLs en DB]
PostgreSQL
```

No más base64. URLs directas. Eficiente. Escalable.

---

## 📊 Costo Estimado (Moderado Volume)

- 100 listings × 8 fotos = 800 imágenes
- ~10GB almacenamiento
- ~200GB transferencia/mes (si se comparten mucho)

**Costo**: ~$2-3/mes ✨

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si elimino una publicación?**
R: Necesitas hacer DELETE en el endpoint `/api/media/delete` que implementaremos.

**P: ¿Puedo agregar más proveedores después?**
R: Sí. Solo crea una clase que implemente `StorageProvider` y agrega a la factory.

**P: ¿Y si B2 tiene downtime?**
R: Tus URLs almacenadas siguen siendo válidas cuando vuelva. Considerar failover a S3 si es crítico.
