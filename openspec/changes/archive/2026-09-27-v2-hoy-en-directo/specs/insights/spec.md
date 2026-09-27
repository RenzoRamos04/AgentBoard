# Spec Delta

## REMOVED Requirements

### Requirement: Tarjeta en la portada
**Reason**: el usuario prefiere en ese hueco una vista en directo de hoy; los avisos por reglas fijas le parecen textos pre-escritos.
**Migration**: los avisos siguen disponibles para los agentes con la herramienta MCP `get_insights`; en la portada los sustituye la tarjeta «Hoy en directo».

### Requirement: Tarjeta con muchos avisos
**Reason**: desaparece la tarjeta de avisos de la portada.
**Migration**: `get_insights` devuelve todos los avisos, ordenados por gravedad.
