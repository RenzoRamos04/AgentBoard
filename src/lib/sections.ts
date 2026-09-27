/** Apartados del panel izquierdo, en el orden en que se muestran. */
export type SectionId =
  | "overview"
  | "daily"
  | "agent"
  | "project"
  | "activity"
  | "model"
  | "tools"
  | "shell"
  | "skills"
  | "mcp"
  | "agents";

export type SectionGroup = "coste" | "trabajo" | "herramientas";

export interface Section {
  id: SectionId;
  title: string;
  question: string;
  group: SectionGroup;
}

/** Grupos del panel lateral, en orden. */
export const GROUPS: { id: SectionGroup; title: string }[] = [
  { id: "coste", title: "Coste" },
  { id: "trabajo", title: "Trabajo" },
  { id: "herramientas", title: "Herramientas" },
];

export const SECTIONS: Section[] = [
  { id: "overview", title: "Resumen", question: "Todo de un vistazo", group: "coste" },
  { id: "daily", title: "Daily Activity", question: "¿Cuánto gasto cada día?", group: "coste" },
  { id: "agent", title: "By Agent", question: "¿Qué agente uso más?", group: "coste" },
  { id: "project", title: "By Project", question: "¿Cuánto costó cada proyecto?", group: "coste" },
  { id: "model", title: "By Model", question: "¿Uso el modelo adecuado?", group: "coste" },
  { id: "activity", title: "By Activity", question: "¿En qué se va el gasto?", group: "trabajo" },
  { id: "tools", title: "Tools", question: "¿Qué herramientas usa y dónde fallan?", group: "herramientas" },
  { id: "shell", title: "Shell Commands", question: "¿Qué comandos ejecuta?", group: "herramientas" },
  { id: "skills", title: "Skills & Agents", question: "¿Qué skills y subagentes invoco?", group: "herramientas" },
  { id: "mcp", title: "MCP Servers", question: "¿Qué servidores MCP uso?", group: "herramientas" },
  { id: "agents", title: "Claude Agent Types", question: "¿Cuánto cuestan los subagentes?", group: "herramientas" },
];

export const sectionOf = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
