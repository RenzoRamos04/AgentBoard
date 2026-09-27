# Proposal

## Why

Con datos reales, la tarjeta «Lo que deberías saber» enseña un solo aviso: los cinco tipos actuales solo buscan problemas graves y varios necesitan semanas de historial. El usuario pide muchos más, para que la tarjeta siempre cuente algo útil sobre su uso.

## What Changes

- Una gravedad nueva, `good`, para lo que va bien, y catorce avisos nuevos:
  - **Concentración**: un proyecto con ≥ 50 % del gasto; un modelo con ≥ 70 %.
  - **Sesión más cara** del periodo, si supone ≥ 20 % del gasto o más de 5 USD.
  - **Modelos sin precio** en el periodo.
  - **Comando de shell que falla**: el comando con más errores (≥ 5 y ≥ 5 % de error).
  - **Servidor MCP que falla**: ≥ 10 usos y > 10 % de error.
  - **Cache hit bajo** en un modelo con ≥ 100 llamadas (< 70 %).
  - **1-shot bajo**: < 80 % con ≥ 20 turnos con ediciones.
  - **Subagentes**: ≥ 20 % del gasto hecho dentro de subagentes.
  - **Ritmo alto**: la última hora cuesta más del doble de la media por hora activa (y más de 1 USD).
  - **Fuera de horario**: ≥ 30 % del gasto antes de las 9 o desde las 19 h (hora local).
  - **Coste por sesión al alza**: > 30 % frente al periodo anterior.
  - **Agentes sin uso**: instalados pero sin llamadas en el periodo.
  - **Ahorro por caché** (`good`): la caché ahorró más de lo que se gastó.
  - **Buen 1-shot** (`good`): ≥ 95 % con ≥ 20 turnos con ediciones.
- La tarjeta enseña los 5 primeros y un botón para ver todos; cada aviso enlaza a su vista (proyecto, sesión, modelo, comando, precios…).

## Capabilities

### Modified Capabilities
- `insights`: nuevos tipos de aviso y gravedad `good`.

## Impact

- Backend: `findings.rs` (avisos nuevos y tests), `commands.rs`/MCP sin cambios de interfaz.
- Frontend: `views/Insights.tsx`, `Overview.tsx`, `App.tsx`, `styles.css`, `i18n.ts`, `dev/mock.ts`.
