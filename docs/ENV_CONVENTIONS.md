# Convenciones de Archivos `.env`

## Objetivo
Evitar desorden, duplicados y cambios inconsistentes en variables de entorno cuando intervienen múltiples personas o agentes.

## Estructura oficial
- **Secrets reales**: solo en `.env` o `.env.local`.
- **Plantillas sin secretos**: solo en `.env.example` o `.env.local.example`.
- **Apps frontend**: usar `apps/<vertical>/.env.local` para desarrollo local.
- **API backend**: usar `services/api/.env.local` para desarrollo local.  
  **Prioridad**: en `services/api` el proceso carga `.env` y luego `.env.local`; **los valores de `.env.local` ganan**. Así coincide con `drizzle.config.ts` y con `pnpm db:migrate`. Evita tener `DATABASE_URL` distinta en ambos archivos pensando que «una es solo para Drizzle»: la última carga aplicada prevalece; si el orden anterior invertía la precedencia, podías migrar una base y levantar el API contra otra.

## Reglas obligatorias
1. Nunca guardar secretos reales en archivos `*.example`.
2. No crear variantes extra (`.env.cloudflare.example`, `.env.prod.local`, etc.) salvo petición explícita.
3. Mantener siempre el mismo orden por bloques:
   1) Servidor/App  
   2) API/DB  
   3) CORS/Auth  
   4) OAuth  
   5) Storage  
   6) Maps/AI  
   7) Pagos  
   8) Mensajería/Redes  
   9) Flags de bootstrap
4. Una variable debe aparecer una sola vez por archivo.
5. Variables frontend expuestas al navegador deben usar prefijo `NEXT_PUBLIC_`.

## Checklist antes de cerrar una intervención
- [ ] No hay secretos en `*.example`.
- [ ] No hay variables duplicadas en el mismo archivo.
- [ ] El orden de bloques se mantiene.
- [ ] No se creó un nuevo archivo `.env*` innecesario.
- [ ] Si se agrega una variable nueva real, también se documenta en su `*.example` con placeholder.

## Nota práctica
Si cambias una variable `NEXT_PUBLIC_*`, recuerda que en frontend normalmente requiere rebuild/redeploy para reflejarse.
