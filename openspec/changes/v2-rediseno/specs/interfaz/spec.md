# Spec Delta

## Purpose

Organiza la ventana de AgentBoard: un panel lateral para navegar, una barra superior con los filtros y una portada que prioriza lo importante.

## ADDED Requirements

### Requirement: Panel lateral agrupado
El panel lateral SHALL mostrar el logo de AgentBoard (versión oscura en tema oscuro y clara en tema claro) y los apartados agrupados bajo los encabezados *Coste*, *Trabajo* y *Herramientas*, conservando el orden de apartados de la v0.1, con Ajustes al pie. SHALL poder colapsarse a solo iconos y recordar ese estado.

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
