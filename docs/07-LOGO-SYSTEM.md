# Sistema de Identidad Visual

> Guía abreviada para mantener la estética profesional del ecosistema Simple en todas las superficies digitales.

## Paleta Neutra Base

| Token | Hex | Uso |
| --- | --- | --- |
| `lightbg` | `#F8F8F8` | Fondos globales, secciones amplias. |
| `lightcard` | `#FFFFFF` | Tarjetas, overlays, contenedores elevados. |
| `lighttext` | `#0C0C0C` | Tipografía principal en light mode. |
| `lightmuted` | `#5B5B5B` | Copys secundarios, labels, helpers. |
| `lightborder` | `#D8D6D2` | Divisores, contornos de tarjetas. |
| `darkbg` | `#0F0F10` | Fondos globales en dark mode. |
| `darkcard` | `#161616` | Tarjetas y paneles elevados en dark. |
| `darktext` | `#F4F4F5` | Tipografía principal en dark mode. |
| `darkmuted` | `#9E9EA4` | Copys secundarios en dark. |
| `darkborder` | `#2A2A2F` | Divisores en dark mode. |
| `accent` | `#0F9D92` | Estados del sistema, badges neutrales, focus ring. |

## Colores por Vertical (solo acentos)

| Vertical | Token | Hex | Uso permitido |
| --- | --- | --- | --- |
| SimpleAutos | `primary` | `#ffd400` | CTA principal, price tags, gráficos. |
| SimplePropiedades | `primary` | `#009BA3` | CTA, filtros activos, elementos interactivos. |
| SimpleTiendas | `primary` | `#7A5CFF` | CTA, indicadores de inventario. |
| SimpleFood | `primary` | `#FFB800` | CTA, etiquetas de delivery, KPI principales. |

> Los colores primarios **no** se usan para fondos completos ni grandes bloques de texto. Se reservan para acciones clave, destacados puntuales y métricas críticas.

## Tipografía

- **Stack base**: `Poppins` (weights 400/500/600) con fallback genérico `system-ui, sans-serif`.
- **Tracking**: usar -0.01em para títulos, automático para cuerpo.
- **Line-height**: 1.3–1.45 en cuerpo, 1.15 en headlines.
- **Subtítulos**: color `lightmuted`/`darkmuted` para reforzar jerarquía sin depender de color de marca.

## Componentes y Superficies

- **Cards / Panels**: borde `1px solid lightborder`, `shadow-card` sutil (0 24px 60px -32px rgba(12,12,12,0.35)).
- **Botones**: `primary` y `neutral` usan rellenos sólidos; `outline` y `ghost` quedan para acciones secundarias.
- **Badges / Chips**: usar fondos neutros (`rgba(12,12,12,0.05)`) con borde suave; la versión de color se limita a estados (éxito/error).
- **Backdrop Blur**: para headers sticky/modales utilizar `bg-lightcard/80` con `backdrop-blur-md` y bordes sutiles.

## Motion & Foco

- Transiciones: 200 ms `cubic-bezier(0.33, 1, 0.68, 1)`.
- Enfoque accesible: `focus-visible:ring-[rgba(15,157,146,0.45)]` + `ring-offset-2`.
- Animaciones usan solo `opacity` y `transform` (sin escalas extremas) para mantener sobriedad.

## Do & Don't

- ✅ Usa la paleta neutra como base en todas las vistas.
- ✅ Reserva el color de cada vertical para CTA, highlights y datos clave.
- ✅ Reutiliza los componentes de `@simple/ui` para heredar espaciado, radios y sombras consistentes.
- ❌ No pintes fondos completos ni navbars con los colores de marca.
- ❌ Evita degradados multicolor salvo en héroes puntuales con aprobación de diseño.
- ❌ No mezcles tipografías externas ni pesos no definidos en el stack.

Mantener esta disciplina garantiza que cada vertical se sienta parte del mismo ecosistema, similar a la coherencia que vemos en Uber o Apple.
