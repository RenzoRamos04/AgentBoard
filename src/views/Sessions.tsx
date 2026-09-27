import { useEffect, useMemo, useState } from "react";
import { api, type Filter, type SessionList, type SessionRow } from "../lib/api";
import { agentColor, fmt, modelName } from "../lib/format";
import { t } from "../lib/i18n";
import type { Period } from "../lib/period";
import { InlineBar, Segmented } from "../components/Charts";
import { DataTable, type Column } from "../components/DataTable";
import { Kpis, type Kpi } from "../components/Kpis";
import { SearchIcon } from "../components/Icons";
import { periodLabel } from "./Overview";

type View = "all" | "expensive" | "compact" | "sub";

const VIEWS: { value: View; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "expensive", label: "Más caras" },
  { value: "compact", label: "Con compactación" },
  { value: "sub", label: "Con subagentes" },
];

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

/** Apartado Sesiones: cifras, búsqueda, vistas rápidas y tabla ordenable. */
export function Sessions({ filter, period, refresh, open }: { filter: Filter; period: Period; refresh: number; open: (id: string) => void }) {
  const [list, setList] = useState<SessionList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("all");

  useEffect(() => {
    let alive = true;
    api
      .sessions(filter)
      .then((l) => alive && (setList(l), setError(null)))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [filter, refresh]);

  const all = list?.sessions ?? [];
  const stats = useMemo(() => sessionStats(all), [all]);
  const rows = all.filter(
    (r) =>
      matchesQuery(r, q) &&
      (view === "all" ||
        (view === "expensive" && r.costUsd > 0 && r.costUsd >= stats.p90) ||
        (view === "compact" && r.compactions > 0) ||
        (view === "sub" && (r.subagentCalls > 0 || r.isSubagent))),
  );
  const maxCost = Math.max(...all.map((r) => r.costUsd), 0);
  const agentIds = [...new Set(all.map((r) => r.agentId))];

  if (error) return <div className="main error">{t("No se pudieron cargar los datos: {e}", { e: error })}</div>;
  if (!list) return <div className="main muted">{t("Cargando…")}</div>;

  const kpis: Kpi[] = [
    { label: t("Mediana por sesión"), value: fmt.usd(stats.median), hint: t("{n} sesiones", { n: fmt.int(all.length) }) },
    { label: t("p95 por sesión"), value: fmt.usd(stats.p95), hint: t("el 5 % más caro supera esta cifra"), tone: "accent" },
    { label: t("Duración media"), value: fmt.duration(stats.avgDuration), hint: t("de la primera a la última llamada") },
    { label: t("Con compactaciones"), value: fmt.int(stats.withCompactions), hint: t("el contexto se llenó y se resumió"), tone: stats.withCompactions ? "warn" : undefined },
  ];

  const columns: Column<SessionRow>[] = [
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
      width: "minmax(120px, 0.8fr)",
      sort: (r) => r.agentName,
    },
    {
      header: t("Proyecto · rama"),
      cell: (r) => (
        <span className="two-lines">
          <span>{r.project ?? t("(sin proyecto)")}</span>
          <span className="muted mono small">{r.branch ?? "–"}</span>
        </span>
      ),
      width: "minmax(160px, 1.4fr)",
      sort: (r) => `${r.project ?? ""} ${r.branch ?? ""}`,
    },
    { header: t("Modelo"), cell: (r) => (r.model ? modelName(r.model) : "–"), width: "minmax(100px, 0.9fr)", className: "secondary", sort: (r) => r.model ?? "" },
    { header: t("Duración"), cell: (r) => fmt.duration(r.endedAt - r.startedAt), align: "right", width: "92px", sort: (r) => r.endedAt - r.startedAt },
    { header: t("Turnos"), cell: (r) => (r.turns ? fmt.int(r.turns) : "–"), align: "right", width: "60px", sort: (r) => r.turns },
    {
      header: t("Compact."),
      cell: (r) => (r.compactions ? fmt.int(r.compactions) : "–"),
      align: "right",
      width: "70px",
      className: (r) => (r.compactions >= 3 ? "error" : r.compactions ? "" : "muted"),
      sort: (r) => r.compactions,
    },
    { header: t("Caché"), cell: (r) => (r.cacheHit ? fmt.pct(r.cacheHit) : "–"), align: "right", width: "64px", className: "secondary", sort: (r) => r.cacheHit },
    {
      header: t("Coste"),
      cell: (r) => (!r.hasPrice && r.costUsd === 0 ? t("sin precio") : fmt.usd(r.costUsd)),
      align: "right",
      width: "84px",
      className: (r) => (!r.hasPrice && r.costUsd === 0 ? "warn" : "cost"),
      sort: (r) => r.costUsd,
    },
    { header: "", cell: (r) => <InlineBar value={r.costUsd} max={maxCost} color="var(--accent)" />, width: "72px" },
  ];

  return (
    <div className="main">
      <header className="page-head">
        <h1>
          {t("Sesiones")}{" "}
          <span className="muted">
            · {t("{n} en el periodo", { n: fmt.int(list.total) })} · {periodLabel(period)}
          </span>
        </h1>
      </header>
      <Kpis items={kpis} columns={4} compact />
      <div className="toolbar">
        <label className="search toolbar-search">
          <SearchIcon />
          <input type="search" placeholder={t("Proyecto, rama, modelo o agente")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Buscar sesiones")} />
        </label>
        <Segmented value={view} options={VIEWS.map((v) => ({ ...v, label: t(v.label) }))} onChange={setView} />
      </div>
      <section className="panel">
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={columns}
          collapse={50}
          defaultSort={{ header: t("Inicio"), dir: "desc" }}
          onRowClick={(r) => open(r.id)}
          empty={all.length ? t("Ninguna sesión coincide con la búsqueda") : t("Sin sesiones en este periodo")}
        />
        <footer className="panel-foot muted small">
          {list.total > all.length
            ? t("Mostrando las {n} más recientes de {m}", { n: fmt.int(all.length), m: fmt.int(list.total) })
            : t("Pulsa una sesión para ver su detalle")}
        </footer>
      </section>
    </div>
  );
}
