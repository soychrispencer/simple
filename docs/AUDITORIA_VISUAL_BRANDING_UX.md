# Auditoría visual, branding y UX — Ecosistema Simple

**Fecha:** 17 de mayo de 2026  
**Alcance:** `apps/simple*` (autos, propiedades, agenda, admin, plataforma, serenatas), `packages/ui`, `packages/config`, `packages/auth`, tokens CSS por app.  
**Modo:** Solo lectura en código; propuestas marcadas explícitamente donde no hay implementación actual.

---

## 1. Resumen ejecutivo visual

Simple tiene una **base de design system sólida y moderna** (`packages/ui/src/theme-base.css`): paleta neutra tipo Apple/Uber, tipografía Inter, tokens de superficie/sombra y componentes de panel reutilizables (`PanelShell`, `PanelCard`, `PanelButton`, listing cards). Cada vertical sobreescribe `--accent` en su `globals.css` alineado con `@simple/config` (`accentLight` / `accentDark`).

Sin embargo, el ecosistema **aún no se percibe como una sola plataforma** en tres frentes:

1. **Marca por vertical inconsistente en la práctica** — especialmente SimplePropiedades (`#3232FF` en config vs `#3b82f6` en favicons, landing madre y admin).
2. **Tokens semánticos rotos** — uso masivo de `var(--danger)` y `var(--success)` sin definición en CSS global.
3. **Dos modelos de panel** — marketplace verticales con rutas Next + `PanelShell`; SimpleSerenatas como SPA con `ScreenShell` + `?section=`, más inline styles y menos alineación con el chrome compartido.

**Veredicto:** Base premium compartida (~70 % coherente), percepción de producto unificado (~45 %). Prioridad: unificar color de marca en código, cerrar tokens semánticos, converger navegación Serenatas y reducir hardcodes en flujos móviles críticos (publicar / solicitar).

---

## 2. Diagnóstico de marca

| Dimensión | Estado | Evidencia |
|-----------|--------|-----------|
| Marca madre (SimplePlataforma) | Parcial | Landing en `apps/simpleplataforma/src/app/page.tsx` presenta verticales pero con colores desactualizados y sin SimpleSerenatas en `BRAND`. |
| Jerarquía Simple vs vertical | Buena en UI | `BrandLogo` en `packages/ui/src/index.tsx` separa “Simple” + sufijo con color de acento. |
| Naming | Coherente en metadata | `buildSimpleAppMetadata` / `SIMPLE_APP_BRANDS` en `packages/config/src/index.ts`. |
| Identidad por vertical | Definida en config, diluida en assets | Acentos: Autos `#ff3600`, Propiedades `#3232FF`, Agenda `#0D9488`, Serenatas `#E11D48`, Admin/Plataforma neutro. |
| Diferenciación “marketplace afuera / CRM adentro” | Conceptualmente clara | Paneles comparten shell; Serenatas mezcla marketplace de grupos dentro del mismo SPA de operación. |

**Simple** como paraguas existe en copy y componentes, pero **no hay logo system visual unificado** entre favicons (`app/icon.tsx` por app), `BrandLogo` (iconos Tabler por app) y placeholders genéricos (“S” en Serenatas vía `getSimpleBrandIconTokens`).

---

## 3. Diagnóstico por app / vertical

### SimpleAutos
- **Fortalezas:** Acento naranja consistente en `globals.css` y config; icono distintivo (rueda) en `apps/simpleautos/src/app/icon.tsx`; wizard de publicación mobile-first con barra fija inferior (`panel/publicar/page.tsx`).
- **Debilidades:** Decenas de `#FF3600` / `#ff3600` hardcodeados en quick-publish y publicar en lugar de `var(--accent)`; operation chips con colores Tailwind genéricos (`#22c55e`, `#3b82f6`).

### SimplePropiedades
- **Fortalezas:** Misma arquitectura de panel que Autos; acento índigo en CSS y config.
- **Debilidades:** Favicons y assets usan **azul Tailwind `#3b82f6`**, no `#3232FF` (`app/icon.tsx`, `apple-icon.tsx`); `MortgageAdvisor` fallback `var(--accent, #3b82f6)`.

### SimpleAgenda
- **Fortalezas:** Teal alineado con config; panel usa `PanelShell` compartido.
- **Debilidades:** Inputs propios `.field-input` / `.booking-input` en `globals.css` duplican `.form-input` del design system; radius `0.75rem` vs `--radius: 10px`.

### SimpleAdmin
- **Fortalezas:** Neutro premium; usa clases `.btn-primary` del theme.
- **Debilidades:** Stats de usuario colorean Autos con `#3b82f6` (`app/usuarios/page.tsx`) — color de Propiedades incorrecto en código legacy.

### SimplePlataforma
- **Fortalezas:** Landing extensa, modo oscuro por defecto, chips de tema.
- **Debilidades:** `BRAND.propiedades.color: '#3b82f6'`; falta Serenatas/Admin en tarjetas de ecosistema; no consume `getSimpleAppBrand()`.

### SimpleSerenatas
- **Fortalezas:** Acento rose (`#E11D48`); marketplace de grupos con `PanelCard`/`PanelField` (`groups-marketplace-view.tsx`); landing pública dedicada (`public-landing.tsx`); mapa Leaflet tematizado en `globals.css`.
- **Debilidades:** **No usa `PanelShell`** — SPA (`serenatas-app.tsx`) con `ScreenShell` mínimo; alta densidad de `style={{ color: 'var(--fg)' }}` en vistas panel; favicon genérico “S”; flujo `MarketplaceRequestView` largo para móvil.

---

## 4. Qué se ve bien

- **theme-base.css** — Sistema V2 monocromático con dark premium, sombras graduales, helpers tipográficos (`.type-page-title`, `.type-listing-price`).
- **Tokens de acento por app** — Patrón repetible en 6 `globals.css` (4 variables `--accent*`).
- **Panel compartido** — `PanelShell`, sidebar, bottom nav en `@simple/ui`; wrappers delgados en Autos/Propiedades/Agenda.
- **Listing cards** — Componentes compartidos en `packages/ui/src/listing-card/`.
- **Auth modal** — `packages/auth` usa `PanelButton`, `PanelNotice` (coherencia en login).
- **Serenatas marketplace reciente** — Grid de grupos, filtros región/comuna, badges “Verificado”, precios con `money()`.
- **Dark por defecto** — Alineado con visión “dark premium” en la mayoría de layouts.

---

## 5. Qué se ve mal

- Colores de marca **desincronizados** entre config, CSS, favicon y marketing (Propiedades, Plataforma).
- Estados de error/éxito que referencian tokens **inexistentes** (`--danger`, `--success`).
- Mezcla de **inline styles** y clases utilitarias en paneles Serenatas y CRM.
- **Radius arbitrarios** (`rounded-[18px]`, `[22px]`, `[28px]`, `[32px]`) fuera de escala `--radius` / `--radius-lg`.
- Iconografía de app **heterogénea** (SVG custom vs letra “S” vs Tabler en `BrandLogo`).

---

## 6. Qué se ve bonito pero no funciona

- **Landing SimplePlataforma** — Diseño ambicioso y animaciones, pero tarjetas de verticales con colores que no coinciden con productos reales → confunde al usuario que cruza dominios.
- **Wizard publicar Autos** — UI pulida (drag-drop, progreso, footer fijo) con colores hardcodeados → **rompe en tema claro** o si cambia el acento sin redeploy.
- **Instagram / social previews** en `packages/ui` — Visuales fuertes con `brandAccent` hardcodeado solo Autos/Propiedades (`#ff3600` / `#3232FF` en lógica, no Serenatas/Agenda).
- **`glass-card` / `animate-float`** en Serenatas — Estética “app móvil” sin tokens compartidos; difícil de replicar en otras verticales.

---

## 7. Qué se ve feo o incoherente

