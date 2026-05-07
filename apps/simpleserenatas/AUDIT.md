# Auditoría de rutas — SimpleSerenatas

Generado como parte de **Fase 0** del plan maestro (Mayo 2026).  
Actualizar cuando cambien rutas o contratos API.

## Convenciones

| Estado | Significado |
|--------|-------------|
| **OK** | Llama API real en flujo feliz; usable en dev con migraciones aplicadas. |
| **Parcial** | UI lista o parcial; falta flujo completo, datos mock o tabla ausente en algunos entornos. |
| **Shell** | Pantalla accesible pero depende de integración pendiente o rol no priorizado en MVP. |

## Páginas `src/app/` (App Router)

| Ruta (archivo) | Estado | Notas |
|------------------|--------|--------|
| `page.tsx` (landing) | Parcial | Marketing / entrada pública. |
| `(app)/page.tsx` | Parcial | Redirect o hub según auth. |
| `(app)/inicio/page.tsx` | OK | Dashboard; consume API serenatas según rol. |
| `(app)/agenda/page.tsx` | Parcial | Depende de datos `serenata_requests` / asignaciones. |
| `(app)/solicitudes/page.tsx` | OK | Bandeja coordinador; API `/api/serenatas`… |
| `(app)/solicitar/page.tsx` | Parcial | Wizard cliente. |
| `(app)/mis-serenatas/page.tsx` | Parcial | Lista cliente. |
| `(app)/tracking/[id]/page.tsx` | OK | Tracking unificado (coordinador/cliente/músico según reglas). |
| `(app)/coordinator/tracking/[id]/page.tsx` | OK | Redirige a `/tracking/:id`. |
| `(app)/cuadrilla/page.tsx` | OK | Cuadrilla + API crew. |
| `(app)/grupos/page.tsx` | Parcial | Grupos / membresías. |
| `(app)/mapa/page.tsx` | Parcial | Leaflet; datos según grupos/serenatas. |
| `(app)/finanzas/page.tsx` | Shell | Coordinador; depende de pagos registrados. |
| `(app)/suscripcion/page.tsx` | Shell | MP / planes; muchos entornos sin credenciales. |
| `(app)/chat/page.tsx` | Shell | MVP nav puede ocultar; sin chat tiempo real completo. |
| `(app)/notificaciones/page.tsx` | OK | Lista + API `/api/serenatas/notifications`. |
| `(app)/invitaciones/page.tsx` | OK | Invitaciones músico. |
| `(app)/perfil/page.tsx` | OK | Cuenta + enlaces configuración. |
| `(app)/perfil/configuracion/*` | Parcial | Subpáginas perfil/disponibilidad. |
| `(app)/review/[id]/page.tsx` | Shell | Reseñas. |
| `auth/*` | OK | Login, registro, recuperar, verificar, etc. |
| `onboarding/coordinator/page.tsx` | Parcial | Onboarding coordinador. |
| `musician/[id]/page.tsx`, `musician/edit/page.tsx` | Parcial | Perfil público / edición. |
| `serenata/[id]/page.tsx`, `grupo/[id]/page.tsx`, `ruta/[id]/page.tsx` | Parcial | Vistas públicas o legacy según modelo de datos. |

## Duplicados eliminados (Fase 0.3)

- ~~`solicitudes/page-new.tsx`~~ — vacío, eliminado.
- ~~`inicio/page-simplified.tsx`~~ — duplicado experimental, eliminado.

## Branch de archivo (Fase 0.1)

Ejecutar en tu máquina cuando quieras congelar el estado en remoto:

```bash
git branch archive/v0-exploracion
git push -u origin archive/v0-exploracion
```

(No crea el branch automáticamente en CI; es una acción manual del equipo.)

## Variables de entorno

Plantilla: [.env.local.example](./.env.local.example). Copiar a `.env.local` y ajustar `NEXT_PUBLIC_API_URL` al API local (p. ej. `http://localhost:4000`).

## Referencias

- Esquema BD resumido: [docs/schema.md](../../docs/schema.md)
- Plan de desarrollo por fases: [docs/SIMPLESERENATAS_DEVELOPMENT_PLAN.md](../../docs/SIMPLESERENATAS_DEVELOPMENT_PLAN.md)
