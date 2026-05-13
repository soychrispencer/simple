# Migración a Cloudflare: Instagram + Storage

## Resumen

Esta migración reemplaza:
- **Backblaze B2** → **Cloudflare R2** (storage más barato, mejor integración)
- **Sharp + Fontconfig** → **Cloudflare Worker + resvg-wasm** (generación de imágenes sin dependencias de sistema)
- **Procesamiento síncrono** → **Edge functions** (más rápido, escala automáticamente)

## Beneficios

| Aspecto | Antes (Backblaze+Sharp) | Después (Cloudflare) |
|---------|------------------------|---------------------|
| **Costo storage** | $0.005/GB + egress | $0.015/GB (primer 10GB gratis) |
| **Costo procesamiento** | CPU del servidor + Docker complexity | $0.50/millón requests |
| **Fontconfig** | Errores constantes | Eliminado completamente |
| **Tiempo de generación** | 2-5 segundos | <200ms desde edge |
| **Escalabilidad** | Vertical (servidor) | Horizontal (edge) |
| **Mantenimiento** | High (fonts, sharp, docker) | Low (serverless) |

## Paso 1: Configurar Cloudflare R2

### 1.1 Crear bucket R2
```bash
# En el dashboard de Cloudflare:
# 1. Ve a R2 → Create bucket
# 2. Nombre: simple-media
# 3. Location: Automatic
# 4. Access: Public (para imágenes de Instagram)
```

### 1.2 Crear API Token
1. Ve a **R2 → Manage R2 API Tokens**
2. **Create API Token**
3. Permissions:
   - Object Read & Write: ✅
   - Bucket Read & Write: ✅
4. Copy:
   - Token ID → `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - Secret → `CLOUDFLARE_R2_SECRET_ACCESS_KEY`

### 1.3 Obtener Account ID
- En el sidebar derecho del dashboard → **Account ID**
- Copia a `CLOUDFLARE_R2_ACCOUNT_ID`

### 1.4 Configurar Public URL
- En el bucket → **Settings** → **Public URLs**
- Enable R2.dev subdomain (o conecta tu dominio)
- Copia la URL a `CLOUDFLARE_R2_PUBLIC_URL`

## Paso 2: Desplegar el Worker de Instagram

### 2.1 Instalar Wrangler
```bash
cd infrastructure/cloudflare/workers/instagram-overlay
npm install
```

### 2.2 Autenticar Wrangler
```bash
npx wrangler login
```

### 2.3 Configurar secrets
```bash
# El bucket R2 se configura en wrangler.toml, pero necesitamos crearlo primero
```

### 2.4 Desplegar Worker
```bash
npm run deploy
```

Copia la URL del worker (ej: `https://simple-instagram-overlay.tu-usuario.workers.dev`) a `CLOUDFLARE_WORKER_URL`.

## Paso 3: Configurar API Backend

### 3.1 Actualizar variables de entorno
```bash
# En services/api/.env
STORAGE_PROVIDER=cloudflare-r2
CLOUDFLARE_R2_ACCOUNT_ID=xxx
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET_NAME=simple-media
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev
CLOUDFLARE_WORKER_URL=https://simple-instagram-overlay.tu-usuario.workers.dev
```

### 3.2 Rebuild y deploy
```bash
# Reconstruir con los nuevos providers
cd services/api
docker build -t simple-api .
docker run -e STORAGE_PROVIDER=cloudflare-r2 ...
```

## Paso 4: Migrar datos existentes (Opcional)

### 4.1 Script de migración B2 → R2
```typescript
// scripts/migrate-b2-to-r2.ts
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

// Client B2
const b2Client = new S3Client({
  endpoint: process.env.BACKBLAZE_S3_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.BACKBLAZE_S3_ACCESS_KEY!,
    secretAccessKey: process.env.BACKBLAZE_S3_SECRET_KEY!,
  },
});

// Client R2
const r2Client = new S3Client({
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

async function migrate() {
  // Listar objetos en B2
  const listCommand = new ListObjectsV2Command({
    Bucket: process.env.BACKBLAZE_BUCKET_NAME,
  });
  
  const objects = await b2Client.send(listCommand);
  
  for (const obj of objects.Contents || []) {
    // Descargar de B2
    const getCommand = new GetObjectCommand({
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Key: obj.Key,
    });
    const response = await b2Client.send(getCommand);
    const buffer = await response.Body?.transformToByteArray();
    
    // Subir a R2
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: obj.Key,
      Body: buffer,
      ContentType: response.ContentType,
    }));
    
    console.log(`Migrado: ${obj.Key}`);
  }
}
```

## Paso 5: Testing

### 5.1 Test manual del Worker
```bash
# Probar generación de overlay
curl -X POST https://tu-worker.workers.dev/overlay \
  -H "Content-Type: application/json" \
  -d '{
    "imageKey": "listings/test/photo1.jpg",
    "variant": "professional-centered",
    "data": {
      "title": "Toyota Corolla 2023",
      "price": "UF 8.500",
      "location": "Maipú, RM",
      "highlights": ["Semi-nuevo", "45.000 km", "Nafta"],
      "badges": ["Conversable"],
      "brand": "simpleautos"
    }
  }'
```

### 5.2 Test de publicación Instagram
```bash
# En tu frontend, intentar publicar un aviso a Instagram
# Debería usar automáticamente el Cloudflare Worker si está configurado
```

## Rollback (si es necesario)

Si algo falla, volver a Backblaze es simple:

```bash
# Cambiar variable de entorno
STORAGE_PROVIDER=backblaze-s3

# Restart del container
docker restart simple-api
```

## Troubleshooting

### Error: "Image not found"
- Verifica que la imagen original existe en R2
- Verifica que el Worker tiene binding correcto al bucket R2

### Error: "Fontconfig error"
- El Worker usa resvg-wasm, no fontconfig
- Si ves este error, estás usando el método antiguo (Sharp)
- Verifica que `CLOUDFLARE_WORKER_URL` está configurado

### Imagen generada sin texto
- El Worker usa fuentes del sistema (Arial)
- Verificar que el SVG generado tiene textos correctos
- Probar directamente el Worker con curl

### Costos inesperados
- R2: primeros 10GB gratis, luego $0.015/GB
- Worker: 100K requests/día gratis en plan gratuito
- Images: $5/mes por 1M de transforms

## Métricas de éxito

Después de la migración, deberías ver:
- ✅ Tiempo de generación de imágenes < 500ms
- ✅ Cero errores de fontconfig
- ✅ Costo mensual de storage+procesamiento < $10
- ✅ Publicaciones Instagram funcionando sin intervención manual

## Mejoras futuras (Fase 2)

1. **Cloudflare Images**: Agregar para optimización automática WebP/AVIF
2. **Cache inteligente**: Cachear imágenes generadas por 24h
3. **A/B testing visual**: Variantes de templates vía parámetros del Worker
4. **Analytics**: Tracking de engagement en el Worker

## Soporte

Si tienes problemas:
1. Revisar logs del Worker: `wrangler tail`
2. Verificar configuración en Cloudflare Dashboard
3. Testear el Worker individualmente antes de integrar
