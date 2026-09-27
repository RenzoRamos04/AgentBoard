# Proposal

## Why

El apartado se llama «Claude Agent Types», pero AgentBoard ya ingiere subagentes de Claude Code, Codex, Gemini CLI, OpenCode y Cursor, y los mezcla sin decir de qué agente es cada tipo. El nombre engaña y el desglose pierde información.

## What Changes

- El apartado pasa a llamarse **Agent Types** y responde «¿Cuánto cuestan los subagentes de cada agente?».
- El desglose agrupa por agente y tipo de subagente (una fila por par), con la columna del agente con su color; los subagentes sin tipo conocido aparecen como «(sin tipo)».
- Herramienta MCP `get_agent_types`: misma agrupación, con el id del agente en cada fila.

## Capabilities

### Modified Capabilities
- `dashboard`: «Claude Agent Types» pasa a «Agent Types», de todos los agentes.

## Impact

- Backend: `insights.rs` (`agent_types`), `queries.rs` (`BreakdownRow.agent`), `mcp/src/main.rs`.
- Frontend: `lib/sections.ts`, `lib/api.ts`, `views/panels.tsx`, `views/sections.tsx`, `i18n.ts`, `dev/mock.ts`, documentación.
