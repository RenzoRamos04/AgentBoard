# Proposal

## Why

La v0.1 mete en el panel lateral la navegación **y** los filtros (periodo, agentes, proyectos), y la portada pinta los 11 apartados a la vez. Con datos reales el lateral se hace largo, los filtros quedan lejos de lo que filtran y el resumen es denso. La propuesta visual de la V2 (lienzo de Claude Design «AgentBoard V2») reorganiza la interfaz sin cambiar la estética: mismo tema oscuro/claro, mismas fuentes y el logo de AgentBoard.

## What Changes

- **Panel lateral agrupado**: logo compacto (versión clara y oscura) y los apartados en grupos *Coste* (Resumen, Daily Activity, By Agent, By Project, By Model), *Trabajo* (By Activity) y *Herramientas* (Tools, Shell Commands, Skills & Agents, MCP Servers, Claude Agent Types), con Ajustes al pie. Sigue siendo colapsable a iconos.
- **Barra de filtros superior**: periodo como control segmentado, agentes y proyectos como desplegables con casillas (y búsqueda / «solo» en proyectos), indicador «En vivo» fijo con la hora de la última relectura y botón de exportar (CSV/JSON).
- **Portada con jerarquía**: KPIs; gasto diario apilado por agente + By Agent; y abajo Top proyectos, Top modelos y reparto por actividad. El resto de apartados se abren desde el lateral.

## Capabilities

### New Capabilities
- `interfaz`: organización de la ventana (panel lateral, barra de filtros y portada).

### Modified Capabilities
- (ninguna: los apartados y filtros existentes mantienen su comportamiento)

## Impact

- Frontend: `App.tsx`, `components/Sidebar.tsx`, `components/Topbar.tsx` (nuevo), `components/Popover.tsx` (nuevo), `views/Overview.tsx`, `lib/sections.ts`, `styles.css`, `lib/i18n.ts`.
- Sin cambios en el backend.
