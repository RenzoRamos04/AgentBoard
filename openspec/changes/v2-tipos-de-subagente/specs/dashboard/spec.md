# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Claude Agent Types`
- TO: `### Requirement: Agent Types`

## MODIFIED Requirements

### Requirement: Agent Types
El apartado SHALL agrupar las llamadas hechas dentro de subagentes de cualquier agente (Claude Code, Codex, Gemini CLI, OpenCode, Cursor…) por agente y tipo de subagente, con llamadas y coste, e indicar el agente de cada fila. Los subagentes sin tipo conocido SHALL agruparse como «(sin tipo)».

#### Scenario: Subagente Explore
- **WHEN** un subagente de tipo `Explore` de Claude Code hace 82 llamadas
- **THEN** aparece la fila `Explore` · Claude Code con 82 llamadas y su coste

#### Scenario: Mismo tipo en dos agentes
- **WHEN** Claude Code y OpenCode lanzan subagentes de tipo `general`
- **THEN** aparecen dos filas `general`, una por agente
