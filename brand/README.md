# Brand Simple — guía de marketing

Fuente de verdad para avatares, anuncios e Instagram de las verticales públicas.
Código de marca: `@simple/config` (`packages/config`) y `BrandLogo` en `@simple/ui`.

## Verticales (Instagram / ads)

| Vertical | Accent | Símbolo propio | Glifo |
|----------|--------|----------------|-------|
| SimpleAutos | `#E84A1F` | Volante | blanco |
| SimplePropiedades | `#4F46E5` | Puerta | blanco |
| SimpleAgenda | `#0F766E` | Calendario con check | blanco |
| SimpleSerenatas | `#E11D48` | Guitarra acústica | blanco |
| SimpleTickets | `#0E7490` | Entrada | blanco |
| SimpleResto | `#F4B400` | Recibo de tres líneas | `#0C0C0E` (negro) |

No usar SimpleAdmin / SimplePlataforma en creatividades públicas salvo campaña de ecosistema explícita.

## Voz

- Español de Chile, directo, sin jerga vacía.
- Una idea por pieza. Beneficio claro > lista de features.
- Marca: “Simple” + vertical (p. ej. SimpleResto). No inventar submarcas.
- Tono: profesional cercano, operativo, confiable. Evitar hype vacío y emojis en cadena.

## Logo e íconos

- **Una sola fuente:** `packages/config/src/brand-vectors.ts` (curvas originales completas, micro y firma). `brand-icon-svg.ts` compone avatares; `BrandLogo` usa esas mismas curvas en cabeceras y pies.
- No crear variantes de logo “solo para redes”. Si cambia el look, se actualiza el SVG oficial.
- Avatares IG: `brand/instagram-profiles/` (preferir export vector 2048×2048).
  - Full-bleed: `ig-profile-{id}.png`
  - Con recuadro (header): `ig-profile-framed-{id}.png`
- Regenerar: `node brand/instagram-profiles/export-vector-avatars.mjs` (requiere `@resvg/resvg-js` y compilar `@simple/config`).

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

## Identidad 05 · 26 de octubre de 2026

Familia aprobada con firma Simple personalizada (i, l y espaciado). Serenatas utiliza una guitarra acústica original, sin nota musical. Maestros SVG en `brand/identity-05/`. El símbolo completo se usa desde 32 px; micro en favicons y cabeceras pequeñas. Conservar proporciones. Resto y Tickets se preparan en código, sin desplegarlos.
