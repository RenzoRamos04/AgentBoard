# Proposal

## Why

Al usuario no le convence la tarjeta «Lo que deberías saber»: los avisos basados en reglas fijas le parecen textos pre-escritos. Prefiere que ese hueco de la portada muestre algo que se lea de un vistazo y siempre esté vivo: lo que está pasando hoy.

## What Changes

- Se quita de la portada la tarjeta «Lo que deberías saber» (y su código en la interfaz). El cálculo de avisos se conserva en el servidor MCP (`get_insights`), donde lo consultan los agentes.
- Nueva tarjeta **Hoy en directo** en su lugar, independiente del periodo elegido (respeta los filtros de agentes y proyectos):
  - Gasto de hoy y variación frente a **ayer a la misma hora**.
  - Ritmo de la última hora (USD/h).
  - Mini gráfico del gasto por hora de hoy.
  - Sesión activa ahora (actividad en los últimos 15 min) o la última de hoy, con su proyecto, rama, agente y coste, y enlace a su detalle.
  - Se actualiza en vivo con cada relectura de los logs.

## Capabilities

### Modified Capabilities
- `insights`: la tarjeta de la portada desaparece; los avisos quedan para el MCP.
- `interfaz`: tarjeta «Hoy en directo».

## Impact

- Frontend: `views/TodayLive.tsx` (nuevo), `Overview.tsx`, `App.tsx`, `lib/useData.ts`, `lib/api.ts`; se borran `views/Insights.tsx` y sus tests.
- Backend: se quita el comando Tauri `get_insights` (sin uso); `findings.rs` y la herramienta MCP se mantienen.
