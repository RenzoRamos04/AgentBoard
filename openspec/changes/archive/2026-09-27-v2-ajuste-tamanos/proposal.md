# Proposal

## Why

Con la app abierta a 1280 px el usuario ve tarjetas de alturas distintas en la misma fila, tarjetas estiradas con huecos vacíos y controles (botones, pestañas, desplegables, campos) de tamaños diferentes. La interfaz tiene que verse ordenada y uniforme.

## What Changes

- **Sistema de tamaños** común: todos los controles (botones, botones de filtro, desplegables, campos, buscadores y controles segmentados/pestañas) comparten altura (34 px), radio (8 px), relleno y tamaño de letra; los campos dentro de tablas usan una variante compacta.
- **Tarjetas**: las de una misma fila tienen la misma altura; la tarjeta del gasto diario y la de avisos de la portada tienen altura fija (el gráfico ocupa su espacio y los avisos se desplazan dentro); ninguna tarjeta se estira más que su fila.
- **KPIs**: etiqueta en una sola línea, valor alineado en todas; en ventanas estrechas pasan a 3 columnas.
- **Pestañas y textos**: ninguna pestaña, botón o etiqueta se parte en dos líneas; los controles de una cabecera de tarjeta bajan de línea antes que salirse.
- **Precios y presupuestos**: la tabla nunca se sale de su tarjeta (en ventanas estrechas los presupuestos van debajo); barras de presupuesto con el texto en una línea y «Quitar» alineado.
- **Panel lateral**: nombre corto «Precios» para que no se corte.

## Capabilities

### Modified Capabilities
- `interfaz`: consistencia de tamaños.

## Impact

- Frontend: `styles.css` (principalmente), `Overview.tsx`, `Insights.tsx`, `sections.ts`, `Sidebar.tsx`, `Pricing.tsx`, `dev/mock.ts`.
