/** Apartados del panel izquierdo, en el orden en que se muestran. */
export type SectionId =
  | "overview"
  | "daily"
  | "agent"
  | "project"
  | "projects"
  | "activity"
  | "heatmap"
  | "model"
  | "tools"
  | "shell"
  | "skills"
  | "mcp"
  | "agents"
  | "pricing";

export type SectionGroup = "coste" | "trabajo" | "herramientas" | "configuracion";

export interface Section {
  id: SectionId;
  title: string;
  question: string;
  group: SectionGroup;
  /** Apartado añadido en la V2 (etiqueta «nuevo» en el panel lateral). */
  isNew?: boolean;
  /** Nombre corto para el panel lateral, si el título no cabe. */
  nav?: string;
}

/** Grupos del panel lateral, en orden. */
export const GROUPS: { id: SectionGroup; title: string }[] = [
  { id: "coste", title: "Coste" },
  { id: "trabajo", title: "Trabajo" },
  { id: "herramientas", title: "Herramientas" },
  { id: "configuracion", title: "Configuración" },
];

export const SECTIONS: Section[] = [
  { id: "overview", title: "Resumen", question: "Todo de un vistazo", group: "coste" },
  { id: "daily", title: "Daily Activity", question: "¿Cuánto gasto cada día?", group: "coste" },
  { id: "agent", title: "By Agent", question: "¿Qué agente uso más?", group: "coste" },
  { id: "project", title: "By Project", question: "¿Cuánto costó cada proyecto?", group: "coste" },
  { id: "model", title: "By Model", question: "¿Uso el modelo adecuado?", group: "coste" },
  { id: "projects", title: "Proyectos", question: "¿Qué proyecto se lleva el gasto y por qué?", group: "trabajo", isNew: true },
  { id: "activity", title: "By Activity", question: "¿En qué se va el gasto?", group: "trabajo" },
  { id: "heatmap", title: "Heatmap", question: "¿Cuándo trabajo con agentes?", group: "trabajo", isNew: true },
  { id: "tools", title: "Tools", question: "¿Qué herramientas usa y dónde fallan?", group: "herramientas" },
  { id: "shell", title: "Shell Commands", question: "¿Qué comandos ejecuta?", group: "herramientas" },
  { id: "skills", title: "Skills & Agents", question: "¿Qué skills y subagentes invoco?", group: "herramientas" },
  { id: "mcp", title: "MCP Servers", question: "¿Qué servidores MCP uso?", group: "herramientas" },
  { id: "agents", title: "Agent Types", question: "¿Cuánto cuestan los subagentes de cada agente?", group: "herramientas" },
  { id: "pricing", title: "Precios y presupuestos", nav: "Precios",  question: "¿Están bien los precios? ¿Voy dentro del presupuesto?", group: "configuracion", isNew: true },
];

export const sectionOf = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;

/** Apartados con vista ampliada sobre los datos del panel (resumen, Proyectos, Heatmap y Precios tienen la suya). */
export type DetailSectionId = Exclude<SectionId, "overview" | "projects" | "pricing" | "heatmap">;
