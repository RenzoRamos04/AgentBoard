# Proposal

## Why

Una cifra suelta («$412.80 en 30 días») no dice si vas mejor o peor. Para decidir hace falta la referencia: el mismo tramo inmediatamente anterior. Es la primera mejora de la V2 que pide el estudio y apenas cuesta: reutiliza las consultas existentes con otro rango.

## What Changes

- Interruptor **«Comparar con periodo anterior»** en la barra de filtros (recordado en el equipo). Desactivado con el periodo «Todo», que no tiene anterior.
- Los KPIs del resumen muestran la variación: coste, sesiones y ahorro en %, cache hit en puntos porcentuales, con color según si el cambio es bueno o malo.
- El gráfico de gasto diario superpone el periodo anterior como línea discontinua, alineada día a día.
- Top proyectos añade la variación de coste de cada proyecto.

## Capabilities

### New Capabilities
- `comparacion-periodos`: comparación de las cifras del filtro con el periodo inmediatamente anterior.

## Impact

- Frontend: `lib/period.ts` (rango anterior), `lib/useData.ts`, `components/Topbar.tsx`, `components/Kpis.tsx`, `components/Charts.tsx` (línea de comparación en columnas), `views/Overview.tsx`, `views/panels.tsx`, `lib/i18n.ts`.
- Sin cambios en el backend: las consultas ya aceptan cualquier rango `from`/`to`.
