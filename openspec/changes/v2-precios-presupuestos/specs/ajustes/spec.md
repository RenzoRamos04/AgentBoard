# Spec Delta

## ADDED Requirements

### Requirement: Presupuesto diario
El usuario SHALL poder fijar un presupuesto diario en USD (o dejarlo vacío), comparado con el gasto del día local en curso de todos los agentes y proyectos; MUST persistir en `settings.json`.

#### Scenario: Aviso diario
- **WHEN** el presupuesto diario es 30 USD y el gasto de hoy llega a 24 USD
- **THEN** se notifica una vez que se ha llegado al 80 % del presupuesto diario

### Requirement: Presupuestos por proyecto y por agente
El usuario SHALL poder añadir y quitar presupuestos mensuales para un proyecto (identificado por la raíz de su repositorio) o para un agente, comparados con la proyección del mes de ese proyecto o agente. MUST persistir en `settings.json` y los importes MUST ser mayores que 0.

#### Scenario: Presupuesto de un agente
- **WHEN** Codex tiene un presupuesto de 60 USD y su proyección del mes es 58 USD
- **THEN** el apartado muestra la barra de Codex al 96 % y se notifica el 80 %

### Requirement: Avisos de todos los presupuestos
Cada presupuesto (mensual, diario, por proyecto y por agente) SHALL notificar como mucho una vez por sesión de la app al llegar al 80 % y otra al llegar al 100 %; al cambiar los presupuestos, los avisos se rearman.

#### Scenario: Sin repetir
- **WHEN** tras avisar del 80 % de un presupuesto se vuelve a releer los logs sin cambios en los ajustes
- **THEN** no se repite el aviso
