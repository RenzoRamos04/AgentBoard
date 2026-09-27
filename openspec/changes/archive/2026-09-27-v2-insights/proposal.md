# Proposal

## Why

AgentBoard enseña muchas cifras, pero deja al usuario la tarea de descubrir qué significan. Las señales más útiles (el contexto que se desborda, un modelo caro haciendo trabajo sencillo, una herramienta que falla, un pico de gasto) ya se pueden calcular con los datos ingeridos. Una tarjeta «Lo que deberías saber» las pone delante, con un enlace a dónde mirar.

## What Changes

- Módulo `findings` en el núcleo que calcula avisos para el filtro activo, cada uno con tipo, gravedad, parámetros y un texto en español:
  - **Compactaciones**: sesiones con 3 o más compactaciones de contexto.
  - **Modelo caro en tareas sencillas**: coste de turnos de exploración y conversación hechos con un modelo de gama alta y el ahorro estimado con uno más barato.
  - **Herramienta que falla**: herramientas con al menos 20 usos y más de un 10 % de error (con el comando que más falla si es la shell).
  - **Pico de gasto**: un día con más del doble de la media y por encima de media + 2σ.
  - **Caída del cache hit** de más de 3 puntos frente al periodo anterior.
- Tarjeta **Lo que deberías saber** en la portada (junto al gasto diario), con los avisos ordenados por gravedad y un enlace a la vista relacionada. Sin avisos, muestra que todo está en orden.
- Herramienta MCP `get_insights`.

## Capabilities

### New Capabilities
- `insights`: avisos automáticos calculados sobre el filtro activo.

## Impact

- Backend: `src-tauri/src/findings.rs` (nuevo), `commands.rs`, `lib.rs`, `mcp/src/main.rs`.
- Frontend: `lib/api.ts`, `lib/useData.ts`, `views/Insights.tsx` (nuevo), `views/Overview.tsx`, `styles.css`, `i18n.ts`, `dev/mock.ts`.
