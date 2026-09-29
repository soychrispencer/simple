# Sistema visual — SimplePropiedades ads

Fuente de verdad para todas las piezas de la campaña. **Solo cambia el contenido** por servicio; nunca tipografía, radios, sombras, colores ni jerarquía.

## Paleta fija

| Token | Hex | Uso |
|-------|-----|-----|
| `primary` | `#4F46E5` | Logo tile, acento de título, íconos, CTA, URL |
| `deep` | `#312E81` | Badge / etiqueta de servicio |
| `text` | `#0C0C0E` | Título principal, “Simple” del wordmark |
| `gray` | `#6B7280` | Subtítulo |
| `grayMuted` | `#9CA3AF` | Decoración (dots) |
| `bg` | `#F7F7F5` | Fondo a sangre |
| `surface` | `#FFFFFF` | Cards de beneficios |
| `border` | `#E8E8E6` | Borde sutil de cards |

## Tipografía

- Familia: **Segoe UI** (Bold / Semibold / Regular)
- Wordmark: `Simple` → `text` · `Propiedades` → `primary`
- Título: grande, centrado; línea de acento en `primary`
- Subtítulo: centrado, `gray`
- Cards / CTA / URL: mismos pesos en story y post

## Layout (orden fijo, de arriba a abajo)

1. **Logo** centrado — Door oficial + wordmark (mismo tamaño relativo)
2. **Badge** semirrectangular (`radius` 12) — etiqueta del servicio
3. **Título** centrado (1–2 líneas)
4. **Subtítulo** centrado
5. **3 cards** en fila — mismo tamaño, `radius` 16, misma sombra, ícono + texto
6. **Hero visual** — mitad inferior (mockup/producto del servicio)
7. **CTA** botón grande semirrectangular `radius` 12, centrado, `primary`
8. **URL** `simplepropiedades.app` centrada

## Formatos

| Pieza | Tamaño exacto |
|-------|----------------|
| Story / Reel | **1080 × 1920** |
| Post feed | **1080 × 1350** |

## Zonas seguras (Meta)

- Story: críticos fuera del **14% superior (269px)** y **20% inferior (384px)**; laterales ~6%
- Post: padding generoso (~56–72px); fondo a sangre
- Full-bleed: el fondo llena el canvas; **no** letterbox

## CTA

Semirrectangular: `border-radius: 12px`. Color `primary`. **No** pill.

## Export

```bash
# Illustrator (recomendado — editable, sin límites Figma)
cd illustrator && node run-illustrator.mjs

# HTML → Playwright (fallback raster)
node export-html.mjs publica-gratis

# Legacy (SVG/sharp layers)
node compose.mjs publica-gratis
```

Master editable: `illustrator/SimplePropiedades-Publica-gratis.ai`  
PNG: `illustrator/export/` (también `out/` vía HTML).

- `simplepropiedades-story-{tema}-01.png` (**1080×1920**)
- `simplepropiedades-post-{tema}-01.png` (**1080×1350**)
