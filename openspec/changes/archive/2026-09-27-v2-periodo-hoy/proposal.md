# Proposal

## Why

El usuario quiere ver de un vistazo lo gastado hoy. La spec de filtros ya pedía un periodo «Hoy», pero la app no lo ofrecía, y la misma spec citaba periodos que no existen (Mes, 6 meses, rango personalizado).

## What Changes

- Nuevo periodo **Hoy** (desde las 00:00 locales), el primero del selector; su periodo anterior para comparar es **ayer**.
- El servidor MCP acepta `period: "today"`.
- La spec de filtros pasa a describir los periodos reales: Hoy, 7, 30, 60 y 90 días y Todo.

## Capabilities

### Modified Capabilities
- `filtros`: periodos disponibles.

## Impact

- Frontend: `lib/period.ts` (y sus tests), `i18n.ts`.
- MCP: `mcp/src/main.rs` (periodo y esquema).
