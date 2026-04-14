# Configuración de Variables de Entorno en Coolify

Para cada servicio ir a **Settings → Environment Variables** y pegar el bloque correspondiente.
Los valores reales de cada secreto están en `services/api/.env` (local, gitignored).

> ⚠️ Las variables `NEXT_PUBLIC_*` se hornean en el build. Si las cambias debes hacer **Redeploy** (no solo Restart).
>
> ⚠️ Los frontends `simpleautos` y `simplepropiedades` ahora usan **Next standalone**. En Coolify deben construirse con su **Dockerfile específico** y exponer el **puerto interno 3000**.

---

## 1. API (`api.simpleplataforma.app`)

### Setup del servicio

- **Build Pack**: `Dockerfile`
- **Dockerfile Location**: `services/api/Dockerfile`
- **Port / Exposed Port**: `4000`
- **Healthcheck recomendado**: `/health`

Acceso coolify:
IP: 142.44.211.73
http://142.44.211.73:8000/login
User: soychrispencer@gmail.com
pass: Pik@0819

Token: 1|rKKXgE8R7ImQdFGfZzKUD9cUmis0buRtrNdy5ivRc231f547
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
MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES=https://simplepropiedades.app

MP_AGENDA_APP_ID=                    # ver .env local → MP_AGENDA_APP_ID
MP_AGENDA_APP_SECRET=                # ver .env local → MP_AGENDA_APP_SECRET
AGENDA_APP_URL=https://simpleagenda.app

WHATSAPP_ACCESS_TOKEN=               # VER FACEBOOK_DEVELOPERS_SETUP_2026.md PARA GENERARLO
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

### Setup del servicio

- **Build Pack**: `Dockerfile`
- **Dockerfile Location**: `apps/simpleautos/Dockerfile`
- **Port / Exposed Port**: `3000`
- **Healthcheck recomendado**: `/`
- **Importante**: si cambias `NEXT_PUBLIC_API_URL` o `NEXT_PUBLIC_APP_URL`, debes hacer `Redeploy`, no `Restart`

```env
NEXT_PUBLIC_API_URL=https://api.simpleplataforma.app
NEXT_PUBLIC_APP_URL=https://simpleautos.app
GOOGLE_AI_API_KEY=                   # ver .env local de simpleautos → GOOGLE_AI_API_KEY
```

---

## 3. SimplePropiedades (`simplepropiedades.cl`)

### Setup del servicio

- **Build Pack**: `Dockerfile`
- **Dockerfile Location**: `apps/simplepropiedades/Dockerfile`
- **Port / Exposed Port**: `3000`
- **Healthcheck recomendado**: `/`
- **Importante**: si cambias `NEXT_PUBLIC_API_URL` o `NEXT_PUBLIC_APP_URL`, debes hacer `Redeploy`, no `Restart`

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

## Troubleshooting comunes

### Cambios en código no se reflejan después de redeploy (Cache de Docker)

Si haces cambios en el código (como el tamaño del logo 80x80 o posición top-left en templates Premium) y no se ven reflejados en producción después de un redeploy normal, el problema es el **caché de capas de Docker**.

**Solución en Coolify:**

1. Ve a tu servicio (ej: `api`)
2. Settings → Build
3. Busca opción **"No Cache"** o **"Disable Build Cache"** y actívala
4. Guarda y haz **Redeploy**
5. Después del deploy exitoso, puedes desactivar "No Cache" para futuros builds más rápidos

**Alternativa - Forzar rebuild sin caché via CLI:**
```bash
# Conectarse al servidor de Coolify
ssh root@142.44.211.73

# Listar builds
docker builder ls

# Limpiar caché de build
docker builder prune -f

# O forzar rebuild sin caché del servicio específico
docker compose -f /data/coolify/services/<service-id>/docker-compose.yml build --no-cache
```

### Instagram: Logo pequeño o posición incorrecta en publicaciones

Si la vista previa del template se ve bien pero al publicar en Instagram el logo aparece:
- Más pequeño (ej: 48px en vez de 80px)
- En posición incorrecta (ej: centrado en vez de top-left para Premium)

**Causa raíz**: El servicio API en producción está usando código antiguo debido al caché de Docker.

**Pasos para verificar y solucionar:**

1. **Verificar que el commit está en main:**
   ```bash
   git log --oneline -3
   # Debería mostrar el commit con los cambios del logo
   ```

2. **Verificar que el build local tiene los cambios:**
   ```bash
   cd services/api
   npm run build
   grep "width: 80, height: 80" dist/index.js
   # Debe mostrar la línea con el logo 80x80
   ```

3. **Forzar redeploy SIN caché en Coolify** (ver sección anterior)

4. **Verificar en producción** haciendo una nueva publicación de prueba

---

## Checklist post-configuración

- [ ] API: redeploy después de agregar/cambiar variables
- [ ] Cada app frontend: redeploy completo (no restart) si cambias `NEXT_PUBLIC_*`
- [ ] Confirmar que cada servicio apunta a su Dockerfile correcto
- [ ] Confirmar que `simpleautos` y `simplepropiedades` usan puerto interno `3000`
- [ ] Confirmar que el API usa puerto interno `4000`
- [ ] Verificar `https://api.simpleplataforma.app/health` responde 200
- [ ] Verificar `https://simpleautos.app/` responde 200
- [ ] Verificar `https://simplepropiedades.cl/` responde 200
- [ ] Verificar login con Google en cada app
- [ ] Verificar subida de imágenes (Backblaze)
- [ ] Verificar flujo OAuth de Instagram en panel de un usuario Pro

---

## Notas sobre Caché de Docker en Producción

El Dockerfile de la API (`services/api/Dockerfile`) copia el código fuente y hace build en la imagen:

```dockerfile
COPY services ./services
COPY packages ./packages
COPY apps ./apps
RUN npm run build --workspace=@simple/api
```

**Problema**: Docker cachea estas capas. Si solo cambias código fuente sin modificar el Dockerfile, Docker puede reutilizar la capa cacheada con el código antiguo.

**Solución definitiva**: Cuando haces cambios de código que deben reflejarse inmediatamente (como ajustes visuales de Instagram), siempre fuerza el redeploy **sin caché** o usa:

```bash
# Invalidar caché completo del builder
docker system prune -a --volumes
```

⚠️ **Nota**: `docker system prune` borra TODAS las imágenes y contenedores no usados. Úsalo con precaución.
