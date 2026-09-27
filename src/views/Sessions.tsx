/**
 * Utilidades de sesiones compartidas por Proyectos y el detalle de proyecto: columnas de la
 * tabla de sesiones, cifras (mediana, percentiles) y búsqueda.
 */
import type { SessionRow } from "../lib/api";
import { agentColor, fmt, modelName } from "../lib/format";
import { t } from "../lib/i18n";
import { InlineBar } from "../components/Charts";
import type { Column } from "../components/DataTable";

/** Percentil `p` (0–1) por rango más cercano sobre valores ya ordenados. */
export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

export function sessionStats(rows: SessionRow[]) {
  const costs = rows.map((r) => r.costUsd).sort((a, b) => a - b);
  const durations = rows.map((r) => r.endedAt - r.startedAt);
  return {
    median: quantile(costs, 0.5),
    p90: quantile(costs, 0.9),
    p95: quantile(costs, 0.95),
    avgDuration: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    withCompactions: rows.filter((r) => r.compactions > 0).length,
  };
}

export const matchesQuery = (r: SessionRow, q: string) => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [r.project, r.branch, r.model, r.agentName].some((v) => v?.toLowerCase().includes(needle));
};

/** Columnas de la tabla de sesiones (sin proyecto: ya se está dentro de uno). */
export function sessionColumns(rows: SessionRow[]): Column<SessionRow>[] {
  const maxCost = Math.max(...rows.map((r) => r.costUsd), 0);
  const agentIds = [...new Set(rows.map((r) => r.agentId))];
  return [
    { header: t("Inicio"), cell: (r) => fmt.dateTime(r.startedAt), width: "112px", className: "secondary num", sort: (r) => r.startedAt },
    {
      header: t("Agente"),
      cell: (r) => (
        <span className="with-dot">
          <i style={{ background: agentColor(r.agentId, agentIds.indexOf(r.agentId)) }} />
          {r.agentName}
          {r.isSubagent && <span className="badge">{t("subagente")}</span>}
        </span>
      ),
      width: "minmax(110px, 0.9fr)",
      sort: (r) => r.agentName,
    },
    { header: t("Rama"), cell: (r) => r.branch ?? "–", width: "minmax(90px, 1fr)", className: "mono small", sort: (r) => r.branch ?? "" },
    { header: t("Modelo"), cell: (r) => (r.model ? modelName(r.model) : "–"), width: "minmax(90px, 0.8fr)", className: "secondary", sort: (r) => r.model ?? "" },
    { header: t("Duración"), cell: (r) => fmt.duration(r.endedAt - r.startedAt), align: "right", width: "84px", sort: (r) => r.endedAt - r.startedAt },
    { header: t("Turnos"), cell: (r) => (r.turns ? fmt.int(r.turns) : "–"), align: "right", width: "56px", sort: (r) => r.turns },
    {
      header: t("Compact."),
      cell: (r) => (r.compactions ? fmt.int(r.compactions) : "–"),
      align: "right",
      width: "64px",
      className: (r) => (r.compactions >= 3 ? "error" : r.compactions ? "" : "muted"),
      sort: (r) => r.compactions,
    },
    {
      header: t("Coste"),
      cell: (r) => (!r.hasPrice && r.costUsd === 0 ? t("sin precio") : fmt.usd(r.costUsd)),
      align: "right",
      width: "80px",
      className: (r) => (!r.hasPrice && r.costUsd === 0 ? "warn" : "cost"),
      sort: (r) => r.costUsd,
    },
    { header: "", cell: (r) => <InlineBar value={r.costUsd} max={maxCost} color="var(--accent)" />, width: "48px" },
  ];
}
