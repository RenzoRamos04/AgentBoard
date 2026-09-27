# insights Specification

## Purpose
Detecta y explica patrones de coste y fricción en el uso de los agentes, para que el usuario sepa dónde mirar.

## Requirements

### Requirement: Avisos del filtro
El sistema SHALL calcular avisos para el filtro activo. Cada aviso MUST tener un tipo, una gravedad (`critical`, `warn`, `info` o `good`), parámetros para componer el texto en cualquier idioma y un texto en español. Los avisos SHALL devolverse ordenados por gravedad (`critical`, `warn`, `info`, `good`).

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

### Requirement: Concentración del gasto
El sistema SHALL avisar (`info`) si un proyecto concentra al menos el 50 % del coste del filtro, y si un modelo concentra al menos el 70 %.

#### Scenario: Un proyecto domina
- **WHEN** el proyecto AgentBoard supone el 93 % del coste
- **THEN** hay un aviso «AgentBoard concentra el 93 % del gasto»

### Requirement: Sesión más cara
El sistema SHALL avisar (`info`) de la sesión más cara del filtro si supone al menos el 20 % del coste o más de 5 USD, con su proyecto, rama, modelo y duración.

#### Scenario: Sesión destacada
- **WHEN** una sesión cuesta 38 USD de un total de 100 USD
- **THEN** hay un aviso con esa sesión y enlace a su detalle

### Requirement: Modelos sin precio
El sistema SHALL avisar (`warn`) si hay modelos sin precio en el filtro, con cuántos son y cuántas llamadas cuentan como 0 USD.

#### Scenario: Dos modelos
- **WHEN** gpt-6-luna y gemini-3.8-flash no tienen precio
- **THEN** hay un aviso «2 modelos sin precio» con enlace a Precios y presupuestos

### Requirement: Comandos y servidores MCP que fallan
El sistema SHALL avisar (`info`) del comando de shell con más errores si tiene al menos 5 y al menos un 5 % de error, y (`warn`) de cada servidor MCP (hasta dos) con al menos 10 usos y más de un 10 % de error.

#### Scenario: npm falla
- **WHEN** `npm` tiene 9 errores en 75 usos
- **THEN** hay un aviso de que npm falla un 12 %

### Requirement: Calidad del trabajo
El sistema SHALL avisar (`warn`) si el cache hit de un modelo con al menos 100 llamadas es menor del 70 %; (`warn`) si el 1-shot es menor del 80 % con al menos 20 turnos con ediciones; y (`good`) si es del 95 % o más con al menos 20 turnos con ediciones.

#### Scenario: Buen 1-shot
- **WHEN** 48 de 50 turnos con ediciones salen a la primera
- **THEN** hay un aviso positivo del 96 % de 1-shot

### Requirement: Hábitos y ritmo
El sistema SHALL avisar (`info`) si los subagentes suman al menos el 20 % del coste; si la última hora cuesta más del doble de la media por hora con actividad y más de 1 USD; y si al menos el 30 % del coste cae antes de las 9 o desde las 19 h, hora local.

#### Scenario: Fuera de horario
- **WHEN** el 40 % del coste es entre las 19 y las 24 h
- **THEN** hay un aviso de que el 40 % del gasto es fuera de horario

### Requirement: Tendencias y agentes
Con periodo anterior con datos, el sistema SHALL avisar (`warn`) si el coste medio por sesión sube más de un 30 %. SHALL avisar (`info`) de los agentes instalados sin llamadas en el filtro. SHALL avisar (`good`) si el ahorro por caché supera al coste del filtro.

#### Scenario: La caché compensa
- **WHEN** el coste es 56 USD y el ahorro por caché 612 USD
- **THEN** hay un aviso positivo de que la caché ahorró 10,9 veces lo gastado

### Requirement: Tarjeta con muchos avisos
La tarjeta de la portada SHALL mostrar los cinco primeros avisos y un botón para ver todos; cada aviso SHALL enlazar a su vista (proyecto, sesión, modelo, comando, servidor, precios o actividad).

#### Scenario: Ver todos
- **WHEN** hay 9 avisos y el usuario pulsa «Ver los 9 avisos»
- **THEN** la tarjeta muestra los nueve
