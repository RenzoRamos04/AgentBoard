# interfaz Specification

## Purpose
Organiza la ventana de AgentBoard: un panel lateral para navegar, una barra superior con los filtros y una portada que prioriza lo importante.

## Requirements

### Requirement: Panel lateral agrupado
El panel lateral SHALL mostrar el logo de AgentBoard (versión oscura en tema oscuro y clara en tema claro) y los apartados agrupados bajo los encabezados *Coste*, *Trabajo* y *Herramientas*, conservando dentro de cada grupo el orden de apartados de la v0.1 (By Activity pasa a *Trabajo*), con Ajustes al pie. SHALL poder colapsarse a solo iconos y recordar ese estado.

#### Scenario: Tema claro
- **WHEN** el tema activo es claro
- **THEN** el panel muestra la versión clara del logo

#### Scenario: Navegar
- **WHEN** el usuario pulsa «By Model» en el grupo *Coste*
- **THEN** se abre la vista ampliada de By Model y el elemento queda marcado como activo

### Requirement: Barra de filtros
Los filtros SHALL estar en una barra superior común a todas las vistas: periodo (7, 30, 60, 90 días y Todo) como control segmentado, y agentes y proyectos como desplegables con casillas. El desplegable de proyectos SHALL permitir buscar y elegir «solo este proyecto». Los botones SHALL resumir la selección (p. ej. «Agentes · 3 de 6»).

#### Scenario: Ocultar un agente
- **WHEN** el usuario desmarca Codex en el desplegable de agentes
- **THEN** todas las vistas se recalculan sin Codex y el botón muestra «5 de 6»

#### Scenario: Cerrar el desplegable
- **WHEN** el usuario pulsa fuera del desplegable o la tecla Escape
- **THEN** el desplegable se cierra

### Requirement: Indicador en vivo y exportar
La barra SHALL mostrar de forma permanente que los datos están en vivo y cuánto hace de la última relectura, y SHALL ofrecer exportar las llamadas del filtro activo a CSV o JSON.

#### Scenario: Relectura
- **WHEN** el vigilante termina una relectura
- **THEN** el indicador pasa a «hace 0 s» y se resalta brevemente

### Requirement: Portada con jerarquía
La portada SHALL mostrar, en este orden: los KPIs del resumen; el gasto diario apilado por agente junto a By Agent; y Top proyectos, Top modelos y el reparto del coste por actividad, cada uno con enlace a su vista ampliada.

#### Scenario: Ir al detalle
- **WHEN** el usuario pulsa «By Project ›» en la tarjeta Top proyectos
- **THEN** se abre la vista ampliada de By Project

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
