# Spec Delta

## ADDED Requirements

### Requirement: Preferencias de avisos
El usuario SHALL poder activar o desactivar por separado los avisos del 80 % y del 100 % de los presupuestos, y elegir si la bandeja muestra el gasto de hoy además del del mes. MUST persistir en `settings.json`; por defecto ambos avisos están activos y la bandeja muestra solo el mes.

#### Scenario: Sin aviso del 80 %
- **WHEN** el usuario desactiva el aviso del 80 % y un presupuesto llega al 85 %
- **THEN** no se notifica

#### Scenario: Gasto de hoy en la bandeja
- **WHEN** el usuario activa «Mostrar el gasto de hoy en la bandeja»
- **THEN** el texto de la bandeja incluye el gasto del día
