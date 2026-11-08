# SimpleAgenda — identidad visual

Esta guía fija la identidad elegida para la web, el panel, las reservas y la
publicidad. SimpleAgenda combina una agenda digital clara con una señal visual
propia: teal profundo, lima y una ilustración híbrida de profesional más
mascota-calendario.

## Paleta

| Token | Hex | Función |
|---|---:|---|
| Teal profundo | #002E32 | Estructura, superficies de marca e icono del logo. |
| Lima | #B8DB3A | CTA principal, selección, foco y énfasis puntual. |
| Papel | #FAFAFA | Lienzo claro. |
| Blanco | #FFFFFF | Tarjetas, superficies y cuerpo de la mascota. |
| Tinta | #0E0E10 | Texto principal y lienzo oscuro. |
| Carbón | #343434 / #1C1C1C | Superficies elevadas en modo oscuro. |
| Ceniza | #D9D9D9 | Bordes y separación neutra. |

Los estados de éxito, error, advertencia, pagos y marcas externas mantienen sus
colores semánticos. No los reemplazar con lima.

Los textos e iconos de acento usan `--accent-ink`; las superficies de marca
conservan `--accent-surface` teal. Los CTA principales usan lima con texto tinta
en ambos temas, mediante los tokens de acción de SimpleAgenda.

## Distribución por tema

En modo claro predominan papel, blanco y tinta. El teal ancla la marca en
superficies puntuales; la lima identifica el CTA principal y estados activos.
Como orientación, usar 65–75% de neutros, 15–25% de teal y 5–10% de lima.

En modo oscuro, el lienzo permanece negro/tinta y las superficies carbón. Teal y
lima conservan sus funciones: el teal ancla bloques de marca y superficies
destacadas; la lima señala CTA principal, selección, foco y datos decisivos. Se
invierten los neutros, no los roles de los colores. No convertir el fondo ni
grandes secciones del panel en superficies verdes.

La publicidad puede invertir la proporción: alternar piezas de fondo claro y
teal/tinta, con lima para una frase o dato principal. Evitar varios bloques
grandes de lima juntos.

## Marca e ilustración

- El logo usa un tile lima, símbolo de calendario teal profundo y wordmark
  adaptable al fondo: tinta sobre claro, blanco sobre oscuro.
- El motivo ilustrado une a una profesional con una mascota-calendario que
  representa el paso de horario disponible a reserva confirmada.
- Conservar el trazo negro expresivo, el cuerpo blanco del calendario, ropa o
  teléfono teal y detalles lima en anillas, horario elegido y check.
- Las ilustraciones deben tener fondo transparente. No colocarles una placa
  blanca rectangular cuando se integren sobre el héroe o una sección de color.
- Usar una ilustración protagonista en portada y piezas de campaña. En el
  producto, reservar la mascota para bienvenida, estados vacíos y confirmación;
  no repetirla en cada panel ni sustituir iconos funcionales.
- Mantener a la profesional y a la mascota con la misma línea, contorno,
  proporciones y paleta en nuevas poses. Evitar personajes de estilos mixtos.

## Tipografía

- Instrument Sans para titulares, cifras editoriales y horas protagonistas.
- El wordmark usa texto editable en Instrument Sans Bold para “Simple” e Instrument Sans Regular para cada vertical.
- Inter para navegación, párrafos, controles, etiquetas y texto de producto.
- Usar las familias ya compartidas por el sistema Simple. No incorporar una
  tercera fuente para SimpleAgenda.

## Aplicación por superficie

| Superficie | Tratamiento |
|---|---|
| Landing | Teal como bloque de marca, texto blanco y lima en la idea y la acción principal. Ilustración híbrida con fondo transparente. |
| Panel | Neutros en modo claro; negro y carbón en modo oscuro. CTA y selección en lima; teal en superficies destacadas y estructura. |
| Reserva pública SimpleAgenda | CTA, horario seleccionado y confirmación en lima; en oscuro, negro/carbón con la misma jerarquía. |
| Sitio público del profesional | El acento automático hereda el teal de SimpleAgenda. Si el profesional elige un color, se respeta su elección. |
| Onboarding y estados vacíos | Una mascota-calendario pequeña y contextual, acompañada de una acción clara cuando corresponda. |
| Publicidad | Titular directo, prueba del producto y CTA. Alternar fondos claros y oscuros; usar el personaje híbrido como firma propia. |
| Autenticación y recuperación | Mismos neutros, logo y jerarquía tipográfica; mantener el formulario como foco. |

## Composición y uso

- Priorizar espacio, alineaciones precisas, bordes suaves y una jerarquía clara.
- Mantener el mismo radio y ritmo de espaciado entre header, tarjetas y
  controles; usar tamaños compactos en el panel y más aire en marketing.
- En móvil, conservar titular, CTA y personaje sin encogerlos dentro de una
  cuadrícula apretada.
- Usar teal para superficies de marca puntuales; no pintar cada tarjeta.
- Reservar lima para los énfasis descritos, no como sustituto permanente del
  teal.
- No añadir beige, morado, coral, degradados, glow, glassmorphism, fotografía
  en blanco y negro como tratamiento general ni ilustraciones genéricas.

## Fuentes de implementación

- Tokens de la app: apps/simpleagenda/src/app/globals.css.
- Landing y estados por tema: apps/simpleagenda/src/app/agenda-landing.css y
  apps/simpleagenda/src/app/agenda-reservation.css.
- Identidad del panel: apps/simpleagenda/src/app/panel/panel-identity.css.
- Logo y aplicaciones de marca: brand/identity-05/simpleagenda/ y
  apps/simpleagenda/public/.
- Carrusel editable de Instagram: brand/ads/simpleagenda/2026-08-deja-whatsapp/
  create_identity_carousel.jsx; el AI editable y sus tres exportaciones quedan
  en `G:/Mi unidad/Simple/Publicidad/SimpleAgenda/01 Lanzamiento Instagram/04 Identidad final/Identidad consolidada final 2026-11-07`.
- Acento de marca y favicon: packages/config/src/index.ts,
  packages/config/src/brand-vectors.ts y
  packages/ui/src/brand/brand-logo.tsx.
- Sitios públicos profesionales: packages/ui/src/operator-site/agenda-operator-site.tsx.
