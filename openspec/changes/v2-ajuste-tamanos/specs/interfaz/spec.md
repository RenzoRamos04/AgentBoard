# Spec Delta

## ADDED Requirements

### Requirement: Consistencia de tamaños
Todos los controles interactivos (botones, botones de filtro, desplegables, campos de texto, buscadores y controles segmentados) SHALL compartir altura, radio de esquina y tamaño de letra, salvo los campos dentro de tablas, que usan una variante compacta común. Ningún control ni etiqueta SHALL partirse en dos líneas.

#### Scenario: Barra de herramientas
- **WHEN** una barra combina un buscador, un botón y un control segmentado
- **THEN** los tres tienen la misma altura

### Requirement: Tarjetas ordenadas
Las tarjetas de una misma fila SHALL tener la misma altura, y ninguna SHALL mostrar un hueco vacío por estirarse a la altura de otra: el contenido que crece (gráficos) ocupa el espacio y el que sobra (listas largas) se desplaza dentro de la tarjeta. A partir de 1280 px de ancho ninguna tabla SHALL salirse de su tarjeta.

#### Scenario: Portada
- **WHEN** la tarjeta de avisos tiene diez avisos
- **THEN** mantiene la altura de la tarjeta del gasto diario y sus avisos se desplazan dentro

### Requirement: KPIs alineados
En cada fila de KPIs, las etiquetas SHALL ocupar una sola línea y los valores SHALL quedar a la misma altura; en ventanas de menos de 1400 px los seis KPIs del resumen SHALL repartirse en dos filas de tres.

#### Scenario: Ventana estrecha
- **WHEN** la ventana mide 1280 px
- **THEN** los KPIs del resumen se ven en dos filas de tres con las etiquetas completas
