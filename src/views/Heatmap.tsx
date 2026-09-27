import type { Point } from "../lib/api";
import { fmt } from "../lib/format";
import { getLang, LOCALES, t } from "../lib/i18n";
import type { Period } from "../lib/period";
import type { DashboardData } from "../lib/useData";
import { Kpis, type Kpi } from "../components/Kpis";
import { useTooltip } from "../components/Tooltip";
import { periodLabel } from "./Overview";

/** Días de lunes (0) a domingo (6). */
export const weekday = (ts: number) => (new Date(ts).getDay() + 6) % 7;

/** Coste y llamadas por día de la semana × hora local (7 × 24). */
export function heatGrid(hourly: Point[]) {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ cost: 0, calls: 0 })));
  for (const p of hourly) {
    const c = grid[weekday(p.ts)][new Date(p.ts).getHours()];
    c.cost += p.costUsd;
    c.calls += p.calls;
  }
  let peak = { day: 0, hour: 0, cost: 0 };
  grid.forEach((row, day) => row.forEach((c, hour) => c.cost > peak.cost && (peak = { day, hour, cost: c.cost })));
  return { grid, peak };
}

const dayName = (d: number, style: "short" | "long") =>
  new Date(2024, 0, 1 + d).toLocaleDateString(LOCALES[getLang()], { weekday: style }); // 1 ene 2024 fue lunes

/** Apartado Heatmap: cuándo se gasta, por día de la semana y hora. */
export function Heatmap({ data, period }: { data: DashboardData; period: Period }) {
  const setTip = useTooltip();
  const { grid, peak } = heatGrid(data.hourly);
  const max = peak.cost;
  const total = grid.flat().reduce((a, c) => a + c.cost, 0);
  const byDay = grid.map((row) => row.reduce((a, c) => a + c.cost, 0));
  const byHour = Array.from({ length: 24 }, (_, h) => grid.reduce((a, row) => a + row[h].cost, 0));
  const topDay = byDay.indexOf(Math.max(...byDay));
  const workHours = byHour.slice(9, 19).reduce((a, b) => a + b, 0);
  const weekend = byDay[5] + byDay[6];
  const alpha = (v: number) => (max > 0 && v > 0 ? 0.15 + 0.85 * (v / max) : 0);

  const kpis: Kpi[] = [
    { label: t("Franja de más gasto"), value: max ? `${dayName(peak.day, "short")} · ${String(peak.hour).padStart(2, "0")}:00` : "–", hint: max ? fmt.usd(peak.cost) : "", tone: "accent" },
    { label: t("Día más activo"), value: total ? dayName(topDay, "long") : "–", hint: total ? t("{p} del coste", { p: fmt.pct(byDay[topDay] / total) }) : "" },
    { label: t("En horario de 9 a 19 h"), value: total ? fmt.pct(workHours / total) : "–", hint: t("del coste del periodo") },
    { label: t("En fin de semana"), value: total ? fmt.pct(weekend / total) : "–", hint: t("sábado y domingo") },
  ];

  return (
    <div className="main">
      <header className="page-head">
        <h1>
          Heatmap <span className="muted">· {t("¿Cuándo trabajo con agentes?")} · {periodLabel(period)}</span>
        </h1>
      </header>
      <Kpis items={kpis} columns={4} />
      <section className="panel">
        <header className="panel-head">
          <div className="panel-title">
            <h2>{t("Coste por día y hora")}</h2>
            <span className="muted">{t("hora local · cuanto más intenso, más gasto")}</span>
          </div>
          <div className="heatmap-scale" aria-hidden>
            {t("menos")}
            {[0.15, 0.4, 0.7, 1].map((a) => (
              <i key={a} style={{ background: `color-mix(in srgb, var(--accent) ${a * 100}%, var(--track))` }} />
            ))}
            {t("más")}
          </div>
        </header>
        <div className="heatmap" role="table" aria-label={t("Coste por día y hora")}>
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="heatmap-hour">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
          {grid.map((row, d) => (
            <div key={d} role="row" style={{ display: "contents" }}>
              <span className="heatmap-day" role="rowheader">
                {dayName(d, "short")}
              </span>
              {row.map((c, h) => (
                <span
                  key={h}
                  role="cell"
                  className={`heatmap-cell ${max && d === peak.day && h === peak.hour ? "peak" : ""}`}
                  style={alpha(c.cost) ? { background: `color-mix(in srgb, var(--accent) ${Math.round(alpha(c.cost) * 100)}%, var(--track))` } : undefined}
                  aria-label={`${dayName(d, "long")} ${h}:00 · ${fmt.usd(c.cost)}`}
                  onMouseMove={(e) =>
                    setTip({
                      x: e.clientX,
                      y: e.clientY,
                      content: (
                        <>
                          <b>
                            {dayName(d, "long")} · {String(h).padStart(2, "0")}:00
                          </b>
                          <div>{fmt.usd(c.cost)}</div>
                          <div className="muted">{t("{n} llamadas", { n: fmt.int(c.calls) })}</div>
                        </>
                      ),
                    })
                  }
                  onMouseLeave={() => setTip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
