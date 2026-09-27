# Funcionalidad

AgentBoard organiza toda la actividad en un panel lateral con los apartados agrupados
(*Coste*, *Trabajo*, *Herramientas* y *Configuración*) y una barra superior con los filtros:
periodo, agentes, proyectos y **comparar con el periodo anterior**. Cada apartado tiene su tabla
y su gráfico, y una vista ampliada al pulsarlo. Todo respeta los filtros activos.

## Apartados

| Apartado | Qué responde |
| --- | --- |
| **Resumen** | KPIs (coste, sesiones, cache hit, ahorro, burn rate, gasto del mes) con su variación, gasto diario por agente con la línea del periodo anterior, «Lo que deberías saber» y top de proyectos, modelos y actividades. |
| **Daily Activity** | Cuánto se gasta cada día. |
| **By Agent** | Qué agente se usa más y cuánto cuesta cada uno. |
| **By Project** | Coste por proyecto (y por rama al elegir un proyecto), con el *overhead* de contexto. |
| **Sesiones** | Listado de sesiones (mediana y p95 de coste, búsqueda, vistas rápidas, tabla ordenable) y detalle de cada una: coste acumulado con las compactaciones, coste por actividad, turnos y latencia p50/p95 por herramienta. |
| **Heatmap** | Coste por día de la semana y hora local (7 × 24), con la franja de más gasto, el día más activo y el reparto entre horario laboral y fin de semana. |
| **By Activity** | Reparto por tipo de actividad: coding, testing, debugging, exploración, conversación, etc. |
| **By Model** | Coste, cache hit y llamadas por modelo. |
| **Tools** | Uso y porcentaje de error por herramienta nativa. |
| **Shell Commands** | Comandos de shell más ejecutados. |
| **Skills & Agents** | Skills y subagentes invocados. |
| **MCP Servers** | Servidores MCP usados y su actividad. |
| **Agent Types** | Subagentes de todos los agentes (Claude Code, Codex, Gemini, OpenCode, Cursor…), por agente y tipo, con su coste. |
| **Precios y presupuestos** | Precios por modelo editables (origen: por defecto, editado, coste del agente o falta precio) y presupuestos mensual, diario y por proyecto o agente con su progreso. |

## Lo que deberías saber

La portada calcula avisos sobre el filtro activo, del más grave al menos:

- **Compactaciones** — sesiones con 3 o más compactaciones de contexto.
- **Modelo caro en tareas sencillas** — turnos de exploración y conversación hechos con Opus o
  Fable, con el ahorro estimado si se hubieran hecho con Sonnet 5.
- **Herramienta que falla** — herramientas con 20+ usos y más de un 10 % de error (con el
  comando de shell que más falla).
- **Pico de gasto** — un día con más del doble de la media y por encima de media + 2σ.
- **Caída del cache hit** — más de 3 puntos frente al periodo anterior.

## Métricas destacadas

- **Cache hit** — proporción de tokens servidos desde caché sobre el total de entrada.
- **Ahorro por caché** — estimación de lo que habría costado ese contexto a precio completo.
- **Burn rate** — coste de los últimos 60 minutos, en USD/hora.
- **Proyección del mes** — gasto acumulado extrapolado a fin de mes, con aviso si supera el
  presupuesto configurado.

## Funciones de escritorio

- **En vivo.** Un vigilante de archivos relee los logs al vuelo mientras la app está abierta;
  el panel se actualiza sin recargar.
- **Bandeja del sistema.** El icono muestra el gasto del mes en el tooltip y un menú
  Mostrar / Salir; al cerrar la ventana la app sigue en segundo plano.
- **Avisos de presupuesto.** Notificación nativa al llegar al 80 % y al 100 % de cada
  presupuesto: mensual y por proyecto o agente (sobre la proyección del mes) y diario (sobre el
  gasto de hoy).
- **Precios propios.** Los precios editados se guardan en `settings.json` y recalculan todos los
  costes al momento, en la app y en el servidor MCP.
- **Exportar.** Las llamadas del filtro activo a CSV o JSON desde la barra superior o Ajustes.
- **Temas e idiomas.** Tema claro, oscuro o del sistema; interfaz en español, inglés, portugués
  o francés (o el idioma del sistema).
- **Buscador Ctrl+K.** Salta a cualquier apartado, deja solo un proyecto o abre una sesión reciente.
- **Preferencias de avisos.** Activar o desactivar los avisos del 80 % y del 100 %, y mostrar el
  gasto de hoy en la bandeja.
- **Panel colapsable.** El panel lateral se pliega a solo iconos para ganar espacio.

## De dónde salen los datos

Un agente aparece si está instalado (ejecutable en el PATH o su carpeta de configuración),
aunque todavía no tenga sesiones. Al arrancar se leen todos los logs a una base en memoria;
cada llamada se identifica por su `message_id`, de modo que releer nunca duplica. El texto de
los prompts y las respuestas no se guarda en ningún sitio.
