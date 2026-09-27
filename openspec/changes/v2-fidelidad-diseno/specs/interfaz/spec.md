# Spec Delta

## ADDED Requirements

### Requirement: Heatmap de actividad
El apartado Heatmap SHALL mostrar el coste del periodo por día de la semana y hora local en una cuadrícula de 7 × 24 con intensidad proporcional al coste, y SHALL destacar la franja (día y hora) de más gasto.

#### Scenario: Franja más cara
- **WHEN** la mayor parte del gasto cae los martes a las 11:00
- **THEN** esa celda es la más intensa y se indica «martes · 11:00» como franja de más gasto

### Requirement: Buscador rápido
La barra superior SHALL ofrecer un buscador que se abre con Ctrl+K (o Cmd+K) o pulsándolo, y que permite saltar a un apartado, filtrar por un solo proyecto o abrir una sesión reciente, eligiendo con el teclado o el ratón. Escape SHALL cerrarlo.

#### Scenario: Ir a un proyecto
- **WHEN** el usuario pulsa Ctrl+K, escribe «tuio» y elige el proyecto tuio-api
- **THEN** el filtro queda solo con tuio-api

### Requirement: Detalles del panel lateral
El panel lateral SHALL mostrar el distintivo «V2», marcar como «nuevo» los apartados añadidos en la V2, incluir Ajustes en el grupo *Configuración* y mostrar al pie cuántos agentes y sesiones se han leído.

#### Scenario: Pie
- **WHEN** hay 6 agentes y 214 sesiones cargadas
- **THEN** el pie muestra «6 agentes · 214 sesiones leídas»

### Requirement: Detalles de la portada
Con la comparación activa, la portada SHALL indicar las fechas del periodo anterior. El KPI del mes SHALL mostrar el porcentaje del presupuesto cuando lo hay. El gasto diario SHALL mostrar eje de importes y el día de mayor gasto. El aviso de modelos sin precio SHALL ir dentro de la tarjeta Top modelos.

#### Scenario: Presupuesto en el KPI
- **WHEN** el gasto del mes es 412,80 USD y el presupuesto 500 USD
- **THEN** el KPI se titula «Mes · 83 % de $500.00»
