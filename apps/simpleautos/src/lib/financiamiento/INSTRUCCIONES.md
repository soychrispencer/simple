# Simulador de crédito automotriz — SimpleAutos

Ruta pública: `/simulador-credito-automotriz`

```
src/lib/financiamiento/tasas-referenciales.ts
src/lib/financiamiento/calculadora.ts
src/lib/financiamiento/listing-href.ts
src/components/financiamiento/SimuladorCreditoAuto.tsx
src/app/simulador-credito-automotriz/page.tsx
```

Aliases legacy (solo redirect): `/precalificacion-financiamiento`, `/simulador-financiamiento`.

## Probar

1. `preview.html` en esta carpeta — abrir en el navegador.
2. App: `/simulador-credito-automotriz`
3. Desde una ficha: el CTA pasa `precio`, `anio`, `tipo`, `titulo` y `listingId`.
4. Tests: `calculadora.test.ts` y `listing-href.test.ts`.

## CTA de contacto

Por defecto abre WhatsApp (`wa.me/56978623828`) con el resumen precargado.

Cuando tengas formulario/CRM, pasa `onSolicitar` en `SimuladorCreditoAuto`.

Ajustes de tasa/pie/antigüedad: edita solo `tasas-referenciales.ts`.
