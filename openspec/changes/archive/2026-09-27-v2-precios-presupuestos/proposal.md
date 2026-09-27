# Proposal

## Why

Los precios están fijos en el código: cuando sale un modelo nuevo o cambia una tarifa, sus llamadas cuentan como 0 $ hasta publicar otra versión, y no hay forma de verlo ni de corregirlo desde la app. Además el único presupuesto es el mensual global; no se puede acotar un proyecto, un agente o el gasto de un día.

## What Changes

- Nuevo apartado **Precios y presupuestos** (grupo *Configuración* del panel lateral).
- **Precios por modelo editables**: tabla con los modelos usados en el periodo (primero los que no tienen precio) y sus precios de entrada, salida y caché; origen de cada precio (*por defecto*, *editado*, *coste del agente*, *falta precio*); añadir un modelo, editar, restablecer al valor por defecto. Los cambios se guardan en `settings.json` y recalculan todos los costes al momento, sin releer logs. El servidor MCP también los aplica.
- **Aviso de modelos sin precio** en la portada con enlace a completarlos.
- **Presupuestos**: mensual (el actual), diario, y mensuales por proyecto o por agente, con su barra de progreso. Los avisos del sistema (80 % y 100 %) cubren todos.
- El presupuesto sale del diálogo de Ajustes (se edita en el apartado nuevo).

## Capabilities

### Modified Capabilities
- `precios-modelos`: precios editables por el usuario.
- `ajustes`: presupuesto diario y presupuestos por proyecto y agente.

## Impact

- Backend: `settings.rs` (campos nuevos, validación), `pricing.rs` (aplicar precios del usuario, listado de precios), `alerts.rs` (avisos de todos los presupuestos), `queries.rs` (factor de proyección del mes), `commands.rs`, `lib.rs`, `mcp/src/main.rs`.
- Frontend: `views/Pricing.tsx` (nuevo), `lib/api.ts`, `lib/sections.ts`, `Sidebar.tsx`, `Overview.tsx`, `SettingsDialog.tsx`, `App.tsx`, `styles.css`, `i18n.ts`, `dev/mock.ts`.
