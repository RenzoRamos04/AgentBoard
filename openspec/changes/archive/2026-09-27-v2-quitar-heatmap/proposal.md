# Proposal

## Why

Tras probar varias versiones (día × hora y calendario por día), el usuario considera que el apartado Heatmap es lioso y pide quitarlo. Lo que aporta ya está en otros apartados: el coste por día en Daily Activity y el reparto por hora del día en su vista ampliada.

## What Changes

- Se elimina el apartado **Heatmap** del panel lateral, del buscador Ctrl+K y del código (vista, estilos, colores y tests).
- Los avisos «ritmo alto» y «fuera de horario» enlazan a **Daily Activity** (que tiene «Por hora del día»).

## Capabilities

### Modified Capabilities
- `interfaz`: sin Heatmap.

## Impact

- Frontend: `views/Heatmap.tsx` (se borra), `lib/sections.ts`, `App.tsx`, `Icons.tsx`, `Insights.tsx`, `styles.css`, `i18n.ts`, tests.
- Documentación: `docs/wiki/Funcionalidad.md`.
