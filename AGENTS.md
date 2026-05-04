# Reglas rápidas para agentes: `.env`

1. **Secrets reales** solo en `.env` / `.env.local`.
2. En `*.example` usar placeholders, nunca credenciales reales.
3. Mantener el orden estándar de bloques definido en `docs/ENV_CONVENTIONS.md`.
4. No crear nuevos archivos `.env*` sin necesidad explícita.
5. Si agregas una variable nueva en un `.env` real, reflejarla también en su `*.example`.
