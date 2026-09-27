import { useEffect, useState } from "react";
import { api, type Filter, type Point, type SessionRow } from "../lib/api";
import { relDelta } from "../lib/delta";
import { agentColor, fmt, modelName } from "../lib/format";
import { t } from "../lib/i18n";
import { Columns } from "../components/Charts";

/** Una sesión cuenta como activa si tuvo llamadas en los últimos 15 minutos. */
export const ACTIVE_MS = 15 * 60_000;
const DAY_MS = 864e5;

/** Inicio del día local de `now` y de ayer, y el mismo instante de ayer (para comparar). */
export function todayRanges(now: number) {
  const d = new Date(now);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime();
  return { today, yesterday, sameTimeYesterday: now - DAY_MS };
}

/** La sesión más reciente por actividad y si sigue activa. */
export function latestSession(rows: SessionRow[], now: number): { session: SessionRow; active: boolean } | null {
  const s = rows.reduce<SessionRow | null>((a, b) => (!a || b.endedAt > a.endedAt ? b : a), null);
  return s ? { session: s, active: now - s.endedAt < ACTIVE_MS } : null;
}

interface Live {
  today: number;
  yesterday: number;
  burn: number;
  hours: Point[];
  latest: { session: SessionRow; active: boolean } | null;
}

/** «hace 3 min», «hace 2 h»… */
function ago(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 1) return t("ahora mismo");
  if (m < 60) return t("hace {n} min", { n: m });
  return t("hace {n} h", { n: Math.round(m / 60) });
}

/** Tarjeta «Hoy en directo»: lo de hoy, siempre, sea cual sea el periodo elegido. */
export function TodayLive({ filter, refresh, openSession }: { filter: Filter; refresh: number; openSession: (id: string) => void }) {
  const [live, setLive] = useState<Live | null>(null);
  const [now, setNow] = useState(Date.now());
  // Solo agentes y proyectos: el periodo de la barra no afecta a esta tarjeta.
  const scope = { agents: filter.agents, projects: filter.projects };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    const at = Date.now();
    const r = todayRanges(at);
    const today: Filter = { ...scope, from: r.today };
    Promise.all([
      api.summary(today),
      api.summary({ ...scope, from: r.yesterday, to: r.sameTimeYesterday }),
      api.timeseries(today, "hour"),
      api.sessions(today, 20),
    ])
      .then(([s, y, hours, sessions]) => {
        if (!alive) return;
        setLive({ today: s.costUsd, yesterday: y.costUsd, burn: s.burnRateUsdH, hours, latest: latestSession(sessions.sessions, at) });
        setNow(at);
      })
      .catch(() => alive && setLive(null));
    return () => {
      alive = false;
    };
  }, [filter.agents?.join(","), filter.projects?.join(","), refresh]);

  if (!live) return <p className="empty">{t("Cargando…")}</p>;

  const delta = relDelta(live.today, live.yesterday, false);
  const byHour = Array.from({ length: 24 }, (_, h) => ({ ts: h, value: 0 }));
  for (const p of live.hours) byHour[new Date(p.ts).getHours()].value += p.costUsd;
  const l = live.latest;

  return (
    <div className="today-live">
      <div className="today-head">
        <strong className="today-value num">{fmt.usd(live.today)}</strong>
        {delta && (
          <span className={`kpi-delta num ${delta.tone}`} title={t("frente a ayer hasta la misma hora ({v})", { v: fmt.usd(live.yesterday) })}>
            {t(delta.text)} {t("vs. ayer")}
          </span>
        )}
      </div>
      <div className="today-row">
        <span className="muted">{t("Ritmo (última hora)")}</span>
        <span className="num">{fmt.usd(live.burn)}/h</span>
      </div>
      <div className="today-chart">
        <Columns points={byHour} format={fmt.usd} height={130} yAxis={false} axis={(h) => `${String(h).padStart(2, "0")}h`} />
      </div>
      <div className={`today-session ${l?.active ? "active" : ""}`}>
        {l ? (
          <>
            <div className="today-session-head">
              <span className={`status-dot ${l.active ? "on" : ""}`} />
              <span>{l.active ? t("Activa ahora") : t("Última sesión · {ago}", { ago: ago(now - l.session.endedAt) })}</span>
              <span className="num cost today-session-cost">{fmt.usd(l.session.costUsd)}</span>
            </div>
            <div className="today-session-name">
              {l.session.project ?? t("(sin proyecto)")}
              {l.session.branch && <span className="muted"> · {l.session.branch}</span>}
            </div>
            <div className="with-dot muted small">
              <i style={{ background: agentColor(l.session.agentId) }} />
              {l.session.agentName}
              {l.session.model && ` · ${modelName(l.session.model)}`} · {fmt.duration(l.session.endedAt - l.session.startedAt)}
            </div>
            <button className="link" onClick={() => openSession(l.session.id)}>
              {t("Ver la sesión ›")}
            </button>
          </>
        ) : (
          <span className="muted">{t("Aún no hay sesiones hoy.")}</span>
        )}
      </div>
    </div>
  );
}
