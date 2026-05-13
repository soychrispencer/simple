# Migración: Backblaze B2 → Cloudflare R2

## Resumen

Migrar todas las imágenes de Backblaze B2 a Cloudflare R2 para unificar el stack en Cloudflare y eliminar dependencias externas.

## Estado Actual

| Componente | Backblaze B2 | Cloudflare R2 |
|------------|--------------|---------------|
| Nuevas imágenes | ❌ | ✅ (si STORAGE_PROVIDER=cloudflare-r2) |
| Imágenes antiguas | ✅ | ❌ |
| Media proxy | ✅ | ✅ (soporta ambos) |
| Instagram (Sharp) | ✅ | ✅ (funciona con ambos) |
| Instagram (Worker) | ❌ | ✅ (solo R2) |

## Plan de Migración

### Fase 1: Preparación (HOY)

1. **Revisar configuración actual**
   ```bash
   # En Coolify, verificar:
   STORAGE_PROVIDER=cloudflare-r2
   CLOUDFLARE_R2_ACCOUNT_ID=fc2cd784b74cebcc743914a0b35ec296
   CLOUDFLARE_R2_BUCKET_NAME=simple-media
   CLOUDFLARE_R2_PUBLIC_URL=https://pub-4809688bad1a41768578b221b0df942c.r2.dev
   ```

2. **Verificar que R2 está funcionando**
   - Subir una imagen de prueba
   - Confirmar que se ve en la URL pública de R2

3. **Mantener Backblaze para lectura**
   - Las variables de Backblaze deben seguir configuradas
   - El proxy de media soporta ambos providers

### Fase 2: Migración de Datos

#### Opción A: Migración Gradual (Recomendada)

Las nuevas imágenes van a R2 automáticamente. Las antiguas se quedan en Backblaze hasta que:
- Se reemplacen naturalmente (nuevas fotos de listings)
- O se ejecute el script de migración masiva

**Pros:**
- Sin downtime
- Sin costo de transferencia masiva
- Las imágenes antiguas siguen funcionando

**Contras:**
- Doble sistema por tiempo indefinido
- No se puede desactivar Backblaze completamente

#### Opción B: Migración Masiva (100 imágenes)

Ejecutar el script de migración:

```bash
# 1. Simular (dry-run)
cd services/api
npx tsx ../../scripts/migrate-to-cloudflare.ts --dry-run

# 2. Migrar realmente
npx tsx ../../scripts/migrate-to-cloudflare.ts --batch-size=5

# 3. Migrar por vertical
npx tsx ../../scripts/migrate-to-cloudflare.ts --vertical=autos
npx tsx ../../scripts/migrate-to-cloudflare.ts --vertical=propiedades
npx tsx ../../scripts/migrate-to-cloudflare.ts --vertical=agenda
npx tsx ../../scripts/migrate-to-cloudflare.ts --vertical=admin
```

**Pros:**
- Migración completa en un día
- Se puede desactivar Backblaze después
- Instagram Worker funciona 100%

**Contras:**
- Posible downtime breve durante la migración
- Costo de transferencia (aunque Backblaze tiene egress gratuito)

### Fase 3: Actualizar Worker de Instagram

El Worker actualmente solo genera el overlay (texto/logo). Para que funcione correctamente, necesitamos implementar la **composición real** de:
1. Imagen base (descargada desde R2)
2. Overlay SVG (renderizado con resvg)

**Opciones para composición:**

| Opción | Complejidad | Calidad | Performance |
|--------|-------------|---------|-------------|
| A. resvg-wasm + Canvas API | Media | Buena | Rápido |
| B. Satori + resvg-wasm | Alta | Excelente | Medio |
| C. Cloudflare Images | Baja | Buena | Muy rápido |
| D. Volver a Sharp | Baja | Excelente | Lento |

**Recomendación:** Opción C (Cloudflare Images) o D (Sharp temporal)

### Fase 4: Limpieza

Después de confirmar que todo funciona:

1. **Desactivar Backblaze**
   - Comentar variables de Backblaze en Coolify
   - Mantener por 30 días como backup

2. **Remover código de soporte dual**
   - Simplificar `getS3ClientForUrl`
   - Remover lógica de detección de Backblaze URLs

3. **Actualizar documentación**

## Checklist para Migración Completa

- [ ] Confirmar que R2 tiene todas las credenciales correctas en Coolify
- [ ] Subir imagen de prueba a R2 y verificar URL pública
- [ ] Ejecutar migración masiva (o confirmar que gradual es aceptable)
- [ ] Verificar que el proxy de media sirve imágenes de R2 correctamente
- [ ] Actualizar Worker de Instagram con composición real
- [ ] Probar publicación en Instagram
- [ ] Comentar variables de Backblaze en Coolify
- [ ] Esperar 30 días
- [ ] Eliminar completamente soporte de Backblaze del código

## Costos Estimados

| Servicio | Costo Actual | Costo Post-Migración |
|----------|--------------|---------------------|
| Backblaze B2 | ~$5-10/mes | $0 |
| Cloudflare R2 | $0 (dentro de límites gratis) | ~$5-10/mes |
| Cloudflare Workers | $0 (100k req/día gratis) | $0-5/mes |
| **Total** | **$5-10/mes** | **$5-15/mes** |

## Comandos Útiles

```bash
# Verificar conexión a R2
curl -I https://pub-4809688bad1a41768578b221b0df942c.r2.dev/test.jpg

# Verificar conexión a Backblaze
curl -I https://f005.backblazeb2.com/file/simple-media/test.jpg

# Testear Worker
open "https://simple-instagram-overlay.soychrispencer.workers.dev/overlay?image=..."

# Ver logs del Worker
wrangler tail
```

## Soporte

Si algo falla durante la migración:

1. **Imágenes no se ven**: Verificar que `BACKBLAZE_*` variables estén en Coolify
2. **Instagram falla**: Volver a usar Sharp (ya implementado)
3. **Worker error 500**: Verificar que WASM esté inicializado
4. **R2 no conecta**: Verificar credenciales en Cloudflare dashboard

## Contacto

Para problemas con:
- **Cloudflare R2**: Dashboard → R2 → Manage
- **Cloudflare Workers**: Dashboard → Workers & Pages
- **Backblaze**: Panel de control de Backblaze B2
