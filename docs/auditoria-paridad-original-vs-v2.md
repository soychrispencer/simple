# Auditoría de Paridad Funcional (Original vs V2)

## Contexto auditado
- Repositorio original de referencia funcional: `C:\Users\chris\Desktop\Simple`
- Repositorio objetivo: `C:\Users\chris\Desktop\SimpleV2`
- Fecha de actualización: 2026-03-02

## Decisión oficial de arquitectura
- `SimpleV2` se mantiene como implementación nueva, limpia y desacoplada del código original.
- La comparación con `Simple` se usa solo para inventario de funcionalidades faltantes y validación de paridad.
- No se mantiene capa de compatibilidad legacy en navegación, panel ni API.
- Política activa: navegación V2 pura.

## Estado actual de navegación
- Sidebar persistente en panel para `simpleautos` y `simplepropiedades`.
- Sidebar con soporte expandir/contraer.
- Menús legacy eliminados del panel.
- Fallbacks legacy eliminados en ambos verticales:
  - rutas públicas catch-all legacy
  - rutas de panel catch-all legacy
  - endpoints API catch-all legacy
  - componentes de pantalla de compatibilidad legacy

## Objetivo de paridad (sin copiar código)
Implementar en `SimpleV2` toda funcionalidad relevante del original con código nuevo:
- Wizard completo de publicación (autos y propiedades).
- Dashboard por rol/plan con módulos reales.
- Perfil público profesional.
- Página completa de publicación.
- CRM modular, colaboración, mensajería, notificaciones.
- Integraciones (Instagram listo para activar, pagos, etc.).

## Método de trabajo acordado
1. Auditar funcionalidad en `Simple` por dominio (no por archivo).
2. Mapear brechas contra `SimpleV2`.
3. Reimplementar en V2 con diseño y arquitectura actuales.
4. Validar paridad funcional por flujo extremo a extremo.
5. Documentar cierre de cada brecha en V2.

## Criterio de “no perder avance”
- No se migra código legacy ni se reintroducen rutas heredadas.
- Sí se preserva el conocimiento funcional del original.
- Todo avance nuevo queda consolidado en `SimpleV2` como base única.

## Wizard Autos (estado 2026-03-04)
- Se reemplazó `apps/simpleautos/src/app/panel/publicar/page.tsx` por un wizard V2 multi-paso.
- Flujo activo: `tipo -> básico -> equipamiento -> multimedia -> ubicación/contacto -> comercial -> revisión`.
- Cobertura reimplementada (sin copiar código legacy):
  - Tipos de publicación: venta, arriendo, subasta.
  - Tipos de vehículo: auto/moto/camión/bus/maquinaria/náutico/aéreo.
  - Campos clave del original: marca, modelo, año, versión, kilometraje, condición, combustible, transmisión, tracción, colores, VIN, patente, título, descripción, tags.
  - Equipamiento + historial con selección múltiple.
  - Multimedia con mínimo 3 fotos, portada, video URL y assets social-ready (caption/hashtags).
  - Ubicación + contacto completo (región/comuna, dirección opcional, método preferido).
  - Comercial condicional por flujo:
    - venta: precio base/oferta/moneda
    - arriendo: precio día/semana/mes + depósito + requisitos
    - subasta: precio base/reserva/incremento + inicio/fin
  - Opciones de publicación: duración, auto-renovación, destacar, urgente, IG simulación, SEO básico.
  - Revisión final con score/checklist + aceptación de términos.
  - Guardado automático al avanzar de paso + guardado manual.

### Seeds antiguos (Supabase) — integración preparada
- Se agregó `apps/simpleautos/src/lib/publish-wizard-catalog.ts`.
- El wizard intenta cargar seeds desde:
  - `/public/seeds/simpleautos-catalog.json`
  - `/public/seeds/autos-catalog.json`
  - `/public/seeds/supabase-autos-catalog.json`
- Se agregó conversión directa desde SQL legacy:
  - `apps/simpleautos/seed.txt` -> `apps/simpleautos/public/seeds/simpleautos-catalog.json`
  - Comando: `npm run seed:catalog --workspace=@simple/autos`
- Si no existen, usa catálogo fallback local (para no bloquear el flujo).
- Formato esperado:
```json
{
  "brands": [{ "id": "toyota", "name": "Toyota", "vehicle_types": ["car"] }],
  "models": [{ "id": "corolla", "name": "Corolla", "brand_id": "toyota", "vehicle_types": ["car"] }],
  "regions": [{ "id": "cl-13", "name": "Región Metropolitana", "code": "13" }],
  "communes": [{ "id": "rm-providencia", "name": "Providencia", "region_id": "cl-13" }]
}
```
