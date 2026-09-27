# Spec Delta

## Purpose

Pone cada cifra del filtro en contexto comparándola con el periodo de la misma duración inmediatamente anterior.

## ADDED Requirements

### Requirement: Periodo anterior
Para un periodo de N días que empieza en el día D, el periodo anterior SHALL ser los N días que terminan justo antes de D, con los mismos agentes y proyectos del filtro. El periodo «Todo» no SHALL tener periodo anterior.

#### Scenario: 30 días
- **WHEN** el periodo es de 30 días y empieza el 29 de agosto
- **THEN** el periodo anterior va del 30 de julio al 28 de agosto, ambos incluidos

#### Scenario: Todo
- **WHEN** el periodo es «Todo»
- **THEN** no se muestra ninguna comparación y el interruptor queda desactivado

### Requirement: Interruptor de comparación
La barra de filtros SHALL ofrecer un interruptor «Comparar con periodo anterior» cuyo estado se recuerde entre sesiones en el mismo equipo.

#### Scenario: Desactivar
- **WHEN** el usuario apaga el interruptor
- **THEN** desaparecen las variaciones y la línea del periodo anterior

### Requirement: Variación en los KPIs
Con la comparación activa, los KPIs de coste, sesiones y ahorro por caché SHALL mostrar la variación relativa (%) y el cache hit la diferencia en puntos porcentuales. La variación SHALL marcarse como desfavorable cuando sube el coste o baja el cache hit o el ahorro, y como favorable en el caso contrario. Si el valor anterior es 0, SHALL mostrarse «nuevo» en lugar de un porcentaje.

#### Scenario: Coste al alza
- **WHEN** el coste pasa de 100 USD a 118 USD
- **THEN** el KPI de coste muestra «▲ 18%» como desfavorable

#### Scenario: Cache hit
- **WHEN** el cache hit pasa de 97,6 % a 96,4 %
- **THEN** el KPI muestra «▼ 1.2 pp» como desfavorable

### Requirement: Línea del periodo anterior
Con la comparación activa, el gráfico de gasto diario de la portada SHALL superponer el coste diario del periodo anterior como línea discontinua, alineando el día i del periodo con el día i del anterior.

#### Scenario: Tooltip
- **WHEN** el usuario pasa el ratón por un día
- **THEN** el tooltip incluye el coste del día equivalente del periodo anterior

### Requirement: Variación por proyecto
Con la comparación activa, la tarjeta Top proyectos SHALL mostrar la variación de coste de cada proyecto respecto al periodo anterior.

#### Scenario: Proyecto nuevo
- **WHEN** un proyecto no tuvo coste en el periodo anterior
- **THEN** su variación es «nuevo»
