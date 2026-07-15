# Simuladores compartidos — SimpleAutos + SimplePropiedades

Paquete: `@simple/simulador-ui` (`packages/simulador-ui`)

- Tokens: `formatCLP`, `formatPct`, `formatUF`, `cuotaFrancesa`, `anualATasaMensual`
- UI: campos, panel principal, escenarios, shell `marketplace-flow`

## Apps

| App | Ruta | Lógica |
|---|---|---|
| SimpleAutos | `/simulador-credito-automotriz` | `src/lib/financiamiento/*` |
| SimplePropiedades | `/simulador-hipotecario` | `src/lib/hipotecario/*` |

Ambas usan estilos del design system del monorepo (`marketplace-flow-*`, `form-input`, tokens CSS).

## Instalar

Ya está en `pnpm-workspace.yaml` (`packages/*`). Tras agregar el paquete:

```bash
pnpm install
```

Dependencia en cada app: `"@simple/simulador-ui": "workspace:*"`.

## CTA

WhatsApp por defecto. Conecta CRM/formulario con la prop `onSolicitar` de cada componente.

## UF hipotecaria

Constante `VALOR_UF_REFERENCIAL` en `lib/hipotecario/tasas-referenciales.ts`, o prop `valorUF` en `<SimuladorHipotecario />`.
