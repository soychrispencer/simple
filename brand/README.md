# Brand Simple — guía de marketing

Fuente de verdad para avatares, anuncios e Instagram de las verticales públicas.
Código de marca: `@simple/config` (`packages/config`) y `BrandLogo` en `@simple/ui`.

## Verticales (Instagram / ads)

| Vertical | Accent | Ícono (Tabler) | Glifo |
|----------|--------|----------------|-------|
| SimpleAutos | `#E84A1F` | SteeringWheel | blanco |
| SimplePropiedades | `#4F46E5` | Door | blanco |
| SimpleAgenda | `#0F766E` | Calendar | blanco |
| SimpleSerenatas | `#E11D48` | Confetti | blanco |
| SimpleTickets | `#0E7490` | Ticket | blanco |
| SimpleResto | `#F4B400` | Receipt | `#0C0C0E` (negro) |

No usar SimpleAdmin / SimplePlataforma en creatividades públicas salvo campaña de ecosistema explícita.

## Voz

- Español de Chile, directo, sin jerga vacía.
- Una idea por pieza. Beneficio claro > lista de features.
- Marca: “Simple” + vertical (p. ej. SimpleResto). No inventar submarcas.
- Tono: profesional cercano, operativo, confiable. Evitar hype vacío y emojis en cadena.

## Logo e íconos

- **Una sola fuente:** `packages/config/src/brand-icon-svg.ts` (mismos glifos que el header).
- No crear variantes de logo “solo para redes”. Si cambia el look, se actualiza el SVG oficial.
- Avatares IG: `brand/instagram-profiles/` (preferir export vector 2048×2048).
  - Full-bleed: `ig-profile-{id}.png`
  - Con recuadro (header): `ig-profile-framed-{id}.png`
- Regenerar: `node brand/instagram-profiles/export-vector-avatars.mjs` (requiere `sharp` + `@resvg/resvg-js`).

## Estructura de ads

```
brand/ads/
  _shared/     ← formatos, checklist, plantillas
  simpleautos/
  simplepropiedades/
  simpleagenda/
  simpleserenatas/
  simpletickets/
  simpleresto/
```

Cada campaña: carpeta `YYYY-MM-tema/` dentro de la vertical, con brief corto + assets.

## Qué no hacer

- No inventar colores fuera de la tabla.
- No mezclar íconos entre verticales.
- No purple-on-white genérico ni looks de plantilla IA por defecto.
- No videos desde este flujo (solo imagen / copy / storyboard).
- **No ignorar zonas seguras de Instagram** (`brand/ads/_shared/README.md`).

## Cómo usar esto en Cursor

- La rule `.cursor/rules/brand-ads.mdc` **solo** se activa con archivos bajo `brand/` (no en chats de código normales).
- Chat de publicidad: menciona `@brand` o `@brand/README.md` (o abre un archivo de `brand/ads/…`).
- Chat de código de una vertical: no hace falta; la rule de ads no interfiere.
