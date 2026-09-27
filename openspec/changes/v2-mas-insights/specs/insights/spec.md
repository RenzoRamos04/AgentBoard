# Spec Delta

## MODIFIED Requirements

### Requirement: Avisos del filtro
El sistema SHALL calcular avisos para el filtro activo. Cada aviso MUST tener un tipo, una gravedad (`critical`, `warn`, `info` o `good`), parámetros para componer el texto en cualquier idioma y un texto en español. Los avisos SHALL devolverse ordenados por gravedad (`critical`, `warn`, `info`, `good`).

#### Scenario: Sin nada que avisar
- **WHEN** ningún patrón supera su umbral
- **THEN** la lista de avisos está vacía

## ADDED Requirements

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
