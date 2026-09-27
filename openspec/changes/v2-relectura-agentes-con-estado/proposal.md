# Proposal

## Why

Al usar Codex CLI con la app abierta, su sesión no aparecía hasta reiniciar. El log de la app mostraba `FOREIGN KEY constraint failed` en cada relectura del archivo de Codex. Causa: el vigilante creaba proveedores nuevos en cada relectura, y los proveedores con estado entre líneas (Codex, Gemini, Cursor, Copilot) no saben, a mitad de un archivo, a qué sesión pertenecen las líneas nuevas (el id sale en la primera línea). La vista en vivo solo funcionaba de verdad con Claude Code.

## What Changes

- Los proveedores declaran si conocen el estado de un archivo; si un archivo a medio leer es de un proveedor que no lo conoce, se relee desde el principio (idempotente: las llamadas, herramientas, turnos y eventos se identifican por su id).
- El vigilante reutiliza las mismas instancias de proveedores durante toda la vida de la app, así que solo relee entero la primera vez que cambia cada archivo.

## Capabilities

### Modified Capabilities
- `vigilancia-en-vivo`: relectura correcta de agentes con estado entre líneas.

## Impact

- Backend: `providers/mod.rs` (`knows`), `providers/{codex,gemini,cursor,copilot}.rs`, `ingest.rs`, `watcher.rs`; tests.