- Favicon Propiedades **azul genérico** frente a marca índigo definida.
- Serenatas favicon **letra S** en tile negro vs `BrandLogo` con icono musical en app.
- Admin usuarios: punto azul `#3b82f6` etiquetado “Autos”.
- Publicar Autos: mezcla `border-[#FF3600]` y `bg-[var(--accent)]` en el mismo flujo.
- CRM modales `rounded-[28px]` + sombra `rgba(15,23,42,0.18)` — estilo “SaaS azul grisáceo” distinto del resto del panel.

---

## 8. Inconsistencias visuales detectadas

| Token / patrón | Valores encontrados | Ubicación |
|----------------|---------------------|-----------|
| Acento Propiedades | `#3232FF` vs `#3b82f6` | `globals.css` / `config` vs `icon.tsx`, `simpleplataforma/page.tsx` |
| Border radius botones | `8px` (`.btn`), `10px` (`--radius`), `12px` (`rounded-xl`), `24px` (`PanelCard`) | `theme-base.css`, `panel-card.tsx`, TSX ad hoc |
| Botón primario panel | `PanelButton` variants vs `.btn-primary` | Admin auth vs panel marketplace |
| Color error | `--color-error` vs `--danger` | `theme-base.css` vs 20+ componentes |
| Bottom nav highlight | `rgba(255,54,0,0.25)` fijo | `simpleautos/.../panel-bottom-nav.tsx` (no token por vertical) |

---

## 9. Duplicidades de componentes visuales

| Componente | Copias / variantes | Paths |
|------------|-------------------|-------|
| `panel-bottom-nav.tsx` | Wrapper casi idéntico ×3 | `apps/simpleautos`, `simplepropiedades`, `simpleagenda` (delegan a `@simple/ui`) |
| `public-profile-editor.tsx` | Duplicado entre verticales | Autos y Propiedades (mismos `rounded-[18px]`…) |
| `crm-team-settings-manager.tsx` | Duplicado | Autos y Propiedades |
| `theme-provider.tsx` | ×7 archivos idénticos | Cada app + `packages/ui` |
| Inputs formulario | `.form-input` vs `.field-input` / `.booking-input` | `theme-base.css` vs `simpleagenda/globals.css` |
| Panel chrome Serenatas | `ScreenShell` vs `PanelShell` | `screen-shell.tsx` vs `@simple/ui/panel/panel-shell.tsx` |

---

## 10. Problemas de UX

- **Serenatas:** Navegación por `?section=` sin URLs profundas por vista → compartir enlace a “solicitud marketplace” es frágil; comentario explícito en `serenatas-app.tsx`.
- **Serenatas marketplace → solicitud:** Formulario con ubicación completa (`ListingLocationEditor`) + muchos campos obligatorios antes de enviar (`marketplace-request-view.tsx`).
- **Publicar Autos:** Wizard multi-paso con fricción alta (fotos + pricing + metadata); footer fijo ayuda pero pasos siguen siendo largos para “30 segundos”.
- **Auth:** Dependencia de `var(--danger)` para mensajes de error — si el token no resuelve, contraste impredecible.
- **Plataforma:** Usuario no ve Serenatas como parte del ecosistema en home.

---

## 11. Problemas mobile

- **Bottom nav:** Implementación compartida en `@simple/ui` (`PanelBottomNav`) — bien para Autos/Propiedades/Agenda; Serenatas usa la misma primitiva pero con rutas query (`/?section=`).
- **Publicar Autos:** `fixed bottom-16 lg:bottom-0` respeta safe area — bueno; targets de foto en grid pueden ser pequeños en pantallas <360px.
- **Serenatas panel:** Muchas vistas con grids `md:grid-cols-2` pero formularios de una columna largos en móvil (account, work-zones).
- **Tema sistema:** `enableSystem` activo en Autos/Agenda/Serenatas; Plataforma/Admin/Propiedades usan `disableTransitionOnChange` — cambio de tema puede sentirse abrupto.

---

## 12. Propuesta de sistema visual unificado

**Principio:** Una capa **Simple Core** (neutros, tipografía, espaciado, radius, sombras, estados) + capa **Vertical Accent** (solo `--accent*` y opcional `--accent-glow`).

1. **Centralizar tokens en `packages/config` o `packages/ui/theme-base.css`:**
   - Mapear `--danger` → `--color-error`, `--success` → `--color-success` (alias en `:root`).
   - Exportar `applyVerticalTheme(appId)` que inyecte las 4 variables de acento desde `getSimpleAppBrand()`.

2. **Escala de radius única:** `sm: 8px`, `md: 10px` (`--radius`), `lg: 16px` (`--radius-lg`), `xl: 24px` (solo cards hero). Eliminar `rounded-[18px]` etc. gradualmente.

3. **Patrón panel único:** Todas las apps autenticadas usan `PanelShell` + rutas Next; Serenatas migra secciones a rutas (`/panel/grupos`, …) manteniendo prefetch.

4. **Regla de estilo:** Preferir clases semánticas (`.type-section-title`, `.panel-card`) sobre `style={{ color: 'var(--fg)' }}` salvo valores dinámicos.

---

## 13. Propuesta de logo system

| Nivel | Propuesta |
|-------|-----------|
| **Madre** | Isotipo geométrico “S” minimal (no letra tipográfica sola) + wordmark “Simple”; monocromo sobre claro/oscuro. |
| **Vertical** | Mismo isotipo con **borde o punto de acento** en color vertical (como hoy `getSimpleBrandIconTokens` pero con forma única, no solo “S”). |
| **Favicon** | Generar desde script único leyendo `getSimpleAppBrand(appId)` — eliminar SVGs con hex distintos. |
| **App / PWA** | `apple-icon` y `icon` desde la misma fuente que `BrandLogo`. |
| **Reglas** | Isotipo solo &lt;32px; logo completo en headers; versión `onAccent` en botones primarios de color. |

**Mantener de Autos:** Icono radial / movimiento (adaptable a isotipo madre). **Corregir Propiedades:** Reemplazar `#3b82f6` por `#3232FF` en todos los assets.

---

## 14. Propuesta de color system

```text
Neutros (global, theme-base)
├── --bg, --surface, --fg, --border, …
Semánticos (global)
├── --color-error, --color-success, --color-warning
│   └── alias: --danger, --success
Vertical (por app, desde config)
├── --accent, --accent-subtle, --accent-soft, --accent-border, --accent-contrast
└── --accent-glow (nuevo, opcional): color-mix para halos/marketing
```

| Vertical | Acento | Glow sugerido |
|----------|--------|---------------|
| SimpleAutos | `#ff3600` | `rgba(255,54,0,0.35)` |
| SimplePropiedades | `#3232FF` | `rgba(50,50,255,0.30)` |
| SimpleAgenda | `#0D9488` | `rgba(13,148,136,0.28)` |
| SimpleSerenatas | `#E11D48` | `rgba(225,29,72,0.32)` |
| SimpleAdmin / Plataforma | `#111` / `#fafafa` (invert en dark) | sin glow |

**Botones:** Primario = `button-primary` tokens; CTA vertical fuerte = `PanelButton variant="accent"`.

---

## 15. Propuesta de UI kit

**Núcleo obligatorio en `@simple/ui` (existente + completar):**

| Componente | Estado | Acción |
|------------|--------|--------|
| Button / PanelButton | Parcial | Unificar `.btn-primary` y `PanelButton primary` |
| Card / PanelCard | OK | Documentar `tone` y `size` |
| Input / Select / Textarea | OK en theme | Migrar Agenda `field-input` |
| Modal | Disperso | Extraer patrón CRM `rounded-[28px]` a `PanelModal` |
| Badge / PanelStatusBadge | OK en Serenatas shared | Exportar más usado |
| Notice / PanelNotice | OK | Usar para auth y form feedback |
| Bottom nav | OK | Parametrizar `highlightStyle` con `var(--accent)` |
| BrandLogo | OK | Alinear con favicon generator |

**Variantes por vertical:** solo CSS variables, no forks de componente.

---

## 16. Recomendaciones priorizadas

