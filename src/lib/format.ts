import { getLang, LOCALES } from "./i18n";
// Cifras al estilo $1,234.56 · 21.3K · 97.6%; los textos van en español.
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd4 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 });
const int = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const locale = () => LOCALES[getLang()];

export const fmt = {
  usd: (n: number) => (n !== 0 && Math.abs(n) < 0.01 ? usd4 : usd2).format(n),
  int: (n: number) => int.format(n),
  compact: (n: number) => compact.format(n),
  pct: (n: number) => pct.format(n),
  date: (ts: number) => new Date(ts).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }),
  dateTime: (ts: number) =>
    new Date(ts).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  time: (ts: number) => new Date(ts).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }),
  /** Duración legible: «< 1 min», «42 min», «2 h 35 min». */
  duration: (ms: number) => {
    const min = Math.round(ms / 60_000);
    if (min < 1) return "< 1 min";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return min % 60 ? `${h} h ${String(min % 60).padStart(2, "0")} min` : `${h} h`;
  },
  /** Milisegundos como «180 ms», «2.1 s», «2 m 10 s». */
  ms: (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)} ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)} m ${String(s % 60).padStart(2, "0")} s`;
  },
  day: (ts: number) => new Date(ts).toLocaleDateString(locale(), { day: "numeric", month: "short" }),
  bytes: (n: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
  },
};

/** Etiqueta y color (token CSS) de cada actividad, en el orden en que se muestran. */
export const ACTIVITIES: Record<string, { label: string; color: string }> = {
  coding: { label: "Coding", color: "var(--act-coding)" },
  exploration: { label: "Exploration", color: "var(--act-exploration)" },
  testing: { label: "Testing", color: "var(--act-testing)" },
  delegation: { label: "Delegation", color: "var(--act-delegation)" },
  conversation: { label: "Conversation", color: "var(--act-conversation)" },
  build: { label: "Build/Deploy", color: "var(--act-build)" },
  feature: { label: "Feature Dev", color: "var(--act-feature)" },
  debugging: { label: "Debugging", color: "var(--act-debugging)" },
  git: { label: "Git", color: "var(--act-git)" },
  brainstorming: { label: "Brainstorming", color: "var(--act-brainstorming)" },
  shell: { label: "Shell", color: "var(--act-build)" },
  research: { label: "Research", color: "var(--act-exploration)" },
  other: { label: "General", color: "var(--act-general)" },
};

/** Color fijo por agente (token CSS); los demás rotan por la paleta. */
const AGENT_COLORS: Record<string, string> = {
  "claude-code": "var(--agent-claude)",
  codex: "var(--agent-codex)",
  copilot: "var(--agent-copilot)",
  opencode: "var(--agent-opencode)",
  gemini: "var(--agent-gemini)",
};
const FALLBACK_COLORS = ["var(--series-blue)", "var(--series-violet)", "var(--series-green)", "var(--series-yellow)", "var(--series-magenta)"];
export const agentColor = (id: string, index = 0) => AGENT_COLORS[id] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

/** Color por posición para series sin color propio (modelos, proyectos, herramientas). */
export const paletteColor = (index: number) => `var(--palette-${(index % 8) + 1})`;

export const activityLabel = (key: string) => ACTIVITIES[key]?.label ?? key;
export const activityColor = (key: string) => ACTIVITIES[key]?.color ?? "var(--act-general)";

/** `claude-opus-5-5` → `Opus 5.5`; otros modelos tal cual. */
export function modelName(id: string): string {
  const m = id.match(/^claude-(?:(\d+)-(\d+)-)?([a-z]+)(?:-(\d+))?(?:-(\d+))?$/);
  if (!m) return id;
  const [, oldMajor, oldMinor, family, major, minor] = m;
  const name = family.charAt(0).toUpperCase() + family.slice(1);
  if (oldMajor) return `${name} ${oldMajor}.${oldMinor}`;
  return [name, [major, minor].filter(Boolean).join(".")].filter(Boolean).join(" ");
}
