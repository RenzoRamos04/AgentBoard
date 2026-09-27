# Proposal

## Why

Al abrir la app, el usuario vio que no todo coincide con el lienzo de diseño aprobado («AgentBoard V2» en Claude Design). Faltan piezas del diseño —el Heatmap, el buscador Ctrl+K, las casillas de avisos— y hay pantallas que se parecen pero no son iguales.

## What Changes

- **Panel lateral**: distintivo «V2» junto al nombre; etiqueta «nuevo» en Sesiones, Heatmap y Precios y presupuestos; Ajustes dentro del grupo *Configuración*; pie con «Local · en memoria» y «N agentes · M sesiones leídas».
- **Heatmap** (grupo *Trabajo*): coste por día de la semana y hora local, con la franja de más gasto.
- **Buscador Ctrl+K** en la barra superior: salta a un apartado, a un proyecto (solo ese proyecto) o a una sesión reciente.
- **Resumen**: etiqueta «Comparando con …» con las fechas del periodo anterior; KPI del mes como «Mes · 83 % de $500» con la proyección; eje de importes y el pico marcado en el gasto diario; aviso de modelos sin precio dentro de la tarjeta Top modelos; Top proyectos con barra y variación por fila.
- **Sesiones**: cifras del listado en tarjetas compactas (etiqueta y valor en una línea).
- **Detalle de sesión**: nota que compara el coste por turno antes y después de la tercera compactación.
- **Precios y presupuestos**: botón «Completar precios» en el aviso (lleva al primer modelo sin precio), «Importar JSON» y «Restaurar valores por defecto»; casillas de avisos (80 %, 100 % y gasto de hoy en la bandeja).

## Capabilities

### Modified Capabilities
- `interfaz`: panel lateral, buscador, heatmap y ajustes de la portada.
- `ajustes`: preferencias de avisos y de la bandeja.

## Impact

- Backend: `settings.rs` (avisos y bandeja), `alerts.rs`.
- Frontend: `Sidebar.tsx`, `Topbar.tsx`, `CommandPalette.tsx` y `views/Heatmap.tsx` (nuevos), `Overview.tsx`, `panels.tsx`, `Charts.tsx`, `Sessions.tsx`, `SessionDetail.tsx`, `Pricing.tsx`, `App.tsx`, `sections.ts`, `styles.css`, `i18n.ts`.
