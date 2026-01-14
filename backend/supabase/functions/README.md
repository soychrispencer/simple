# Supabase Edge Functions (Deno)

Este directorio está reservado para **Supabase Edge Functions**.

## Estado actual

- Por ahora no hay funciones implementadas (no hay subcarpetas con código).
- Solo existen archivos de configuración para Deno (`deno.json`, `import_map.json`).

## ¿Cuándo se usa?

- Cuando necesites lógica server-side desplegable en Supabase (webhooks, jobs simples, endpoints internos, integraciones).

## Crear una función

Desde la raíz del repo:

- `cd backend/supabase`
- `supabase functions new <nombre>`

Eso creará una carpeta en `backend/supabase/functions/<nombre>/`.

## Deploy

- `cd backend/supabase`
- `supabase functions deploy <nombre>`

Nota: el deploy depende de tu login/link de Supabase y de permisos en el proyecto.
