import { invoke } from "@tauri-apps/api/core";

/** Filtro común; campos vacíos = vista general. Fechas en epoch ms UTC. */
export interface Filter {
  from?: number;
  to?: number;
  agents?: string[];
  projects?: number[];
}

export interface Summary {
  costUsd: number;
  calls: number;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  cacheHit: number;
  cacheSavingsUsd: number;
  burnRateUsdH: number;
  firstTs: number | null;
  lastTs: number | null;
  unpricedModels: string[];
}

export interface Point {
  ts: number;
  costUsd: number;
  calls: number;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface SeriesPoint {
  ts: number;
  key: string;
  label: string;
  costUsd: number;
  calls: number;
  outputTokens: number;
}

export interface BreakdownRow {
  key: string;
  label: string;
  costUsd: number;
  calls: number;
  errors: number;
  cacheHit: number;
  hasPrice: boolean;
  sessions: number;
  overheadTokens: number;
}

export type BreakdownBy = "agent" | "project" | "branch" | "model" | "tool" | "command" | "skill" | "mcp" | "agent_type";

export interface ActivityRow {
  key: string;
  costUsd: number;
  turns: number;
  editTurns: number;
  oneShot: number | null;
}

export interface ActivityReport {
  activities: ActivityRow[];
  models: { model: string; editTurns: number; oneShot: number | null }[];
}

export interface ActivityDay {
  ts: number;
  activity: string;
  costUsd: number;
  turns: number;
}

export interface AgentRow {
  id: string;
  name: string;
  logRoot: string;
  costUsd: number;
  calls: number;
}

export interface ProjectRow {
  id: number;
  name: string;
  cwd: string;
  costUsd: number;
  calls: number;
}

export interface DataInfo {
  firstTs: number | null;
  calls: number;
  watchedFiles: number;
  lastScan: number | null;
}

export interface SessionRow {
  id: string;
  agentId: string;
  agentName: string;
  projectId: number | null;
  project: string | null;
  branch: string | null;
  startedAt: number;
  endedAt: number;
  model: string | null;
  costUsd: number;
  calls: number;
  cacheHit: number;
  inputTokens: number;
  outputTokens: number;
  hasPrice: boolean;
  turns: number;
  compactions: number;
  toolCalls: number;
  toolErrors: number;
  subagentCalls: number;
  isSubagent: boolean;
}

export interface SessionList {
  sessions: SessionRow[];
  total: number;
}

export interface TurnRow {
  n: number;
  id: string;
  ts: number;
  activity: string;
  costUsd: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  tools: [string, number][];
  toolErrors: number;
}

export interface ToolStat {
  tool: string;
  calls: number;
  errors: number;
  p50Ms: number | null;
  p95Ms: number | null;
}

export interface KeyCost {
  key: string;
  costUsd: number;
  calls: number;
}

export interface SessionDetail {
  session: SessionRow;
  timeline: { ts: number; costUsd: number }[];
  compactions: number[];
  turns: TurnRow[];
  activities: KeyCost[];
  models: KeyCost[];
  tools: ToolStat[];
}

export type Theme = "system" | "light" | "dark";

export type Language = "system" | "es" | "en" | "pt" | "fr";

export interface ScopedBudget {
  kind: "project" | "agent";
  /** Raíz del repo (proyecto) o id del agente. */
  key: string;
  label: string;
  monthly: number;
}

export interface PriceOverride {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWrite1h: number;
}

export interface Settings {
  theme: Theme;
  language: Language;
  monthlyBudget: number | null;
  dailyBudget: number | null;
  budgets: ScopedBudget[];
  priceOverrides: PriceOverride[];
}

export type PriceSource = "default" | "edited" | "reported" | "missing";

export interface PriceRow {
  model: string;
  /** Entrada, salida, lectura de caché, escritura 5 min y 1 h (USD por millón). */
  prices: [number, number, number, number, number] | null;
  source: PriceSource;
  calls: number;
  costUsd: number;
}

/** Minutos a sumar a UTC para obtener la hora local. */
export const tzOffsetMin = () => -new Date().getTimezoneOffset();

export const api = {
  summary: (filter: Filter) => invoke<Summary>("get_summary", { filter }),
  timeseries: (filter: Filter, bucket: "day" | "hour") =>
    invoke<Point[]>("get_timeseries", { filter, bucket, tzOffsetMin: tzOffsetMin() }),
  timeseriesBy: (filter: Filter, by: "agent" | "model" | "project" | "branch" | "tool") =>
    invoke<SeriesPoint[]>("get_timeseries_by", { filter, by, tzOffsetMin: tzOffsetMin() }),
  breakdown: (filter: Filter, by: BreakdownBy) => invoke<BreakdownRow[]>("get_breakdown", { filter, by }),
  activity: (filter: Filter) => invoke<ActivityReport>("get_activity", { filter }),
  activityDaily: (filter: Filter) => invoke<ActivityDay[]>("get_activity_daily", { filter, tzOffsetMin: tzOffsetMin() }),
  agents: (filter: Filter) => invoke<AgentRow[]>("list_agents", { filter }),
  projects: (filter: Filter) => invoke<ProjectRow[]>("list_projects", { filter }),
  prices: (filter: Filter) => invoke<PriceRow[]>("list_prices", { filter }),
  sessions: (filter: Filter, limit?: number) => invoke<SessionList>("list_sessions", { filter, limit }),
  sessionDetail: (id: string) => invoke<SessionDetail>("get_session_detail", { id }),
  dataInfo: () => invoke<DataInfo>("get_data_info"),
  settings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings: Settings) => invoke<Settings>("set_settings", { settings }),
  exportData: (filter: Filter, format: "csv" | "json") => invoke<string>("export_data", { filter, format }),
};
