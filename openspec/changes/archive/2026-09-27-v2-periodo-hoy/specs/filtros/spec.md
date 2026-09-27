# Spec Delta

## REMOVED Requirements

### Requirement: Periodos
**Reason**: describía periodos que la app nunca ofreció (Mes, 6 meses, rango personalizado) y omitía los de 60 y 90 días.
**Migration**: sustituido por «Periodos disponibles», con los periodos reales y el nuevo «Hoy».

## ADDED Requirements

### Requirement: Periodos disponibles
El sistema SHALL ofrecer los periodos Hoy, 7 días, 30 días, 60 días, 90 días y Todo, calculados en la zona horaria local: cada periodo de N días incluye hoy y los N − 1 días anteriores desde las 00:00 locales. El periodo anterior de «Hoy», para comparar, SHALL ser ayer.

#### Scenario: Periodo "Hoy"
- **WHEN** el usuario elige "Hoy" a las 15:00 hora local
- **THEN** se incluyen las llamadas desde las 00:00 locales de hoy

#### Scenario: Comparar hoy con ayer
- **WHEN** el periodo es "Hoy" y la comparación está activa
- **THEN** las variaciones se calculan frente a ayer, de 00:00 a 24:00 locales

#### Scenario: Periodo "Hoy" por MCP
- **WHEN** un agente llama a una herramienta con `period: "today"`
- **THEN** recibe solo los datos desde las 00:00 locales de hoy
