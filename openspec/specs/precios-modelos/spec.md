# precios-modelos Specification

## Purpose
Calcula el coste en USD de cada llamada a partir de los tokens guardados y del precio vigente del modelo en la fecha de la llamada, sin necesidad de reimportar si cambian los precios.

## Requirements

### Requirement: Coste por llamada
El coste de una llamada SHALL ser `(input × p.input + output × p.output + cache_read × p.cache_read + cache_write × p.cache_write) / 1 000 000`, usando el precio del modelo con `valid_from` más reciente no posterior a la llamada.

#### Scenario: Llamada con precio conocido
- **WHEN** un modelo cuesta 3 USD de entrada y 15 USD de salida por millón, y una llamada usa 1 000 000 de entrada y 100 000 de salida
- **THEN** su coste es 4,5 USD

### Requirement: Precios iniciales
La app SHALL incluir una tabla de precios de los modelos Claude, OpenAI y Gemini habituales, que se carga en la base si no hay precios.

#### Scenario: Base recién creada
- **WHEN** se crea la base
- **THEN** la tabla de precios contiene al menos los modelos Claude actuales

### Requirement: Modelo sin precio
Una llamada cuyo modelo no tenga precio SHALL contarse en llamadas y tokens con coste 0, y el modelo MUST poder identificarse como "sin precio".

#### Scenario: Modelo desconocido
- **WHEN** se importa una llamada del modelo `modelo-inventado`
- **THEN** aparece en el recuento de llamadas con coste 0

### Requirement: Recalcular sin reimportar
Cambiar la tabla de precios SHALL cambiar los costes mostrados sin volver a leer los logs.

#### Scenario: Actualización de precios
- **WHEN** se añade un precio nuevo con `valid_from` anterior a las llamadas
- **THEN** el resumen refleja el nuevo coste en la siguiente consulta

### Requirement: Coste reportado por el agente
Si una llamada trae un coste reportado por el agente y su modelo no tiene precio en la tabla, el sistema SHALL usar ese coste y MUST NOT marcar el modelo como "sin precio".

#### Scenario: Modelo solo conocido por OpenCode
- **WHEN** una llamada del modelo `big-pickle` trae coste reportado 0,0123 USD y no hay precio en la tabla
- **THEN** su coste es 0,0123 USD y el modelo no aparece como "sin precio"

### Requirement: Precios del usuario
El usuario SHALL poder fijar el precio de un modelo (entrada, salida, lectura de caché y escritura de caché a 5 min y 1 h, en USD por millón de tokens). Un precio del usuario MUST sustituir al precio por defecto de ese modelo para todas las fechas, MUST persistir en `settings.json` y SHALL aplicarse tanto en la app como en el servidor MCP. Los valores MUST ser números finitos mayores o iguales que 0.

#### Scenario: Completar un modelo sin precio
- **WHEN** el modelo `kimi-k2` no tiene precio y el usuario le pone 1 USD de entrada por millón
- **THEN** sus llamadas pasan a tener coste sin releer los logs y el modelo deja de aparecer como "sin precio"

#### Scenario: Restablecer
- **WHEN** el usuario restablece un modelo con precio por defecto que había editado
- **THEN** vuelve a usarse el precio por defecto

#### Scenario: Valor inválido
- **WHEN** el usuario introduce un precio negativo
- **THEN** no se guarda y se mantiene el anterior

### Requirement: Listado de precios
El sistema SHALL listar los modelos usados en el filtro activo, primero los que no tienen precio y luego por número de llamadas, con sus llamadas, coste y el origen del precio: *por defecto*, *editado*, *coste del agente* (sin precio en la tabla pero con coste reportado) o *falta precio*; y después los demás modelos con precio.

#### Scenario: Origen
- **WHEN** un modelo usado no tiene precio pero sus llamadas traen coste reportado
- **THEN** su origen es "coste del agente"

### Requirement: Aviso de modelos sin precio
Si en el filtro activo hay modelos sin precio, la portada SHALL avisarlo con el número de modelos y un enlace al listado de precios.

#### Scenario: Aviso
- **WHEN** hay dos modelos sin precio en el periodo
- **THEN** la portada muestra «2 modelos sin precio» con enlace a Precios y presupuestos
