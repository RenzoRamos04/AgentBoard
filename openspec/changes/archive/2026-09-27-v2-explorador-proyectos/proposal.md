# Proposal

## Why

Al usar el explorador de sesiones con datos reales, el usuario prefiere la misma vista **por proyecto**: con decenas de sesiones cortas la lista se vuelve ruido, y la pregunta habitual es «¿qué proyecto se lleva el gasto y por qué?». Además, en ventanas estrechas la tabla de sesiones se sale por la derecha.

## What Changes

- Nuevo apartado **Proyectos** (grupo *Trabajo*) que sustituye a Sesiones en el panel lateral, con la misma estructura:
  - Cifras: coste medio por proyecto, proyecto más caro, tiempo activo total y proyectos con compactaciones.
  - Búsqueda (proyecto, rama, modelo o agente) y vistas rápidas: *Todos*, *Más caros*, *Con compactación*, *Con subagentes*.
  - Tabla ordenable: proyecto (y ruta), agentes, ramas, modelo principal, sesiones, tiempo activo, turnos, compactaciones, cache hit y coste.
- **Detalle de proyecto** al pulsar una fila: KPIs, coste acumulado por día, coste por actividad, modelos, ramas, las sesiones del proyecto (cada una abre su detalle de sesión) y herramientas con latencia p50/p95.
- Los enlaces que llevaban a Sesiones (avisos, buscador) llevan a Proyectos o a la sesión concreta.
- Las tablas del explorador ya no se salen por la derecha en ventanas estrechas.
- MCP: herramientas `get_projects` y `get_project_detail`.

## Capabilities

### New Capabilities
- `proyectos`: explorador y detalle por proyecto.

## Impact

- Backend: `sessions.rs` (clave de proyecto en las sesiones, listado y detalle por proyecto), `commands.rs`, `lib.rs`, `mcp/src/main.rs`.
- Frontend: `views/Projects.tsx` y `views/ProjectDetail.tsx` (nuevos), `Sessions.tsx`, `SessionDetail.tsx`, `App.tsx`, `sections.ts`, `Insights.tsx`, `CommandPalette.tsx`, `api.ts`, `styles.css`, `i18n.ts`, `dev/mock.ts`.
