# SimpleSerenatas — MVP, alcance y gobernanza

## Frase de MVP (coordinador primero)

> Un coordinador con cuadrilla puede ver las solicitudes del día, asignarlas a un grupo, abrir el seguimiento de cada serenata y usar rutas/mapa desde el móvil, sin depender de chat, suscripción ni finanzas avanzadas en la barra inferior.

## Piloto

- **Pablo** (músico / trompetista, referencia de dominio).
- **+1 coordinador** cuando el flujo básico esté estable en staging.

## Regla WIP

- **Una** historia en progreso a la vez.
- No nuevas pantallas fuera del alcance MVP hasta cerrar el flujo anterior.

## Definition of Done (por historia)

1. Camino feliz probado en **viewport móvil** (Chrome devtools o dispositivo real).
2. Sin **500** en el flujo principal del API en el entorno de prueba.
3. Migraciones aplicadas en ese entorno (`pnpm db:migrate` desde `services/api` según [DATABASE_SETUP.md](./DATABASE_SETUP.md)).

## Superficie producto MVP (coordinador)

Ver navegación en `apps/simpleserenatas/src/components/layout/panel-nav-config.ts`: barra inferior e ítems visibles alineados a este documento.

## Fuera de alcance MVP (no bloquea el piloto)

- Chat en panel coordinador.
- Suscripción en panel coordinador (reactivar según [SERENATAS_POST_MVP.md](./SERENATAS_POST_MVP.md)).
- Optimización automática de rutas “tipo OR-Tools” (iteración posterior).
