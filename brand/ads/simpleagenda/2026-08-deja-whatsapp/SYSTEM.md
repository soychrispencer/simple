# Sistema visual — SimpleAgenda ads (Spencer)

Fuente de verdad para `2026-08-deja-whatsapp`.
Alineado a **Spencer System** (`packages/ui/spencer-system-mock.html` + `theme-base.css`).
**No** usar el template viejo de SimplePropiedades (cards teal, dots, Segoe, glow).

## Núcleo Spencer

| Token | Hex | Uso en ads |
|-------|-----|------------|
| `ink` | `#111111` | Hero / story de impacto, tipografía, CTA en paper |
| `paper` | `#FAFAFA` | Fondos claros, CTA en hero ink |
| `surface` | `#FFFFFF` | Placas de producto |
| `mute` | `#737373` | Subtítulos |
| `line` | `#E5E5E5` | Separadores finos |
| `accent` | `#0F766E` | Solo logo tile, “Agenda” del wordmark, 1 señal |

## Tipografía

- **Inter** (400–800) — cuerpo y títulos
- **Instrument Serif** italic — **1 palabra clave** del headline (máx. 1–2 por pieza)
- Letter-spacing tight en títulos (`-0.04em`)
- Nada de Segoe como sistema de ads

## Sí / No

**Sí**
- Portada ink + contenido paper (ritmo marketing Spencer)
- Mucho aire, poca decoración
- Un CTA por pieza · radius **10px** (no pill)
- Primary button = ink (en paper) o paper (en ink)
- Accent teal como señal, no como look completo

**No**
- Radial gradients de marca / dots / glass / glow
- Grids de 3 cards con íconos en círculo de color
- Purple, crema viejo, plantilla “IA”
- Tres CTAs compitiendo

## Layout

- **Ink / hook / cierre / prueba (04):** composición centrada; 04 en **ink** con proof 2×2.
- **Paper / producto (02–03):** asimetría — copy izq, mock der.
- Beneficios: línea mute con `·` (no chips pill).
- Proof tipográfico: **grid 2×2** con título + subtítulo (no línea perdida).
- Mock UI: surface blanca, sin rotación, un solo acento teal.
- Tipográficas: logo 40px; título hero 72 (post) / 84 (story).
- CTA: `border-radius: 10px` explícito, min-width ~380, nunca pill.
- Preview: estudio oscuro + marco feed IG opcional (no se exporta).

Type scale: kicker 13 · título post 56 / hero 72 · story 68 / hero 84 · sub 22/26 · CTA h 58/62.

## Formatos

| Pieza | Tamaño |
|-------|--------|
| Story | 1080 × 1920 |
| Post / carrusel | 1080 × 1350 |
| Highlight | 1080 × 1080 |

## Highlights

Círculo ink · glifo blanco · label Inter debajo. Sin texto fino cerca del borde del crop circular.

## Naming

```
simpleagenda-{formato}-deja-whatsapp-0{n}.png
simpleagenda-highlight-{slug}.png
```
