# Cloudflare Worker: Instagram Image Overlay

Generador de imágenes de Instagram en el edge. Reemplaza Sharp + Fontconfig con resvg-wasm puro.

## ¿Qué hace?

Este Worker recibe:
- Una imagen base (almacenada en Cloudflare R2)
- Un template (professional-centered, signature-complete, etc.)
- Datos del listing (título, precio, ubicación, etc.)

Y devuelve:
- Una imagen PNG de 1080x1080 (o 1080x1350 para portrait) con overlay profesional

## Arquitectura

```
[API Backend] → [Cloudflare Worker] → [R2 Bucket]
                    ↓
              resvg-wasm render
                    ↓
            [PNG con overlay]
```

## Endpoints

### POST /overlay

Genera una imagen con overlay.

**Request:**
```json
{
  "imageKey": "listings/abc123/photo1.jpg",
  "variant": "professional-centered",
  "data": {
    "title": "Toyota Corolla 2023",
    "price": "UF 8.500",
    "location": "Maipú, RM",
    "highlights": ["Semi-nuevo", "45.000 km", "Nafta"],
    "badges": ["Conversable"],
    "brand": "simpleautos"
  },
  "width": 1080,
  "height": 1080
}
```

**Response:**
- Content-Type: `image/png`
- Cache-Control: `public, max-age=31536000`

## Templates soportados

| Template | Descripción | Caso de uso |
|----------|-------------|-------------|
| `essential-watermark` | Solo watermark de marca | Fotos artísticas |
| `professional-centered` | Info completa, card centrado | Listings estándar |
| `signature-complete` | Premium, dark theme | Autos/propiedades de lujo |
| `property-conversion` | Card con datos de propiedad | Inmuebles |

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Dev server local (usa Wrangler local mode)
npm run dev

# Test manual
curl -X POST http://localhost:8787/overlay \
  -H "Content-Type: application/json" \
  -d '{"imageKey":"test.jpg","variant":"professional-centered","data":{"title":"Test","price":"UF 100"}}'
```

## Deployment

```bash
# Autenticar (una sola vez)
npx wrangler login

# Deploy
npm run deploy
# o
./deploy.sh
```

## Configuración

Edita `wrangler.toml`:

```toml
name = "simple-instagram-overlay"
[[r2_buckets]]
binding = "R2"
bucket_name = "simple-media"  # Tu bucket R2
```

## Dependencias

- `@resvg/resvg-wasm`: Renderiza SVG a PNG sin fontconfig
- `wrangler`: CLI de Cloudflare

## Por qué resvg-wasm?

| Opción | Pros | Contras |
|--------|------|---------|
| Sharp (Node) | Feature-rich | Requiere fontconfig, heavy binary |
| SVG → Canvas API | Nativo | Browsers only, no fonts |
| resvg-wasm | No fontconfig, wasm, rápido | Solo SVG rendering |

resvg-wasm es perfecto porque:
1. No tiene dependencias de sistema (fontconfig)
2. Corre en WebAssembly (seguro, sandboxed)
3. Soporta fuentes del sistema
4. Más rápido que alternativas JS puras

## Troubleshooting

### Error: "Image not found"
Verifica que el binding de R2 en `wrangler.toml` apunta al bucket correcto.

### Texto no aparece en la imagen
resvg-wasm usa fuentes del sistema del Worker. Las fuentes disponibles son limitadas.
Solución: Usar fuentes web-safe (Arial, sans-serif) en los SVG.

### Error: "memory access out of bounds"
La imagen es muy grande. Redimensionar antes de enviar al Worker, o aumentar límites de memoria del Worker.

## Limitaciones

- Máximo 50MB de entrada (R2 limit)
- Tiempo de ejecución: 30s (plan Workers Paid), 10ms (free plan)
- resvg-wasm no soporta todos los features de SVG (ej: filtros complejos)

## Costos

- Cloudflare Workers: 100K requests/día gratis, luego $0.50/millón
- R2: Primeros 10GB gratis, luego $0.015/GB
- Sin costo de egress desde R2 a Workers

## Roadmap

- [ ] Soporte para Cloudflare Images (optimización WebP/AVIF)
- [ ] Cache persistente de renders
- [ ] Múltiples tamaños de output
- [ ] Animaciones (GIF/WebP)

## Licencia

Parte de Simple Platform.
