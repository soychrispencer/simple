# Ads compartidos — formatos, zonas seguras y checklist

Refs visuales: `brand/ads/_shared/refs-zonas-seguras/` (guía Instagram 2026).

## Formatos

| Uso | Ratio | Tamaño **exacto** |
|-----|-------|-------------------|
| **Post / feed** | **4:5** | **1080 × 1350** (ni más ni menos) |
| **Stories / story ads** | **9:16** | **1080 × 1920** (ni más ni menos) |
| Post carrusel alt. | 3:4 | 1080 × 1440 (solo si el brief lo pide) |
| Post cuadrado | 1:1 | 1080 × 1080 |
| Post horizontal | 1.91:1 | 1080 × 566 |
| Reels / reels ads | 9:16 | 1080 × 1920 |
| **Historia destacada (cover)** | **1:1** | **1080 × 1080** |
| Avatar perfil | 1:1 | 2048 × 2048 (`brand/instagram-profiles/`) |

En carruseles, **todas** las láminas comparten la misma orientación/ratio.

Exportar siempre al tamaño exacto (verificar metadata).

## CTA / botones

- Forma **semirrectangular**: radio **`--radius-button` = 12px**.
- **No** pills (`rounded-full`).
- Color: accent de la vertical.

## Zonas seguras (obligatorio)

Fuente: [Meta Help — text overlays & safe zone](https://www.facebook.com/business/help/980593475366490) + refs en `refs-zonas-seguras/`.

**Full-bleed:** fondo, foto y decoración ocupan **todo** el canvas. Nunca letterbox / franjas vacías “para cumplir zona segura”.

**En zona segura (crítico):** logo, headline, beneficios, CTA de diseño, URL.
**Puede invadir bordes inseguros:** atmósfera, tips de foto/mockup, decoración.

### Stories — 1080 × 1920

| Zona | % | ≈ px | Notas |
|------|---|------|-------|
| Arriba | **14%** | **269** | Perfil / progreso IG — sin logo ni headline |
| Abajo | **20%** | **384** | CTA nativo Meta — el CTA de diseño va **arriba** de esta franja |
| Laterales | **~6%** | **~65** c/u | Márgenes |

Banda útil vertical ≈ **269 → 1536**.

### Feed post — 1080 × 1350 (4:5)

Meta: en ratios no-9:16, mantener **abajo y laterales** libres de elementos clave. Usar padding generoso (~56–72px); fondo a sangre.

### CTA

Semirrectangular: **`border-radius: 12px`** (`--radius-button`). Color accent de marca. No pill.

### Reels / reels ads — 1080 × 1920

| Zona | Regla |
|------|--------|
| **Inferior (insegura)** | Margen conservador **≈ 35%** (**≈ 672 px**) desde abajo |
| Motivo | Acciones, caption, audio y CTA compiten abajo |

Mensaje clave en el **65% superior**. La zona de Reels es la más restrictiva: si una pieza sirve para Story y Reel, priorizar margen Reels.

### Posts / carrusel

- Tamaño por defecto: **1080 × 1350 (4:5)**.
- Márgenes laterales y verticales cómodos; no pegar texto al borde.

### Historias destacadas (highlight covers)

- Canvas 1:1; el perfil muestra **círculo**.
- Ícono/wordmark corto **centrado**; ocupar ~45–55% del diámetro útil.
- Sin texto fino cerca del borde (se come el recorte circular).
- Una highlight **por servicio/función** de la campaña (mismo sistema visual).

## Pack mínimo por servicio/función

Al crear publicidad de un tema (ej. “Publica gratis”):

1. **Story** **1080×1920** (zonas Stories)
2. **Post** **1080×1350** (mismo diseño / mismo mensaje)
3. **Cover destacada** 1:1 (ícono + label corto del servicio)

## Checklist por pieza

- [ ] Vertical y accent correctos (`brand/README.md`)
- [ ] Ícono oficial si aparece logo
- [ ] Una idea + un CTA claros
- [ ] **Zonas seguras respetadas** (tabla arriba)
- [ ] Story + Post + Cover destacada del mismo tema
- [ ] Si muestra producto/UI: capturas reales (no mockups inventados)
- [ ] Archivo en `brand/ads/{vertical}/{YYYY-MM-tema}/out/`

## Naming

```
{vertical}-{formato}-{tema}-0{n}.png
```

Formatos: `story` | `post` | `highlight` | `reel` | `carousel-0N`

Ejemplo: `simplepropiedades-story-publica-gratis-01.png`

## Brief mínimo (pegar en cada carpeta de campaña)

```md
# Brief
- Vertical:
- Objetivo:
- Audiencia:
- Formatos: story 9:16 + post 3:4 + highlight 1:1
- Mensaje:
- CTA:
- Referencias:
```
