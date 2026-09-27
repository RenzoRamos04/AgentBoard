# Proposal

## Why

Todo AgentBoard es agregado: se ve que un proyecto costó 168 $, pero no se puede llegar a *la sesión* que se disparó ni entender por qué. Los datos para hacerlo ya se ingieren y no se muestran: sesiones con inicio/fin y rama, turnos, compactaciones de contexto (`events`) y la duración de cada herramienta (`tool_calls.duration_ms`).

## What Changes

- Nuevo apartado **Sesiones** (grupo *Trabajo*): tabla ordenable de las sesiones del filtro con inicio, agente, proyecto · rama, modelo principal, duración, turnos, compactaciones, cache hit y coste; búsqueda por texto y vistas rápidas (*Todas*, *Más caras*, *Con compactación*, *Con subagentes*). Cuatro cifras arriba: mediana y p95 de coste por sesión, duración media y sesiones con compactaciones.
- **Detalle de sesión** al pulsar una fila: KPIs de la sesión, coste acumulado con las compactaciones marcadas, coste por actividad, tabla de turnos (hora, actividad, herramientas, tokens, coste) y herramientas con usos, % de error y latencia p50/p95.
- Servidor MCP: herramientas `get_sessions` y `get_session_detail`.

## Capabilities

### New Capabilities
- `sesiones`: listado y detalle de sesiones.

## Impact

- Backend: `src-tauri/src/sessions.rs` (nuevo), `commands.rs`, `lib.rs`, `mcp/src/main.rs`.
- Frontend: `lib/api.ts`, `lib/sections.ts`, `views/Sessions.tsx` y `views/SessionDetail.tsx` (nuevos), `App.tsx`, `Icons.tsx`, `styles.css`, `i18n.ts`, `dev/mock.ts`.
- Sin cambios de esquema: todo sale de tablas existentes.