1. **P0 — Alias tokens `--danger` / `--success`** en `theme-base.css`.
2. **P0 — Unificar hex Propiedades** a `#3232FF` en iconos, Plataforma, Admin stats.
3. **P1 — Sustituir hardcodes `#FF3600`** en publicar/quick-publish por `var(--accent)`.
4. **P1 — Añadir SimpleSerenatas** a landing Plataforma con color `#E11D48`.
5. **P1 — Generador único de favicons** desde `@simple/config`.
6. **P2 — Migrar Serenatas** a rutas + `PanelShell` (o extender shell para SPA documentado).
7. **P2 — Consolidar** `public-profile-editor` y CRM managers en `packages/ui` o feature package.
8. **P2 — Escala radius** documentada + lint opcional contra `rounded-[Npx]` arbitrarios.
9. **P3 — Modo claro:** auditoría visual dedicada (screenshot pass) por app.
10. **P3 — Social templates:** soportar los 4 `SimpleAppId` en previews Instagram.

---

## 17. Roadmap visual por fases

| Fase | Horizonte | Entregables |
|------|-----------|-------------|
| **Fase 0 — Quick wins** | 1–2 semanas | Alias tokens semánticos; fix `#3b82f6` → `#3232FF`; Plataforma + Admin colores; hardcodes Autos → CSS vars |
| **Fase 1 — Design tokens** | 3–4 semanas | `applyVerticalTheme()`; `--accent-glow`; bottom nav highlight tokenizado; guía radius/spacing en docs internos |
| **Fase 2 — Logo system** | 4–6 semanas | Isotipo madre + script favicon; reemplazo assets; reglas de uso |
| **Fase 3 — Panel convergence** | 6–10 semanas | Serenatas en `PanelShell` + rutas; reducir inline styles; `PanelModal` |
| **Fase 4 — Mobile UX** | Continuo | Publicación rápida (modo fotos primero); marketplace Serenatas acortado; pruebas dispositivo real |

---

## Hallazgos priorizados (~20)

### [CRÍTICO] ~~Tokens `--danger` y `--success` no definidos en CSS global~~ ✅ (mayo 2026)
- **App/Path:** `packages/ui/src/theme-base.css` (define `--color-error`); consumidores en `packages/ui/src/index.tsx`, `apps/simpleserenatas`, `apps/simpleagenda`, auth callbacks, etc.
- **Problema:** Componentes usan `var(--danger)` y `var(--success)` pero no existen en `:root`.
- **Impacto:** Errores/éxitos con color por defecto inválido o heredado; accesibilidad y confianza degradadas.
- **Evidencia:** `rg "--danger:" **/*.css` → sin resultados; `theme-base.css` líneas 46–51 solo `--color-error`.
- **Recomendación:** Añadir alias `--danger: var(--color-error);` y `--success: var(--color-success);` en `theme-base.css`.
- **Prioridad:** P0

### [CRÍTICO] ~~Color de marca SimplePropiedades divergente en assets públicos~~ ✅ parcial (icon/apple-icon/footer; logo system completo pendiente)
- **App/Path:** `packages/config/src/index.ts` (`#3232FF`); `apps/simplepropiedades/src/app/icon.tsx`, `apple-icon.tsx` (`#3b82f6`)
- **Problema:** Usuario ve azul Tailwind en favicon/PWA, índigo en UI con tokens.
- **Impacto:** Marca rota; percepción de producto distinto entre pestaña, home y listados.
- **Evidencia:** Config L140 vs `icon.tsx` L6 `fill="#3b82f6"`.
- **Recomendación:** Regenerar SVG/OG icons con `#3232FF`; buscar-reemplazar `#3b82f6` en app propiedades y plataforma.
- **Prioridad:** P0

### [ALTO] ~~SimplePlataforma muestra colores de verticales incorrectos~~ ✅ (BRAND + Serenatas; import config pendiente Fase 1)
- **App/Path:** `apps/simpleplataforma/src/app/page.tsx` — `BRAND.propiedades.color: '#3b82f6'`
- **Problema:** Landing madre contradice `getSimpleAppBrand('simplepropiedades')`.
- **Impacto:** Primera impresión del ecosistema incoherente; desconfianza al navegar a Propiedades.
- **Evidencia:** L57–59 vs `packages/config` L140.
- **Recomendación:** Importar brands desde `@simple/config`; añadir Serenatas y Admin al grid.
- **Prioridad:** P1

### [ALTO] SimpleSerenatas no usa `PanelShell` compartido — **parcial** (`SerenataPanelShell` + `activePathname`; SPA con `?section=` sin rutas `/panel/*`)
- **App/Path:** `apps/simpleserenatas/src/components/serenatas-app.tsx`, `layout/screen-shell.tsx`
- **Problema:** SPA con query params vs patrón Next + sidebar estándar del resto.
- **Impacto:** UX de panel distinta (drawer, URLs, prefetch); mayor costo de mantenimiento visual.
- **Evidencia:** Comentario L36–39 en `serenatas-app.tsx`; `ScreenShell` solo aplica `minHeight` + background.
- **Recomendación:** Roadmap a rutas `/panel/*` + wrapper `PanelShell` o extensión documentada del shell para SPA.
- **Prioridad:** P1

### [ALTO] ~~Hardcodes de acento naranja en flujo publicar Autos~~ ✅ mayoría → `var(--accent)` en `publicar/page.tsx`
- **App/Path:** `apps/simpleautos/src/app/panel/publicar/page.tsx`, `components/quick-publish/*`
- **Problema:** `#FF3600`, `#fff8f5` en lugar de tokens `--accent` / `--accent-soft`.
- **Impacto:** Cambios de marca o tema claro requieren edits masivos; inconsistencia con `globals.css`.
- **Evidencia:** `rg "#FF3600" apps/simpleautos` — publicar, Step1Photos, ProgressBar, etc.
- **Recomendación:** Reemplazar por `var(--accent)` y `color-mix(in oklab, var(--accent) 6%, var(--bg))`.
- **Prioridad:** P1

### [ALTO] Sistema de iconos de app sin unificación
- **App/Path:** `apps/simpleautos/src/app/icon.tsx` (SVG rueda); `apps/simpleserenatas/src/app/icon.tsx` (`getSimpleBrandIconTokens` + “S”); `apps/simplepropiedades/src/app/icon.tsx` (casa azul `#3b82f6`)
- **Problema:** Tres lenguajes visuales de favicon; `BrandLogo` usa Tabler icons en runtime.
- **Impacto:** Ecosistema no reconocible entre pestañas; debilidad vs competidores con marca fuerte.
- **Evidencia:** Archivos citados; `BrandLogo` en `packages/ui/src/index.tsx` L85+.
- **Recomendación:** Logo system Fase 2 (sección 13).
- **Prioridad:** P1

### [ALTO] ~~Duplicación de editores de perfil público~~ ✅ parcial — `PublicProfileEditor` en `@simple/ui` (Autos/Propiedades thin wrapper)
- **App/Path:** `apps/simpleautos/src/components/panel/public-profile-editor.tsx` ≈ `apps/simplepropiedades/.../public-profile-editor.tsx`; mismo patrón en `crm-team-settings-manager.tsx`
- **Problema:** Copias casi idénticas con radius custom `rounded-[18px]`–`[24px]`.
- **Impacto:** Fix visual en una vertical no llega a la otra; deuda de diseño duplicada.
- **Evidencia:** `rg "rounded-\[18px\]"` en ambos paths.
- **Recomendación:** Extraer a `packages/ui` o `@simple/panel-profile`.
- **Prioridad:** P2

### [MEDIO] Escala de border-radius fragmentada
- **App/Path:** `theme-base.css` (`--radius: 10px`, `.btn` 8px); `panel-card.tsx` `rounded-[24px]`; CRM `rounded-[28px]`
- **Problema:** Múltiples radios sin tabla de decisión.
- **Impacto:** UI “casi igual” pero no premium-unified; cards CRM se sienten de otro producto.
- **Evidencia:** Conteos `rounded-[14-32px]` en autos/propiedades/admin.
- **Recomendación:** Documentar escala en design tokens; refactor progresivo a `rounded-[var(--radius-lg)]` etc.
- **Prioridad:** P2

