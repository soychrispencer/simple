# SimplePlataforma

App mínima para soportar autenticación unificada cuando Supabase redirige al dominio padre.

- Ruta importante: `/auth/confirm`
- Preserva `location.search` + `location.hash` y redirige a una vertical (por defecto `https://simpleautos.app`).

Cuando exista la landing real y `admin.simpleplataforma.app`, esta app puede crecer o ser reemplazada.
