# Storage Setup

## Overview

Simple usa dos proveedores de almacenamiento: **`local`** (desarrollo) y **`cloudflare-r2`** (producción). **Fuente de verdad:** este documento y `services/api/.env.example`.

- **Desarrollo:** `STORAGE_PROVIDER=local` — archivos en `services/api/uploads/`, URLs `http://localhost:4000/uploads/*`.
- **Producción:** `STORAGE_PROVIDER=cloudflare-r2` — bucket R2 con URL pública (`*.r2.dev` o dominio custom).

Todas las subidas de imágenes pasan por `POST /api/media/upload` (Sharp → WebP). Los objetos huérfanos se eliminan al reemplazar URLs en avatares, portadas y publicaciones.

> **Nota:** Backblaze B2 fue retirado del código activo. La migración histórica B2 → R2 está en `docs/archive/MIGRATION_BACKBLAZE_TO_CLOUDFLARE.md` y `scripts/migrate-to-cloudflare.ts`.

## Cost Estimation (R2)

Para 100–500 publicaciones con 5–10 fotos cada una (~10 GB/mes):

- **Storage**: ~$0.015/GB/mes
- **Class A ops** (writes): mínimas con el patrón de upload actual
- **Egress**: gratis vía dominio público R2 / Workers

## Setup — desarrollo local

```bash
# services/api/.env.local
STORAGE_PROVIDER=local
LOCAL_STORAGE_URL=http://localhost:4000/uploads
```

El backend guarda en `./uploads/{userId}/...` y expone `/uploads/*`.

## Setup — Cloudflare R2 (producción)

1. Dashboard Cloudflare → **R2** → crear bucket (p. ej. `simple-media`).
2. **Manage R2 API Tokens** → permiso Object Read & Write.
3. Habilitar acceso público (`*.r2.dev`) o custom domain → copiar URL base.

```bash
STORAGE_PROVIDER=cloudflare-r2
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=simple-media
CLOUDFLARE_R2_PUBLIC_URL=https://pub-XXXXXXXX.r2.dev
# Opcional: worker de overlays Instagram
# CLOUDFLARE_WORKER_URL=https://simple-instagram-overlay.<subdomain>.workers.dev
```

## How It Works

1. **Frontend** envía archivo a `POST /api/media/upload` (cookie de sesión).
2. **API** optimiza imágenes a WebP (Sharp) y sube vía `StorageProvider`.
3. **URL pública** se guarda en BD (listings, avatares, portadas, etc.).
4. Al **reemplazar o quitar** una URL propia (R2/local), `deleteStoredMediaByUrl` borra el objeto anterior.

## Cliente (apps)

Usar `uploadMediaFile` de `@simple/utils` o el mismo endpoint con `credentials: 'include'`.

## Testing

```bash
curl -X POST http://localhost:4000/api/media/upload \
  -H "Cookie: simple_session=..." \
  -F "file=@photo.jpg" \
  -F "fileType=image"
```

## Troubleshooting

- **"Unknown storage provider"**: solo `local` o `cloudflare-r2` (alias `r2`).
- **R2 sin credenciales en dev**: el factory vuelve a `local` automáticamente.
- **Imágenes no se ven**: revisar `CLOUDFLARE_R2_PUBLIC_URL` o `LOCAL_STORAGE_URL`.