### [MEDIO] SimpleAgenda redefine inputs fuera del design system — **parcial** (`.field-input` delega a `.form-input` ✅; `.booking-input` pendiente)
- **App/Path:** `apps/simpleagenda/src/app/globals.css` — `.field-input`, `.booking-input`
- **Problema:** `.booking-input` aún duplica estilos; migrar a `.form-input` en siguiente pasada.
- **Impacto:** Focus rings y alturas distintas vs panel marketplace.
- **Evidencia:** L5–47 vs `theme-base.css` L538–573.
- **Recomendación:** Usar `.form-input` o exportar `FormField` desde `@simple/ui`.
- **Prioridad:** P2

### [MEDIO] ~~`PanelButton` variant danger con colores hex fijos~~ ✅ (mayo 2026)
- **App/Path:** `packages/ui/src/panel/panel-button.tsx` L74–80
- **Problema:** `#b91c1c` no usa `--color-error`.
- **Impacto:** Dark mode y verticales con distinta semántica de error.
- **Evidencia:** `getPanelButtonStyle('danger')` inline rgba/hex.
- **Recomendación:** Bind a `--color-error` y `--color-error-subtle`.
- **Prioridad:** P2

### [MEDIO] Inline styles masivos en panel Serenatas — **parcial** (`home-view`, `groups-view`, `provider-services-view` en 0; resto panel pendiente)
- **App/Path:** `apps/simpleserenatas/src/components/panel/*.tsx` (p. ej. `home-view.tsx` 31 usos, `serenatas-view.tsx` 79)
- **Problema:** Patrón `style={{ color: 'var(--fg)' }}` en lugar de clases tipográficas.
- **Impacto:** Mantenimiento lento; inconsistencia con Autos/Propiedades que mezclan Tailwind + tokens.
- **Evidencia:** Conteo `style={{` en carpeta panel Serenatas.
- **Recomendación:** Adoptar `.type-section-title`, `.type-caption`, utilidades Tailwind `text-[var(--fg)]` centralizadas.
- **Prioridad:** P2

### [MEDIO] ~~Bottom nav highlight hardcodeado a naranja Autos~~ ✅ default `color-mix` accent en `@simple/ui`
- **App/Path:** `apps/simpleautos/src/components/panel/panel-bottom-nav.tsx` L45
- **Problema:** `highlightStyle={{ boxShadow: '0 4px 12px rgba(255, 54, 0, 0.25)' }}` fijo.
- **Impacto:** Si se reutiliza patrón en otra app sin override, color incorrecto (Propiedades ya delega sin ese override — verificar).
- **Evidencia:** L45; Propiedades wrapper no pasa `highlightStyle` (usa default UI).
- **Recomendación:** Default en `@simple/ui`: `color-mix(in oklab, var(--accent) 25%, transparent)`.
- **Prioridad:** P2

### [MEDIO] ~~Previews sociales ignoran Serenatas y Agenda~~ ✅ `getSimpleAppBrand` en `brandAccent`
- **App/Path:** `packages/ui/src/index.tsx` — `brandAccent` L263, `branding.appId` union solo autos/propiedades
- **Problema:** Plantillas Instagram asumen dos verticales.
- **Impacto:** Herramienta de marketing incompleta para ecosistema actual.
- **Evidencia:** L263 `simplepropiedades ? '#3232FF' : '#ff3600'`.
- **Recomendación:** `getSimpleAppBrand(appId).accentLight` para todas las apps.
- **Prioridad:** P3

### [MEDIO] SimpleAdmin colorea “Autos” con azul Propiedades legacy
- **App/Path:** `apps/simpleadmin/src/app/usuarios/page.tsx` L291, L688
- **Problema:** `color="#3b82f6"` para stat Autos.
- **Impacto:** Operadores internos asocian color incorrecto a vertical.
- **Evidencia:** grep `#3b82f6` en simpleadmin.
- **Recomendación:** Usar `getSimpleAppBrand('simpleautos').accentLight`.
- **Prioridad:** P2

### [MEDIO] ~~Marketplace Serenatas: formulario de solicitud largo en móvil~~ ✅ modo solicitud rápida (fecha, comuna, teléfono)
- **App/Path:** `apps/simpleserenatas/src/components/panel/marketplace-request-view.tsx`
- **Problema:** Validación exige fecha, hora, dirección completa, destinatario, teléfono, ubicación con comuna/región antes de enviar.
- **Impacto:** Abandono en solicitud desde celular; fricción vs WhatsApp directo.
- **Evidencia:** L64–67 validación; uso de `ListingLocationEditor`.
- **Recomendación:** Modo rápido (fecha + comuna + contacto) y completar dirección después; propuesta UX.
- **Prioridad:** P2

### [MEDIO] Modo claro potencialmente subauditado
- **App/Path:** Todos los `layout.tsx` con `defaultTheme="dark"`
- **Problema:** Tokens light existen pero la mayoría de QA visual parece orientada a dark.
- **Impacto:** Usuarios con preferencia light ven combinaciones no probadas (wizard `#fff8f5` hardcodeado).
- **Evidencia:** `theme-base.css` `:root` vs `.dark`; hardcodes claros en publicar.
- **Recomendación:** Pass visual light por app post token unification.
- **Prioridad:** P3

### [BAJO] Utilidades CSS solo en Serenatas (`glass-card`, `animate-float`)
- **App/Path:** `apps/simpleserenatas/src/app/globals.css` L54–66
- **Problema:** Efectos locales no en design system compartido.
- **Impacto:** Landing Serenatas ligeramente distinta al resto.
- **Evidencia:** Clases definidas solo en ese globals.
- **Recomendación:** Mover a `theme-base` si se validan; si no, eliminar para minimalismo.
- **Prioridad:** P3

### [BAJO] ~~Siete copias idénticas de `ThemeProvider`~~ ✅ re-export desde `@simple/ui` en apps
- **App/Path:** `apps/*/src/components/theme-provider.tsx`, `packages/ui/src/theme-provider.tsx`
- **Problema:** Wrapper `next-themes` repetido.
- **Impacto:** Bajo hoy; riesgo si se añaden props globales (storageKey, themes).
- **Evidencia:** Archivos de 7 líneas idénticos.
- **Recomendación:** Re-export único desde `@simple/ui` en apps.
- **Prioridad:** P3

### [BAJO] `disableTransitionOnChange` solo en algunas apps
- **App/Path:** `simplepropiedades`, `simpleplataforma`, `simpleadmin` layouts
- **Problema:** Cambio tema sin transición en unas apps, con transición en body en otras.
- **Impacto:** Sensación inconsistente al toggle theme.
- **Evidencia:** Comparar `layout.tsx` ThemeProvider props.
- **Recomendación:** Unificar comportamiento (recomendado: transición suave global ≤300ms).
- **Prioridad:** P3

