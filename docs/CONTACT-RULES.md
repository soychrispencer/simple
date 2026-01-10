# Regla de contacto segura

Principio
- Nunca exponer datos privados de `profiles` en botones de contacto.
- Fuentes válidas: chat interno (`messages`) o campos explícitos del listing (`contact_email`, `contact_phone`, `contact_whatsapp`) y de `public_profiles`.

Checklist frontend
- Usar `contact_*` del listing; fallback a `public_profiles.contact_*`.
- Evitar `profiles.phone/email` en cards, sliders, modales.
- En enlaces de perfil, usar slug/username, pero no datos de contacto privados.

Checklist backend
- RLS: `profiles` no debe exponerse para contacto.
- Asegurar consultas de listings incluyan solo `contact_*` y `public_profiles` para datos visibles.
- No incluir `profiles.phone/email` en endpoints públicos.

Siguiente paso
- Revisar componentes de contacto y reemplazar lecturas de `profiles` por `contact_*` / `public_profiles`.
