import type { Point } from "../lib/api";
import { fmt } from "../lib/format";
import { getLang, LOCALES, t } from "../lib/i18n";
import type { Period } from "../lib/period";
import type { DashboardData } from "../lib/useData";
import { Kpis, type Kpi } from "../components/Kpis";
import { Bars, Columns } from "../components/Charts";
import { useTooltip } from "../components/Tooltip";
import { periodLabel } from "./Overview";

/** Nivel de intensidad 0–5 de una celda (0 = sin gasto), como el gráfico de contribuciones de GitHub. */
export function level(v: number, max: number): number {
  if (!(v > 0) || !(max > 0)) return 0;
  return Math.min(5, Math.max(1, Math.ceil((v / max) * 5)));
}

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

export interface CalendarDay {
  ts: number;
  day: number;
  cost: number;
  calls: number;
  /** Dentro del periodo elegido (los días de fuera se ven apagados). */
  inPeriod: boolean;
  today: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  /** Huecos antes del día 1 (0 = empieza en lunes) y los días del mes. */
  offset: number;
  days: CalendarDay[];
}

/** Máximo de meses que se dibujan (con «Todo», los más recientes). */
const MAX_MONTHS = 12;

/** Calendarios mensuales del periodo, con el coste de cada día (hora local). */
export function monthCalendars(daily: Point[], range: { from?: number; to?: number }, now = new Date()): CalendarMonth[] {
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const byDay = new Map<string, Point>();
  for (const p of daily) byDay.set(key(new Date(p.ts)), p);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstData = daily.length ? new Date(Math.min(...daily.map((p) => p.ts))) : today;
  const start = new Date(range.from ?? firstData.getTime());
  const end = range.to != null ? new Date(range.to - 1) : today;
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

  const months: CalendarMonth[] = [];
  for (let m = new Date(start.getFullYear(), start.getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const days: CalendarDay[] = [];
    const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= last; d++) {
      const date = new Date(m.getFullYear(), m.getMonth(), d);
      const p = byDay.get(key(date));
      days.push({
        ts: date.getTime(),
        day: d,
        cost: p?.costUsd ?? 0,
        calls: p?.calls ?? 0,
        inPeriod: date.getTime() >= startDay && date.getTime() <= endDay,
        today: date.getTime() === today.getTime(),
      });
    }
    months.push({ year: m.getFullYear(), month: m.getMonth(), offset: weekday(m.getTime()), days });
  }
  return months.slice(-MAX_MONTHS);
}

const monthName = (m: { year: number; month: number }) =>
  new Date(m.year, m.month, 1).toLocaleDateString(LOCALES[getLang()], { month: "long", year: "numeric" });

const dayName = (d: number, style: "short" | "long" | "narrow") =>
  new Date(2024, 0, 1 + d).toLocaleDateString(LOCALES[getLang()], { weekday: style }); // 1 ene 2024 fue lunes

/** Apartado Heatmap: calendario del coste por día, y reparto por día de la semana y hora. */
export function Heatmap({ data, period }: { data: DashboardData; period: Period }) {
  const setTip = useTooltip();
  // Día de la semana y hora siguen saliendo del reparto por hora (tarjetas de abajo).
  const { grid } = heatGrid(data.hourly);
  const total = grid.flat().reduce((a, c) => a + c.cost, 0);
  const byDay = grid.map((row) => row.reduce((a, c) => a + c.cost, 0));
  const byHour = Array.from({ length: 24 }, (_, h) => grid.reduce((a, row) => a + row[h].cost, 0));
  const topDay = byDay.indexOf(Math.max(...byDay));
  const weekend = byDay[5] + byDay[6];
  const months = monthCalendars(data.daily, data.filter);
  const inPeriod = months.flatMap((m) => m.days.filter((d) => d.inPeriod));
  const maxDayCost = Math.max(...inPeriod.map((d) => d.cost), 0);
  const topDate = inPeriod.find((d) => d.cost === maxDayCost && d.cost > 0);
  const activeDays = inPeriod.filter((d) => d.cost > 0 || d.calls > 0).length;

  const kpis: Kpi[] = [
    { label: t("Día de más gasto"), value: topDate ? fmt.day(topDate.ts) : "–", hint: topDate ? fmt.usd(topDate.cost) : "", tone: "accent" },
    { label: t("Días con actividad"), value: inPeriod.length ? `${activeDays} / ${inPeriod.length}` : "–", hint: inPeriod.length ? t("{p} de los días del periodo", { p: fmt.pct(activeDays / inPeriod.length) }) : "" },
    { label: t("Día más activo"), value: total ? dayName(topDay, "long") : "–", hint: total ? t("{p} del coste", { p: fmt.pct(byDay[topDay] / total) }) : "" },
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
            <h2>{t("Coste por día")}</h2>
            <span className="muted">{t("cada cuadro es un día · cuanto más intenso, más gasto")}</span>
          </div>
          <div className="heatmap-scale" aria-hidden>
            {t("menos")}
            {[0, 1, 2, 3, 4, 5].map((l) => (
              <i key={l} className={`heat-l${l}`} />
            ))}
            {t("más")}
          </div>
        </header>
        <div className="calendars">
          {months.map((m) => (
            <div key={`${m.year}-${m.month}`} className="calendar" role="table" aria-label={monthName(m)}>
              <div className="calendar-title">{monthName(m)}</div>
              <div className="calendar-grid">
                {Array.from({ length: 7 }, (_, d) => (
                  <span key={`h${d}`} className="calendar-weekday">
                    {dayName(d, "narrow")}
                  </span>
                ))}
                {Array.from({ length: m.offset }, (_, i) => (
                  <span key={`o${i}`} />
                ))}
                {m.days.map((c) => (
                  <span
                    key={c.day}
                    role="cell"
                    className={`calendar-day heat-l${c.inPeriod ? level(c.cost, maxDayCost) : 0} ${c.inPeriod ? "" : "outside"} ${c.today ? "today" : ""} ${c.inPeriod && c.cost > 0 && c.cost === maxDayCost ? "peak" : ""} ${level(c.cost, maxDayCost) >= 4 ? "strong" : ""}`}
                    aria-label={`${fmt.date(c.ts)} · ${fmt.usd(c.cost)}`}
                    onMouseMove={(e) =>
                      c.inPeriod &&
                      setTip({
                        x: e.clientX,
                        y: e.clientY,
                        content: (
                          <>
                            <b>{fmt.date(c.ts)}</b>
                            <div>{fmt.usd(c.cost)}</div>
                            <div className="muted">{t("{n} llamadas", { n: fmt.int(c.calls) })}</div>
                          </>
                        ),
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                  >
                    {c.day}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="grid-2">
        <section className="panel">
          <header className="panel-head">
            <div className="panel-title">
              <h2>{t("Por día de la semana")}</h2>
              <span className="muted">{t("coste del periodo")}</span>
            </div>
          </header>
          <Bars
            items={byDay.map((v, d) => ({ key: String(d), label: dayName(d, "long"), value: v, valueLabel: fmt.usd(v), color: d === topDay && v > 0 ? "var(--accent)" : "var(--series-blue)" }))}
            labelWidth={84}
            thick
          />
        </section>
        <section className="panel">
          <header className="panel-head">
            <div className="panel-title">
              <h2>{t("Por hora del día")}</h2>
              <span className="muted">{t("coste del periodo")}</span>
            </div>
          </header>
          <Columns points={byHour.map((v, h) => ({ ts: h, value: v }))} format={fmt.usd} height={148} color="var(--accent)" axis={(h) => `${String(h).padStart(2, "0")}h`} />
        </section>
      </div>
    </div>
  );
}
