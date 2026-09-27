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

/**
 * Sesiones que mostrar: todas las activas (llamadas en los últimos 15 min), la abierta más
 * recientemente primero; si no hay ninguna, la última usada. Así una sesión larga que sigue
 * escribiendo no tapa a la que se acaba de abrir en otro agente.
 */
export function currentSessions(rows: SessionRow[], now: number): { sessions: SessionRow[]; active: boolean } {
  const active = rows.filter((s) => now - s.endedAt < ACTIVE_MS).sort((a, b) => b.startedAt - a.startedAt);
  if (active.length) return { sessions: active, active: true };
  const last = rows.reduce<SessionRow | null>((a, b) => (!a || b.endedAt > a.endedAt ? b : a), null);
  return { sessions: last ? [last] : [], active: false };
}

/** Sesiones activas visibles en la tarjeta; el resto se resume en «+N más». */
const SHOWN = 3;

interface Live {
  today: number;
  yesterday: number;
  burn: number;
  hours: Point[];
  current: { sessions: SessionRow[]; active: boolean };
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
      api.sessions(today, 200),
    ])
      .then(async ([s, y, hours, sessions]) => {
        // Sin sesiones hoy, la última usada de los últimos 30 días.
        const rows = sessions.sessions.length ? sessions.sessions : (await api.sessions({ ...scope, from: at - 30 * DAY_MS }, 200)).sessions;
        if (!alive) return;
        setLive({ today: s.costUsd, yesterday: y.costUsd, burn: s.burnRateUsdH, hours, current: currentSessions(rows, at) });
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
  const cur = live.current;

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
        <Columns points={byHour} format={fmt.usd} height={cur.sessions.length > 1 ? 90 : 120} yAxis={false} axis={(h) => `${String(h).padStart(2, "0")}h`} />
      </div>
      <div className={`today-session ${cur.active ? "active" : ""}`}>
        {cur.sessions.length ? (
          <>
            <div className="today-session-head">
              <span className={`status-dot ${cur.active ? "on" : ""}`} />
              <span>
                {cur.active
                  ? cur.sessions.length === 1
                    ? t("Activa ahora")
                    : t("{n} activas ahora", { n: cur.sessions.length })
                  : t("Última sesión · {ago}", { ago: ago(now - cur.sessions[0].endedAt) })}
              </span>
            </div>
            {cur.sessions.slice(0, SHOWN).map((x) => (
              <button key={x.id} className="today-session-row" onClick={() => openSession(x.id)} title={x.model ? `${modelName(x.model)} · ${t("Ver la sesión ›")}` : t("Ver la sesión ›")}>
                <span className="today-session-main">
                  <span className="today-session-name">
                    {x.project ?? t("(sin proyecto)")}
                    {x.branch && <span className="muted"> · {x.branch}</span>}
                  </span>
                  <span className="with-dot muted small">
                    <i style={{ background: agentColor(x.agentId) }} />
                    {x.agentName} · {t("empezó {ago}", { ago: ago(now - x.startedAt) })}
                  </span>
                </span>
                <span className="num cost">{fmt.usd(x.costUsd)}</span>
                <span className="today-session-go" aria-hidden>
                  ›
                </span>
              </button>
            ))}
            {cur.sessions.length > SHOWN && <span className="muted small">{t("+{n} más", { n: cur.sessions.length - SHOWN })}</span>}
          </>
        ) : (
          <span className="muted">{t("Aún no hay sesiones.")}</span>
        )}
      </div>
    </div>
  );
}
