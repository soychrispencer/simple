# Configuración de Variables de Entorno en Coolify

Para cada servicio ir a **Settings → Environment Variables** y pegar el bloque correspondiente.
Los valores reales de cada secreto están en `services/api/.env` (local, gitignored).

> ⚠️ Las variables `NEXT_PUBLIC_*` se hornean en el build. Si las cambias debes hacer **Redeploy** (no solo Restart).

---

## 1. API (`api.simpleplataforma.app`)

```env
PORT=4000
API_HOST=0.0.0.0
API_BASE_URL=https://api.simpleplataforma.app

DATABASE_URL=                        # ver .env local → DATABASE_URL

CORS_ORIGINS=https://simpleautos.app,https://www.simpleautos.app,https://simplepropiedades.cl,https://www.simplepropiedades.cl,https://simpleplataforma.app,https://www.simpleplataforma.app,https://simpleagenda.app,https://www.simpleagenda.app,https://admin.simpleplataforma.app

SESSION_SECRET=                      # ver .env local → SESSION_SECRET
AUTH_COOKIE_SAMESITE=none

GOOGLE_CLIENT_ID=                    # ver .env local → GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=                # ver .env local → GOOGLE_CLIENT_SECRET

STORAGE_PROVIDER=backblaze-s3
BACKBLAZE_S3_ENDPOINT=https://s3.us-east-005.backblazeb2.com
BACKBLAZE_S3_REGION=us-east-5
BACKBLAZE_S3_ACCESS_KEY=             # ver .env local → BACKBLAZE_S3_ACCESS_KEY
BACKBLAZE_S3_SECRET_KEY=             # ver .env local → BACKBLAZE_S3_SECRET_KEY
BACKBLAZE_BUCKET_NAME=simple-media
BACKBLAZE_DOWNLOAD_URL=              # ver .env local → BACKBLAZE_DOWNLOAD_URL

GOOGLE_MAPS_API_KEY=                 # ver .env local → GOOGLE_MAPS_API_KEY

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=                           # ver .env local → SMTP_USER
SMTP_PASSWORD=                       # ver .env local → SMTP_PASSWORD
SMTP_FROM=Simple <noreply@simpleplataforma.app>

MERCADO_PAGO_ACCESS_TOKEN=           # ver .env local → MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS=https://simpleautos.app
MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES=https://simplepropiedades.cl

MP_AGENDA_APP_ID=                    # ver .env local → MP_AGENDA_APP_ID
MP_AGENDA_APP_SECRET=                # ver .env local → MP_AGENDA_APP_SECRET
AGENDA_APP_URL=https://simpleagenda.app

WHATSAPP_ACCESS_TOKEN=               # ver .env local → WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID=982048811666705
WHATSAPP_PHONE_NUMBER_ID_AUTOS=982048811666705
WHATSAPP_PHONE_NUMBER_ID_PROPIEDADES=982048811666705
WHATSAPP_PHONE_NUMBER_ID_AGENDA=982048811666705

INSTAGRAM_APP_ID=1220805133562499
INSTAGRAM_APP_SECRET=                # ver .env local → INSTAGRAM_APP_SECRET
INSTAGRAM_REDIRECT_URI=https://api.simpleplataforma.app/api/integrations/instagram/callback

ENABLE_ADMIN_BOOTSTRAP=false
```

---

## 2. SimpleAutos (`simpleautos.app`)

```env
NEXT_PUBLIC_API_URL=https://api.simpleplataforma.app
NEXT_PUBLIC_APP_URL=https://simpleautos.app
GOOGLE_AI_API_KEY=                   # ver .env local de simpleautos → GOOGLE_AI_API_KEY
```

---

## 3. SimplePropiedades (`simplepropiedades.cl`)

```env
NEXT_PUBLIC_API_URL=https://api.simpleplataforma.app
NEXT_PUBLIC_APP_URL=https://simplepropiedades.cl
```

---

## 4. SimpleAdmin (`admin.simpleplataforma.app`)

```env
NEXT_PUBLIC_API_URL=https://api.simpleplataforma.app
NEXT_PUBLIC_APP_URL=https://admin.simpleplataforma.app
```

---

## 5. SimpleAgenda (`simpleagenda.app`)

```env
NEXT_PUBLIC_API_URL=https://api.simpleplataforma.app
NEXT_PUBLIC_APP_URL=https://simpleagenda.app
```

---

## 6. SimplePlataforma (`simpleplataforma.app`)

```env
NEXT_PUBLIC_API_URL=https://api.simpleplataforma.app
NEXT_PUBLIC_APP_URL=https://simpleplataforma.app
```

---

## Diferencias clave local vs producción

| Variable | Local | Producción |
|---|---|---|
| `API_BASE_URL` | `http://localhost:4000` | `https://api.simpleplataforma.app` |
| `AUTH_COOKIE_SAMESITE` | `lax` | `none` |
| `MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS` | `http://localhost:3000` | `https://simpleautos.app` |
| `MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES` | `http://localhost:3001` | `https://simplepropiedades.cl` |
| `AGENDA_APP_URL` | `http://localhost:3004` | `https://simpleagenda.app` |
| `ENABLE_ADMIN_BOOTSTRAP` | `true` | `false` |

---

## Checklist post-configuración

- [ ] API: redeploy después de agregar/cambiar variables
- [ ] Cada app frontend: redeploy completo (no restart) si cambias `NEXT_PUBLIC_*`
- [ ] Verificar `https://api.simpleplataforma.app/health` responde 200
- [ ] Verificar login con Google en cada app
- [ ] Verificar subida de imágenes (Backblaze)
- [ ] Verificar flujo OAuth de Instagram en panel de un usuario Pro