### [BAJO] Serenatas usa fallback CSS en errores puntuales
- **App/Path:** `musician-availability-toggle.tsx` L121 `var(--danger, #b91c1c)`; `account-view.tsx` L464
- **Problema:** Parche local por token faltante global.
- **Impacto:** Duplicación de valores de error.
- **Evidencia:** Fallback inline en archivo.
- **Recomendación:** Resolver con alias global (hallazgo crítico #1) y quitar fallbacks.
- **Prioridad:** P3 (resuelto con P0)

### [MEDIO] Chips de tipo de operación en publicar usan colores semánticos genéricos
- **App/Path:** `apps/simpleautos/src/app/panel/publicar/page.tsx` L194–196
- **Problema:** Venta verde `#22c55e`, arriendo azul `#3b82f6` — no palette vertical.
- **Impacto:** Confunde con marca Propiedades; paleta rainbow en wizard naranja.
- **Evidencia:** Constantes `OPERATION_TYPES` con hex.
- **Recomendación:** Usar variantes de `var(--accent)` + neutros, o tokens `--op-sale`, etc.
- **Prioridad:** P2

---

## Percepción vs competencia (síntesis cualitativa)

| Aspecto | Simple (hoy) | Referentes (Marketplace / portales) |
|---------|--------------|-------------------------------------|
| Dark premium / tipografía | Por encima de Yapo / clasificados legacy | Cerca de apps fintech modernas; por debajo de polish Apple-level en light |
| Coherencia multi-vertical | Por debajo de suite única (Meta, MercadoLibre ecosystem) | Competidores son mono-vertical — Simple debe **parecer familia** |
| Confianza en publicación | Buena base wizard Autos | Chileautos / Portal: fotos + precio rápido — Simple debe acortar pasos |
| Serenatas / nicho | Diferenciado emocionalmente | Sin análogo directo — oportunidad si mobile UX es impecable |

---

## Anexo: comandos de verificación usados

```bash
rg "var\(--|#[0-9a-fA-F]{6}" apps/simpleautos/src apps/simpleserenatas/src packages/ui/src --glob "*.{css,tsx}"
rg "--danger:" **/*.css
rg "#3b82f6|#3232FF" apps --glob "*.{tsx,css}"
```

---

## Pasada 8 — mayo 2026

| Ítem | Estado |
|------|--------|
| Nav operación: `groups` → **Jornadas**; `mi-grupo` = marca comercial | Hecho — `panel-nav-config.ts`, títulos panel |
| `style={{` en `home-view`, `groups-view` | Reducido — clases token (`text-fg-muted`, `border-accent-border`, etc.) |
| Contrato legacy por paquetes | Fuera de nav cliente; flujo principal marketplace |

## Pasada pendientes 15 — mayo 2026

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Favicon Autos | ✅ `icon.tsx` + `apple-icon.tsx` con `getSimpleBrandIconTokens('simpleautos')` | — |
| Favicon Propiedades | ✅ tokens `simplepropiedades` (casa; sin hex fijo) | — |
| Favicon Serenatas | ✅ `apple-icon` 180×180 escalado (misma silueta que `icon`) | — |
| Guía | ✅ `docs/LOGO_SYSTEM.md` tabla actualizada | PNG `/public` legacy |
| `public-landing` inline styles | — | ~94 `style={{` |

## Pasada pendientes — mayo 2026

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Rutas panel Next `/panel/*` | ✅ `panel-routes.ts`, `[[...slug]]` renderiza panel; nav y `changeSection` sincronizan pathname | Subrutas dinámicas grupo (`/panel/grupo/:slug`) |

## Pasada pendientes 2 — mayo 2026

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| `/panel/grupo/{slug}` | ✅ Path canónico; redirect `?grupo=`; enlaces `panelGroupHref` | QA visual detalle grupo |
| Encoding marketplace | ✅ `groups-marketplace-view.tsx` (Región, más, …) | Sweep `public-landing` |
| Playwright | ✅ `/panel/serenatas` gate; redirect grupo | Flujo contratar autenticado |
| Compat `?section=` | ✅ `LegacySectionRedirect` en `/` → `/panel/{slug}` | — |
| Formularios móvil | ✅ Cuenta: tabs sticky; `SerenataForm` 3 pasos en `<sm` | QA visual dispositivos reales |
| Playwright | ✅ `/panel/grupos`, redirect `?section=grupos`, `E2E_*` en `.env.local.example` | Flujo marketplace autenticado |
| `public-landing` inline styles | — | ~94 `style={{` (fuera panel) |

## Pasada pendientes 3 — mayo 2026

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Rutas panel | ✅ `/panel/solicitar` + redirect `?section=solicitar` | Draft solicitud en URL (opcional) |
| Playwright | ✅ Gate panel inicio/solicitar; E2E grupos autenticado con `E2E_*` | CI browsers |
| Marketplace UX | ✅ `groups-marketplace-view` typecheck OK | QA visual filtros región/comuna |
| `public-landing` inline styles | — | ~94 `style={{` (sin tocar en pasada) |

## Pasada pendientes 4 — mayo 2026

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Draft solicitud | ✅ `sessionStorage` al elegir servicio; restore en refresh `/panel/solicitar` | Query `?grupo=&servicio=` (opcional) |
| Playwright CI | ✅ `test:e2e:ci` documentado; workflow con `PLAYWRIGHT_SKIP=1` | Job CI con Chromium + creds |
| Marketplace UX | Sin cambios visuales masivos | QA refresh en flujo solicitar |

## Pasada 16 — Playwright `/panel/grupos` (mayo 2026)

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Marketplace sin login | ✅ E2E `/panel/grupos` — «Acceso restringido» + copy grupos/marketplace | Detalle grupo con slug seed |
| `PLAYWRIGHT_SKIP` | Sin cambio — CI sin browsers | Job con `playwright install` |
| QA visual staging | Sin automatización en repo (decisión producto) | Checklist manual post-deploy |

## Pasada 15 — Playwright landing y panel (mayo 2026)

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Landing marketplace | ✅ E2E busca texto grupos/mariachis en `/` | Captura visual regresión |
| Panel sin auth | ✅ `/panel/agenda` → «Acceso restringido» + botón login | Sesión real en CI |
| `PLAYWRIGHT_SKIP` | Documentado en auditoría técnica § Pasada 15 | Job CI opcional con browsers |

## Pasada 14 — logos Agenda + Playwright Serenatas (mayo 2026)

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Smoke metadata | ✅ `e2e/smoke.spec.ts` valida título `SimpleSerenatas` y meta description | Flujos panel con sesión |
| `apple-icon` Agenda | ✅ Tokens `@simple/config` (misma silueta que `icon.tsx`) | — |
| Logo system doc | ✅ `docs/LOGO_SYSTEM.md` (guidelines, sin assets) | Alinear apple-icon otras verticales |

## Pasada pendientes 13 — favicon Agenda (mayo 2026)

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| `icon.tsx` SimpleAgenda | ✅ `getSimpleBrandIconTokens('simpleagenda')` + glifo calendario | — |
| `apple-icon.tsx` | ✅ Pasada 14 | — |
| Logo system doc | ✅ Pasada 14 | — |

## Pasada 13 — QA Serenatas (mayo 2026)

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Playwright smoke home | ✅ `apps/simpleserenatas/e2e/smoke.spec.ts` — carga `/`, `lang=es` | Flujos panel autenticados |
| `test:e2e` | ✅ `PLAYWRIGHT_SKIP=1` omite suite en CI sin Chromium | `playwright install` en dev |

## Pasada 12 — panel Serenatas (mayo 2026)

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| `style={{` panel operación | Sin cambios masivos (account-view ya limpio pasada 11) | Otras vistas panel si aparecen inline nuevos |
| Smoke / QA visual | Playwright mínimo añadido en pasada 13 | E2E panel login / marketplace |

## Pasada 11 — tokens y shell Serenatas (mayo 2026)

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| `PanelShell` Serenatas | ✅ `SerenataPanelShell` delega en `@simple/ui` `PanelShell` + bottom nav | Rutas Next `/panel/*` (SPA `?section=` sigue) |
| `style={{` panel Serenatas | ✅ 0 en `account-view`; panel solo skeleton dims dinámicas | `public-landing` marketing (94 inline, fuera panel) |
| Chips `rounded-md` → `rounded-button` | ✅ landing status chip, `profile-switcher` | Cards contenedor `rounded-xl` (no botones) |
| `applyVerticalTheme` | ✅ Documentado en `theme-base.css` (tokens por app en globals) | Runtime injector (no requerido) |
| Modales radius | ✅ Nota `--radius-card` en `theme-base.css` | CRM `rounded-[28px]` legacy Autos/Prop |
| Logo system | — | Assets diseño |

## Pasada 10 — pasada final honesta (mayo 2026)

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| Tema claro/oscuro en verticales | ✅ Causa: Tailwind v4 usaba `prefers-color-scheme` para `dark:`; fix `@custom-variant dark` + `attribute="class"` + imports `@simple/ui` | QA manual 2 apps |
| Botones semiredondos (`--radius-button`) | ✅ `.btn`, `.panel-button`, Agenda booking/field | Chips/listados con `rounded-md` menores |
| `.booking-input` | ✅ Alineado a tokens field/form (12px / `--radius-button`) | — |
| `style={{` panel Serenatas | ✅ Parcial (skeleton, switcher, work-zones, availability) | account-view limpio en pasada 11 |
| Logo system / PanelShell Serenatas | Parcial pasada 11 | Diseño + rutas `/panel/*` profundas |
| Playwright / Redis / rotación Coolify | — | Ops |

## Pasada 9 — mayo 2026

| Ítem | Hecho | Pendiente |
|------|-------|-----------|
| `style={{` `home-view` / `groups-view` / `provider-services-view` | ✅ 0 / 0 / 0 (grep) | Resto panel Serenatas (~70 en otras vistas) |
| `PanelButton` danger → tokens | ✅ (pasada 2, verificado) | — |
| `.field-input` Agenda → `.form-input` | ✅ `@apply form-input` | `.booking-input` |
| Acento vertical documentado | ✅ comentario en `theme-base.css` | `applyVerticalTheme()` runtime |
| Logo system unificado | — | Diseño assets |
| `PanelShell` Serenatas | — | Rutas `/panel/*` |

## Pasada 7 — mayo 2026

| Ítem | Estado |
|------|--------|
| Migración `0041_remove_discontinued_vertical` (CHECK sin `serenatas`) | Hecho — script seguro `apply-0041-check-only.ts` + hash en `__drizzle_migrations` |
| `db:sync:migration-hashes` | 53/53 aplicados |
| `style={{` prioritarios (`serenatas-view`, `agenda-view`, `group-detail`, `groups-marketplace`) | Hecho (0 en esos archivos; quedan ~81 en otros panel) |
| `LEGACY_PROFILE_STORAGE_KEY` | Simplificado — solo lectura `musician`/`admin`/`coordinator`; clave no exportada |
| simpleadmin etiqueta dueño Serenatas | Hecho — «Dueño Serenatas» (API mantiene alias `coordinator`) |
| Extracción `index.ts` pasada 7 | Hecho — `modules/admin/snapshots.ts` (~195 líneas) |

## Pasada 6 — mayo 2026 (parcial)

| Ítem | Estado |
|------|--------|
| `SerenataRow` en `shared.tsx` — tokens Tailwind | Hecho |
| Resto `style={{` en panel Serenatas | Parcial (vistas prioritarias en pasada 7) |
| `LEGACY_PROFILE_STORAGE_KEY` (coordinator) | Simplificado en pasada 7 |

## Pasada 5 — mayo 2026 (parcial)

| Ítem | Estado |
|------|--------|
| `provider-group-view` / `invitations-view` tokens CSS | Hecho (clases `text-[var(--*)]` en lugar de inline) |
| `account-view` notificaciones / integraciones | Parcial (quedan algunos `style=` en bordes) |
| Chips OPERATION_TYPES Autos publicar | N/A (sin hex en repo) |

## Pasada 2 — mayo 2026 (implementado en repo)

| Ítem | Estado |
|------|--------|
| PanelButton danger → `--color-error` | Hecho |
| Bottom nav highlight tokenizado | Hecho |
| `brandAccent` con `getSimpleAppBrand` | Hecho |
| `#3b82f6` en apps (quedaba en UI info badge) | Hecho en `@simple/ui` |
| `public-profile-editor` compartido | Hecho (Autos/Propiedades) |
| ThemeProvider único | Hecho (re-export apps) |
| Marketplace solicitud rápida | Hecho |
| Serenatas shell spacing | Parcial |
| `home-view` inline styles | Parcial |

---

## Auditoría ecosistema — mayo 2026 (informe focal)

**Fecha:** 18 de mayo de 2026  
**Alcance:** SimpleAutos, SimplePropiedades, `@simple/ui`, tokens, quick-publish, CRM, home search, publicidad panel.  
**Veredicto:** ~**74 %** de coherencia visual en código (base premium compartida; fugas de acento hardcodeado, modales CRM legacy e inline styles en flujos marketplace).

### Hallazgos priorizados (resumen)

| Prioridad | Hallazgo | Apps / paths |
|-----------|----------|--------------|
| MEDIO | Acento `#FF3600` / `rgba(255,54,0,…)` fuera de tokens | `simpleautos` bottom nav, quick-publish |
| MEDIO | Modales CRM `rounded-[28px]` + sombra azul grisácea | `panel/crm/page.tsx` Autos y Propiedades |
| MEDIO | Inline styles densos en búsqueda home y publicidad | `home-searchbox.tsx`, `panel/publicidad/page.tsx` |
| BAJO | PNG legacy sin wordmark madre | `public/logo*.png` — ver `LOGO_SYSTEM.md` |
| BAJO | Serenatas `?tab=` en Mi Negocio | `panel-routes.ts` — sin bug funcional obvio |

---

## Hallazgos aplicados — mayo 2026 (pasada implementación)

| # | Hallazgo | Estado | Notas |
|---|----------|--------|-------|
| 1 | Autos acento hardcodeado (bottom nav + quick-publish) | **Hecho** | `PanelBottomNav` sin `highlightStyle` custom; `#FF3600` → `var(--accent)` en ProgressBar, Step1Photos, PreviewPanel, StepSuccess |
| 2 | CRM modales legacy | **Hecho** | `rounded-card`, `shadow-[var(--shadow-xl)]`, overlay `color-mix` con `--fg` (Autos + Propiedades) |
| 3 | Inline styles Autos (home-searchbox, publicidad) | **Parcial** | ~72 % menos `style={{` en searchbox (46→12); ~45 % en publicidad (42→23); clases `.autos-*` en `globals.css` |
| 4 | Logo / PNG | **Doc** | `LOGO_SYSTEM.md` — tabla pendientes assets; sin borrar PNG |
| 5 | Serenatas deep links `tab` | **No aplica** | `panelMiNegocioHref` / `miNegocioTabFromSearch` coherentes; sin cambio |
| 6 | Documentación auditoría | **Hecho** | Esta sección + actualización CIERRE |
| 7 | QA flag `NEXT_PUBLIC_QUICK_PUBLISH_PHOTOS_FIRST` | **Hecho** | Default `false` en `.env.local.example` con nota staging/prod |

---

## Cola cerrada mayo 2026

**Fecha:** 18 de mayo de 2026  
**Alcance:** cola visual restante SimpleAutos (mapa, CRM, publicidad, home-searchbox) + CRM Propiedades + documentación ops.

| Ítem | Estado | Notas |
|------|--------|-------|
| SearchMap / footer / mapa — `#ff3600` → tokens | **Hecho** | `SearchMap` default `var(--accent)`; footer `autos-accent-icon`; `home-searchbox` sin `brandColor` hardcode; `global-error` usa `var(--accent, #ff3600)` |
| CRM Autos — ≥50 % menos `style={{` | **Hecho** | 76 → 14 (dinámicos: drag, grid, toggles, opacidad) |
| CRM Propiedades — mismo patrón | **Hecho** | 76 → 14; clases `.crm-*` en `globals.css` |
| Publicidad Autos — mínimo inline | **Hecho** | 23 → 3 (opacidad, aspect-ratio/preview dinámico) |
| `home-searchbox` — 0 o mínimo inline | **Hecho** | 11 → 0; clases `.autos-search-*`, `.autos-icon-btn` |
| Utilidades CSS | **Hecho** | `.autos-*` + `.crm-*` en `apps/simpleautos/src/app/globals.css` |
| Logo / PNG / rotación secretos | **Ops** | Sin cambios (fuera de alcance) |

### §14 — Checklist operaciones (Coolify / MP / migrate)

Ejecutar en entorno de despliegue con acceso a Coolify y variables ya configuradas. **No pegar secretos en chat ni en commits.**

1. **Pre-flight**
   - Confirmar rama desplegada y `pnpm run typecheck` verde en CI.
   - Backup de base de datos (snapshot Coolify o `pg_dump` según política del equipo).

2. **Migraciones Drizzle**
   - En el servicio API/worker con `DATABASE_URL` de producción/staging:
     - `pnpm run db:migrate` (o script documentado en `README` / auditoría técnica).
   - Verificar tabla `__drizzle_migrations` sin pendientes.
   - Si aplica migración CHECK-only documentada (`apply-0041-check-only.ts`), ejecutar solo el script aprobado en runbook.

3. **Coolify — despliegue apps**
   - Rebuild imágenes: `simpleautos`, `simplepropiedades`, API compartida, verticales afectadas.
   - Variables por app: `NEXT_PUBLIC_*`, `DATABASE_URL`, Redis si aplica — **rotar solo desde panel Coolify**, no commitear.
   - Tras deploy: smoke HTTP 200 en `/`, `/panel`, health API.

4. **Mercado Pago (publicidad / suscripciones)**
   - Confirmar `MP_ACCESS_TOKEN` (prod vs test) en Coolify coincide con el entorno.
   - Webhook URL apuntando al dominio API vigente; re-probar un checkout de prueba en staging antes de prod.
   - Revisar campañas con `paymentStatus !== 'paid'` tras deploy (no quedan visibles hasta confirmación — comportamiento esperado).

5. **Post-deploy QA visual (manual)**
   - SimpleAutos: home search (tabs, mapa), panel CRM (embudo + detalle), panel publicidad (wizard 3 pasos).
   - SimplePropiedades: CRM modales y tokens azul `#3232FF`.
   - Modo claro/oscuro en al menos una app por vertical.

6. **Playwright / E2E (opcional CI)**
   - Local: credenciales en `.env.local` (`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`).
   - CI sin browsers: `PLAYWRIGHT_SKIP=1`; job con Chromium solo si secrets y `playwright install` están habilitados.

7. **Rollback**
   - Coolify: redeploy imagen/tag anterior.
   - DB: restaurar snapshot si migración irreversible falló (documentar incidente).

---

## CIERRE DEFINITIVO AUDITORÍAS — mayo 2026

**Veredicto UX/branding en código:** cerrado para desarrollo. Pasadas visuales 1–21 archivadas; sin carpeta `marketing/`.

| Hecho en repo | Requiere humano |
|---------------|----------------|
| Tokens `@simple/ui`; `theme-base.css` documenta acento por app (sin `applyVerticalTheme` runtime) | Assets diseño logo system unificado |
| Serenatas: landing `.landing-*`, panel sin `style={{` arbitrarios | QA visual manual staging (claro/oscuro) |
| `PanelShell` compartido; bottom nav tokenizado (default `color-mix` en `@simple/ui`) | — |
| Autos bottom nav: sin `rgba(255,54,0,0.25)` — usa highlight por defecto de `PanelBottomNav` | — |
| Autos quick-publish: acento vía `var(--accent)` en barra de progreso y paso fotos | — |
| CRM Autos/Propiedades: modales + clases `.crm-*` (~80 % menos inline estático) | Toggles/drag con estilo dinámico residual |
| Autos `NEXT_PUBLIC_QUICK_PUBLISH_PHOTOS_FIRST` documentado; default `false` (opt-in QA/staging) | Activar en prod solo con criterio de producto |
| Playwright smoke documentado en CI (`.github/workflows/ci.yml`) | E2E autenticado: secrets `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` |

### Verificación

```bash
pnpm run typecheck
PLAYWRIGHT_SKIP=1 pnpm --filter @simple/serenatas test:e2e:ci
```

---

## Auditoría focal — Landing SimpleSerenatas

**Fecha:** 17 de mayo de 2026  
**Alcance:** `apps/simpleserenatas/src/components/auth/public-landing.tsx`, `globals.css` (`.landing-*`), `icon.tsx`, chrome compartido.

### Hallazgos

| Prioridad | Hallazgo | Recomendación |
|-----------|----------|---------------|
| ALTA | Header custom duplicado (logo + tema + CTAs) sin nav de anclas | `MarketplaceHeader` + `publicLinks` (`/#para-clientes`, músicos, grupos, cómo funciona) y `rightSlot` con `.btn` |
| ALTA | Footer custom con enlaces `button` sin destino y redes placeholder | `Footer` en `components/layout/footer.tsx` (patrón Agenda); `Link` con anclas reales; legal `/terms`, `/privacy` |
| ALTA | CTAs mezclados (`PanelButton` + `.btn`) | Una familia: `.btn-primary` / `.btn-outline` / `.btn-ghost` en toda la landing |
| ALTA | «Saber más» disparaba `onRegister` | `Link` a `#para-clientes`, `#para-musicos`, `#para-grupos` |
| MEDIO | `rounded-[2.5rem]` / arbitrarios | `rounded-card`, `rounded-button` |
| MEDIO | ~8 `style={{}}` inline | Clases `.landing-*` en `globals.css` |
| MEDIO | `bg-green-500` en estado sistema | `.landing-status-dot` → `var(--color-success)` |
| MEDIO | `opacity-60/70` sueltos | `.landing-text-muted`, tokens `--fg-muted` |
| MEDIO | Favicon genérico «S» (ImageResponse) | SVG con nota musical + `getSimpleBrandIconTokens('simpleserenatas')` |
| MEDIO | «+500 músicos» sin respaldo | Copy conservador sin cifra |
| BAJO | Redes sociales placeholder | Ocultar hasta href real |
| BAJO | Hover scale/rotate en pasos «Cómo funciona» | Solo sombra suave en hover |

### Mejoras aplicadas (mayo 2026)

- `LandingHeader` (`components/layout/landing-header.tsx`) con `MarketplaceHeader`.
- `Footer` compartido (`components/layout/footer.tsx`).
- `public-landing.tsx` refactorizado: secciones con `id` para anclas, 0 `style={{}}`, CTAs unificados.
- `globals.css`: ampliación `.landing-*` (avatar, preview-row, step-card, status-dot, saber-mas).
- `icon.tsx`: SVG musical con acento de marca.

**Verificación:** `pnpm run typecheck` (monorepo + `@simple/serenatas`).

---

---

## Auditoría app completa — SimpleSerenatas

**Fecha:** 17 de mayo de 2026  
**Alcance:** `apps/simpleserenatas` — panel SPA, auth, landing, `globals.css`, chrome (`MarketplaceHeader`, `PanelShell`).

### Hallazgos y estado (mayo 2026)

| Prioridad | Hallazgo | Estado |
|-----------|----------|--------|
| P1 ALTO | Auth con `style={{}}` inline (gate, callback, confirm, reset, guard) | **Hecho** — clases `.auth-*` en `globals.css` |
| P1 ALTO | Doble chrome: `MarketplaceHeader` + `PanelShell` con nav duplicada | **Hecho** — header sin nav en menú cuenta; sidebar único |
| P1 ALTO | SPA `?section=` sin URLs profundas | **Parcial** — documentado en código + redirects `/panel/*` ampliados; rutas Next por vista **no** migradas |
| P2 MEDIO | Tipografía inconsistente en vistas principales | **Hecho** — `.type-section-title` en home/serenatas/groups |
| P2 MEDIO | Modales sheet duplicados | **Hecho** — `PanelSheet` reutilizable |
| P2 MEDIO | Mapa `min-h-[620px]` fijo en móvil | **Hecho** — `min-h-[50dvh] sm:min-h-[620px]` |
| P2 MEDIO | Overlays auth con `rgba` hardcoded | **Hecho** — `.auth-overlay` con `color-mix` y tokens |
| P3 BAJO | `.glass-card` / `.animate-float` muertos | **Hecho** — eliminados de `globals.css` |
| P3 BAJO | `screen-shell` `fontFamily` inline | **Hecho** — clase `font-sans` |

### Mejoras aplicadas (mayo 2026)

- [x] Tokens auth: `.auth-overlay`, `.auth-surface`, `.auth-title`, `.auth-text-muted`, iconos success/error
- [x] `getPanelNavItems={() => []}` en panel logueado; menú móvil abre sidebar (`simple:panel-mobile-open`)
- [x] Comentarios SPA en `serenatas-app.tsx`, `serenata-context.tsx`, `app/panel/[[...slug]]/page.tsx`
- [x] Redirects legacy: marketplace, explorar, solicitar, grupo, notificaciones, cuenta/*
- [x] `components/panel/panel-sheet.tsx` usado en `serenatas-view` y `groups-view`
- [x] Mapa responsive en `map-view.tsx`

### Fuera de alcance (una pasada)

- Migrar cada sección del panel a rutas Next (`/panel/agenda`, etc.) sustituyendo `?section=`
- Eliminar todos los `style={{}}` del panel (~skeleton dinámico, `error-boundary`, dev providers)

---

---

## Revisión UI/estilo — mayo 2026

Pasada de implementación ecosistema (P1–P3) tras revisión de subagente. Objetivo: reducir inline styles, unificar componentes de panel y acercar footers marketplace al patrón Serenatas.

### Checklist 22 ítems

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| 1 | Propiedades `publicidad` — clases token + cola como Autos | **Hecho** | `prop-*` en `globals.css`; página alineada con Autos (~4 `style` restantes) |
| 2 | Propiedades `publicar` — reducir inline | **Hecho** | 11→2 `style` (solo barras de progreso dinámicas); chips/terms con `prop-*` |
| 3 | `SubscriptionManager` en `@simple/ui` | **Hecho** | Autos + Propiedades usan wrapper fino |
| 4 | `InstagramIntegrationCard` compartida | **Hecho** | Autos: base `@simple/ui` + `InstagramIntelligencePanel`; Prop ya migrada |
| 5 | `MortgageAdvisor` + simulador — `.mortgage-*` | **Hecho** | MortgageAdvisor 58→0 estáticos; simulador panel −26% con mismas clases |
| 6 | `MarketplaceFooter` | **Hecho** | Autos, Propiedades, Agenda + Serenatas |
| 7 | Admin modales `rounded-card` | **Hecho** | `reportes` + `usuarios` (`admin-modal-*`, `shadow-xl`) |
| 8 | CRM subcomponentes compartidos | **Saltado** | Sin reescritura del page 1700 líneas |
| 9 | Quick-publish `.qp-*` | **Hecho** | `Step1Photos` 2 `style` (DnD + overlay); resto `.qp-*` en `globals.css` |
| 10 | Slider destacados compartido | **Hecho** | `FeaturedBoostSliderSection` en `@simple/ui`; Autos + Prop |
| 11 | `site-info-page` compartido | **Hecho** | `SiteInfoPage` en `@simple/ui`; re-export en Autos/Prop |
| 12 | `perfil/[username]` layout parcial | **Hecho** | `PublicProfileShell` en `@simple/ui` + slot inventario; Autos/Prop wrappers finos |
| 13 | Plataforma tarjeta SimpleAdmin en BRAND | **Hecho** | `admin` en `BRAND` + `verticalFeatures` |
| 14 | mensajes/estadisticas `rounded-card` | **Hecho** | Propiedades |
| 15 | Agenda oleada mínima | **Hecho** | `BookingFlow` 95→41; 2.ª oleada `pagos` 75→52 con `.agenda-pagos-*` |
| 21 | Plataforma landing inline | **Hecho** | 82→39 `style` (~52%); clases `.plt-*` |
| 19 | Agenda `field-input` | **Hecho** | Documentado en `globals.css` (alias de `form-input`) |
| 16–22 | Resto P2 menor (tokens semánticos, marketing-shell, etc.) | **Parcial/Saltado** | Ver auditoría §5–8 |

### Mejoras aplicadas post-revisión

- [x] `packages/ui`: `SubscriptionManager`, `InstagramIntegrationCard`, `MarketplaceFooter`
- [x] `apps/simplepropiedades`: `globals.css` panel + mortgage; `publicidad` refactor
- [x] `apps/simpleserenatas`: footer vía `MarketplaceFooter`
- [x] `apps/simpleplataforma`: SimpleAdmin en ecosistema landing
- [x] `apps/simpleadmin`: `reportes` + `usuarios` → `rounded-card` / `admin-modal-*`
- [x] Autos/Prop/Agenda: `MarketplaceFooter` con secciones por vertical
- [x] Autos: Instagram wrapper + IA; quick-publish `.qp-*` (Step1Photos cerrado)
- [x] `@simple/ui`: `PublicProfileShell` + tokens `.pp-*` en `theme-base.css`
- [x] Propiedades: MortgageAdvisor sin inline estático; simulador panel alineado
- [x] Agenda: `pagos` con `.agenda-pagos-*`
- [x] `@simple/ui`: `SiteInfoPage`, `FeaturedBoostSliderSection`
- [x] Plataforma landing: clases `.plt-*`; Agenda booking: `.booking-*`

**Verificación:** `pnpm --filter @simple/ui build` + `pnpm run typecheck` (mayo 2026, pasada P2/P3).

---

## Continuación UI (mayo 2026)

Pasada posterior al cierre parcial P2/P3: reducir `style={{` en archivos de mayor deuda sin tocar lógica de negocio.

| Archivo | Antes | Después | Clases / notas |
|---------|------:|--------:|----------------|
| `apps/simpleagenda/.../panel/agenda/page.tsx` | 101 | 36 | `.agenda-panel-*` en `globals.css`; toggles búsqueda/vista con modificadores; resto dinámico (posición citas, `STATUS_COLORS`) |
| `apps/simpleagenda/.../[slug]/BookingFlow.tsx` | 41 | 16 | `.booking-*` ampliado; calendario/slots y Mercado Pago siguen inline |
| `apps/simplepropiedades/.../simulador/page.tsx` | 74 | 6 | Reutiliza `.mortgage-*` / `.mortgage-field-input`; solo aprobación DTI, escenarios y tasa subsidio |
| `apps/simpleautos/.../mensajes` + `estadisticas` | `rounded-[18px]` | `rounded-card` | Alineado con Propiedades |
| `packages/ui/.../listing-owner-actions.tsx` | 2 | 0 | `.listing-owner-menu*` en `theme-base.css` |
| `packages/ui/.../listing-location-editor.tsx` | 22 | 2 | `.loc-editor-*`; `flex: 1` y opacidad disabled |

**Pendiente siguiente oleada:** `panel/page.tsx` Agenda (~37), resto `BookingFlow`, modales agenda con posicionamiento absoluto, más subcomponentes `listing-card/`.

## Continuación UI 2 (mayo 2026)

Segunda pasada: home panel Agenda, clientes, BookingFlow residual, landing Plataforma, shell CRM compartido.

| Archivo | Antes | Después | Clases / notas |
|---------|------:|--------:|----------------|
| `apps/simpleagenda/.../panel/page.tsx` | 37 | ~2 | `.agenda-home-*` (surface, skeleton, checklist, warning banner); dinámico: altura barras SVG, `width` progreso |
| `apps/simpleagenda/.../panel/clientes/page.tsx` | 49 | 32 | Reutiliza `.agenda-panel-*` en header, modales, cards; pendiente tags dinámicos y contact menu |
| `apps/simpleagenda/.../[slug]/BookingFlow.tsx` | 16 | 0 | `.booking-day*`, `.booking-slot*`, `.booking-checkbox*`, `.booking-modal-scroll`, `.booking-encuadre-box` |
| `apps/simpleplataforma/src/app/page.tsx` | 39 | ~16 | `.plt-*` (stats band, mobile menu, checks, secciones); brand colors siguen inline |
| `packages/ui/.../crm-modal-shell.tsx` | — | nuevo | `CrmModalShell` usado en CRM Autos + Propiedades (`LeadDetailModal`, `PipelineColumnsModal`) |
| `apps/simpleagenda/.../panel/agenda/page.tsx` | 36 | 36 | Sin cambio adicional esta pasada (pendiente modales estáticos) |

**Verificación:** `pnpm --filter @simple/ui build` y `pnpm run typecheck`.

---

*Documento generado por auditoría de código (skill `audit-visual-branding-ux`). Actualizado tras pasada 2 mayo 2026, auditoría focal landing Serenatas, app completa Serenatas y pasada implementación ecosistema mayo 2026.*
