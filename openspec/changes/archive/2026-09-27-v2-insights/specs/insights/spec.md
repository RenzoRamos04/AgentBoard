# Spec Delta

## Purpose

Detecta y explica patrones de coste y fricción en el uso de los agentes, para que el usuario sepa dónde mirar.

## ADDED Requirements

### Requirement: Avisos del filtro
El sistema SHALL calcular avisos para el filtro activo. Cada aviso MUST tener un tipo, una gravedad (`critical`, `warn` o `info`), parámetros para componer el texto en cualquier idioma y un texto en español. Los avisos SHALL devolverse ordenados por gravedad.

#### Scenario: Sin nada que avisar
- **WHEN** ningún patrón supera su umbral
- **THEN** la lista de avisos está vacía

### Requirement: Compactaciones
El sistema SHALL avisar con gravedad `critical` si hay sesiones con 3 o más compactaciones de contexto en el filtro, indicando cuántas y el proyecto y rama de la que más tiene.

#### Scenario: Contexto desbordado
- **WHEN** dos sesiones tienen 4 y 3 compactaciones
- **THEN** hay un aviso «2 sesiones con 3+ compactaciones» con el proyecto de la de 4

### Requirement: Modelo caro en tareas sencillas
El sistema SHALL sumar el coste de los turnos de exploración y conversación cuyo modelo dominante es de gama alta (Opus o Fable) y estimar el ahorro si se hubieran hecho con `claude-sonnet-5`, en proporción al precio de entrada. SHALL avisar con gravedad `warn` si el ahorro estimado supera 1 USD.

#### Scenario: Exploración con Opus
- **WHEN** hay 10 USD de turnos de exploración con un modelo de 5 USD/M de entrada y claude-sonnet-5 cuesta 2 USD/M
- **THEN** el aviso estima un ahorro de 6 USD

### Requirement: Herramienta que falla
El sistema SHALL avisar con gravedad `warn` por cada herramienta (hasta tres) con al menos 20 usos y más de un 10 % de error; si es la herramienta de shell, SHALL indicar el comando con más errores.

#### Scenario: Bash falla
- **WHEN** Bash tiene 100 usos y 14 errores, 9 de ellos de `npm`
- **THEN** hay un aviso de que Bash falla un 14 % y npm concentra 9 errores

### Requirement: Pico de gasto
El sistema SHALL avisar con gravedad `info` del día con mayor gasto si supera el doble de la media diaria y la media más dos desviaciones típicas, con al menos 5 días con actividad.

#### Scenario: Día anómalo
- **WHEN** hay 10 días de 10 USD y uno de 45 USD
- **THEN** hay un aviso del pico con su fecha, su coste y cuántas veces la media

### Requirement: Caída del cache hit
Si el filtro tiene inicio, el sistema SHALL comparar el cache hit con el del periodo anterior de la misma duración y avisar con gravedad `warn` si baja más de 3 puntos porcentuales.

#### Scenario: Caché peor
- **WHEN** el cache hit pasa de 96 % a 91 %
- **THEN** hay un aviso de caída de 5 puntos

### Requirement: Tarjeta en la portada
La portada SHALL mostrar los avisos en una tarjeta «Lo que deberías saber» junto al gasto diario, cada uno con un enlace a la vista donde investigarlo; sin avisos SHALL indicar que no hay nada destacable.

#### Scenario: Ir a las sesiones
- **WHEN** el usuario pulsa el enlace del aviso de compactaciones
- **THEN** se abre el apartado Sesiones

### Requirement: Avisos por MCP
El servidor MCP SHALL ofrecer `get_insights` con el filtro común.

#### Scenario: Consulta desde un agente
- **WHEN** un agente llama a `get_insights` con `period: "30d"`
- **THEN** recibe la lista de avisos con su texto en español
