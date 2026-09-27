# Spec Delta

## ADDED Requirements

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
