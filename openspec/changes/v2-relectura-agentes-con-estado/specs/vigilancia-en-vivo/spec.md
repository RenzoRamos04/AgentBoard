# Spec Delta

## ADDED Requirements

### Requirement: Agentes con estado entre líneas
La relectura en vivo SHALL funcionar igual para todos los agentes, incluidos aquellos cuyo log solo identifica la sesión en sus primeras líneas (Codex, Gemini CLI, Cursor, Copilot): si el sistema no conserva el estado de lectura de un archivo, SHALL releerlo desde el principio sin duplicar datos.

#### Scenario: Codex con la app abierta
- **WHEN** se inicia una sesión de Codex CLI con AgentBoard ya abierto y el agente sigue escribiendo en su log
- **THEN** la sesión y sus llamadas aparecen en la app sin reiniciar, y cada nueva llamada se añade en la siguiente relectura

#### Scenario: Sin duplicados al releer desde el principio
- **WHEN** un archivo de Codex ya leído en parte se relee desde el principio
- **THEN** cada llamada sigue contando una sola vez
