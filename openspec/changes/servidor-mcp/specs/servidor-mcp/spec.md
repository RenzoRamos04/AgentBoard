# Spec Delta

## Purpose

Permite que cualquier agente de IA consulte los datos de uso que AgentBoard agrega (coste, tokens, sesiones, actividad, herramientas, modelos, proyectos…) a través del protocolo MCP, sin depender de la interfaz ni de que la app esté abierta.

## ADDED Requirements

### Requirement: Servidor MCP por stdio
El sistema SHALL ofrecer un binario `agentboard-mcp` que hable el protocolo MCP (JSON-RPC 2.0) por entrada/salida estándar, respondiendo al menos a `initialize`, `tools/list` y `tools/call`.

#### Scenario: Handshake
- **WHEN** un cliente MCP envía `initialize`
- **THEN** el servidor responde con su nombre, versión y la capacidad `tools`

#### Scenario: Listado de herramientas
- **WHEN** el cliente pide `tools/list`
- **THEN** el servidor devuelve todas las herramientas con su `name`, `description` y `inputSchema`

#### Scenario: Método desconocido
- **WHEN** el cliente llama a un método que no existe
- **THEN** el servidor responde con un error JSON-RPC sin caerse

### Requirement: Escaneo al arrancar sin persistencia
El servidor SHALL escanear los logs de todos los agentes detectados a una base SQLite en memoria al arrancar, reutilizando la ingesta de la app, y SHALL NOT escribir ningún dato en disco.

#### Scenario: Sin app abierta
- **WHEN** se lanza `agentboard-mcp` sin que la aplicación de escritorio esté abierta
- **THEN** responde a las consultas con los datos leídos de los logs del disco

### Requirement: Herramientas de consulta con filtro común
El servidor SHALL exponer como herramientas MCP las mismas consultas que muestra el dashboard, aceptando un filtro común opcional de periodo (`today`, `7d`, `30d`, `60d`, `90d`, `all`), agentes, proyectos y `no_project` (solo las sesiones sin proyecto), y devolviendo JSON estructurado con los mismos valores que la interfaz. Entre ellas SHALL ofrecer la serie temporal por día local (`get_daily`) y por hora local (`get_hourly`), y los precios por modelo con su origen (`get_prices`).

#### Scenario: Resumen por periodo
- **WHEN** el agente llama a `get_summary` con `period = "30d"`
- **THEN** recibe coste, llamadas, sesiones, cache hit, burn rate y gasto/proyección del mes de los últimos 30 días

#### Scenario: Desglose por modelo
- **WHEN** el agente llama a la herramienta de coste por modelo
- **THEN** recibe cada modelo con su coste, llamadas y tokens

#### Scenario: Filtro por agente
- **WHEN** el agente pasa un filtro de agentes en una herramienta
- **THEN** el resultado solo incluye la actividad de esos agentes

#### Scenario: Sesiones sin proyecto
- **WHEN** el agente pasa `no_project: true` en una herramienta
- **THEN** el resultado solo incluye la actividad de las sesiones sin proyecto detectado

#### Scenario: Serie por horas
- **WHEN** el agente llama a `get_hourly` con `period = "today"`
- **THEN** recibe un punto por hora local con coste, llamadas, sesiones y tokens

#### Scenario: Precios por modelo
- **WHEN** el agente llama a `get_prices`
- **THEN** recibe cada modelo con sus precios (o sin ellos), su origen (`default`, `edited`, `reported` o `missing`) y sus llamadas y coste del periodo

### Requirement: Errores de herramienta controlados
Si una herramienta recibe argumentos inválidos o falla la consulta, el servidor SHALL devolver un resultado de herramienta marcado como error con un mensaje legible, sin cerrar la conexión.

#### Scenario: Periodo inválido
- **WHEN** el agente pasa un `period` que no existe
- **THEN** la herramienta devuelve un error legible y el servidor sigue atendiendo

#### Scenario: Filtro mal tipado
- **WHEN** el agente pasa `agents`, `projects` o `no_project` con un tipo que no corresponde
- **THEN** la herramienta devuelve un error legible en vez de ampliar la consulta en silencio
