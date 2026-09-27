import { useState } from "react";
import type { Insight } from "../lib/api";
import { fmt, modelName } from "../lib/format";
import { t } from "../lib/i18n";
import type { SectionId } from "../lib/sections";

const num = (v: string | number | undefined) => Number(v ?? 0);
const str = (v: string | number | undefined) => String(v ?? "");

/** Título, texto y enlace de un aviso, en el idioma activo. */
export interface Described {
  title: string;
  body: string;
  cta: string;
  section: SectionId;
  sessionId?: string;
  /** Abre el detalle de ese proyecto (clave del repo). */
  projectKey?: string;
}

export function describe(i: Insight): Described {
  const p = i.params;
  switch (i.kind) {
    case "compactions": {
      const place = str(p.branch) ? `${str(p.project)} · ${str(p.branch)}` : str(p.project);
      return {
        title: num(p.n) === 1 ? t("1 sesión con 3+ compactaciones") : t("{n} sesiones con 3+ compactaciones", { n: num(p.n) }),
        body: t("La peor ({max} compactaciones) en {place}. Divide la tarea o delega en subagentes.", { max: num(p.max), place }),
        cta: p.sessionId ? t("Ver la sesión") : t("Ver proyectos"),
        section: "projects",
        sessionId: p.sessionId ? str(p.sessionId) : undefined,
      };
    }
    case "expensive_model":
      return {
        title: t("{model} haciendo exploración", { model: modelName(str(p.model)) }),
        body: t("El {share} del gasto en exploración y conversación ({cost}) va a {model}. Con {cheaper} serían ≈ {saving} menos.", {
          share: fmt.pct(num(p.share)),
          cost: fmt.usd(num(p.cost)),
          model: modelName(str(p.model)),
          cheaper: modelName(str(p.cheaper)),
          saving: fmt.usd(num(p.saving)),
        }),
        cta: t("Ver By Model"),
        section: "model",
      };
    case "tool_errors":
      return {
        title: t("{tool} falla un {rate}", { tool: str(p.tool), rate: fmt.pct(num(p.rate)) }),
        body:
          t("{errors} de {calls} usos con error.", { errors: fmt.int(num(p.errors)), calls: fmt.int(num(p.calls)) }) +
          (p.command ? " " + t("{command} concentra {n} errores.", { command: str(p.command), n: fmt.int(num(p.commandErrors)) }) : ""),
        cta: p.command ? t("Ver Shell Commands") : t("Ver Tools"),
        section: p.command ? "shell" : "tools",
      };
    case "spend_spike":
      return {
        title: t("Pico el {date}: {cost}", { date: fmt.day(num(p.ts)), cost: fmt.usd(num(p.cost)) }),
        body: t("{times}× la media diaria ({mean}).", { times: num(p.times).toFixed(1), mean: fmt.usd(num(p.mean)) }),
        cta: t("Ver Daily Activity"),
        section: "daily",
      };
    case "cache_drop":
      return {
        title: t("El cache hit baja {pp} pp", { pp: num(p.pp).toFixed(1) }),
        body: t("De {before} a {now} frente al periodo anterior: más tokens a precio completo.", { before: fmt.pct(num(p.before)), now: fmt.pct(num(p.now)) }),
        cta: t("Ver By Model"),
        section: "model",
      };
    case "unpriced_models":
      return {
        title: num(p.n) === 1 ? t("1 modelo sin precio") : t("{n} modelos sin precio", { n: num(p.n) }),
        body: t("{models}: {calls} llamadas cuentan como $0.", { models: str(p.models), calls: fmt.int(num(p.calls)) }),
        cta: t("Completar precios"),
        section: "pricing",
      };
    case "project_share":
      return {
        title: t("{project} concentra el {share} del gasto", { project: str(p.project), share: fmt.pct(num(p.share)) }),
        body: t("{cost} de {n} proyectos en el periodo.", { cost: fmt.usd(num(p.cost)), n: num(p.n) }),
        cta: t("Ver el proyecto"),
        section: "projects",
        projectKey: str(p.key),
      };
    case "model_share":
      return {
        title: t("El {share} del gasto va a {model}", { share: fmt.pct(num(p.share)), model: modelName(str(p.model)) }),
        body: t("{cost} en un solo modelo: revisa si todas esas tareas lo necesitan.", { cost: fmt.usd(num(p.cost)) }),
        cta: t("Ver By Model"),
        section: "model",
      };
    case "top_session": {
      const where = str(p.branch) ? `${str(p.project)} · ${str(p.branch)}` : str(p.project);
      return {
        title: t("Sesión más cara: {cost}", { cost: fmt.usd(num(p.cost)) }),
        body: t("{share} del gasto en {where}{model}, durante {dur}.", {
          share: fmt.pct(num(p.share)),
          where,
          model: str(p.model) ? ` (${modelName(str(p.model))})` : "",
          dur: fmt.duration(num(p.durationMs)),
        }),
        cta: t("Ver la sesión"),
        section: "projects",
        sessionId: str(p.sessionId),
      };
    }
    case "command_errors":
      return {
        title: t("{command} falla un {rate}", { command: str(p.command), rate: fmt.pct(num(p.rate)) }),
        body: t("Es el comando con más errores: {errors} de {calls} ejecuciones.", { errors: fmt.int(num(p.errors)), calls: fmt.int(num(p.calls)) }),
        cta: t("Ver Shell Commands"),
        section: "shell",
      };
    case "mcp_errors":
      return {
        title: t("El servidor MCP {server} falla un {rate}", { server: str(p.server), rate: fmt.pct(num(p.rate)) }),
        body: t("{errors} de {calls} usos con error.", { errors: fmt.int(num(p.errors)), calls: fmt.int(num(p.calls)) }),
        cta: t("Ver MCP Servers"),
        section: "mcp",
      };
    case "low_cache":
      return {
        title: t("{model} apenas usa la caché", { model: modelName(str(p.model)) }),
        body: t("Cache hit del {hit} en {calls} llamadas: casi toda la entrada se paga a precio completo.", { hit: fmt.pct(num(p.cacheHit)), calls: fmt.int(num(p.calls)) }),
        cta: t("Ver By Model"),
        section: "model",
      };
    case "one_shot_low":
      return {
        title: t("Solo el {rate} sale a la primera", { rate: fmt.pct(num(p.rate)) }),
        body: t("De {n} turnos con ediciones, el resto repite archivos o falla al editar. Prompts más concretos suelen ayudar.", { n: fmt.int(num(p.turns)) }),
        cta: t("Ver By Activity"),
        section: "activity",
      };
    case "one_shot_good":
      return {
        title: t("El {rate} sale a la primera", { rate: fmt.pct(num(p.rate)) }),
        body: t("{n} turnos con ediciones sin repetir archivos ni fallar.", { n: fmt.int(num(p.turns)) }),
        cta: t("Ver By Activity"),
        section: "activity",
      };
    case "subagent_share":
      return {
        title: t("Los subagentes suman el {share}", { share: fmt.pct(num(p.share)) }),
        body: t("{cost} en subagentes; el que más gasta: {top}.", { cost: fmt.usd(num(p.cost)), top: str(p.top) }),
        cta: t("Ver Agent Types"),
        section: "agents",
      };
    case "pace":
      return {
        title: t("Ritmo alto: {now}/h", { now: fmt.usd(num(p.now)) }),
        body: t("{times}× tu media por hora activa ({avg}/h).", { times: num(p.times).toFixed(1), avg: fmt.usd(num(p.avg)) }),
        cta: t("Ver Daily Activity"),
        section: "daily",
      };
    case "after_hours":
      return {
        title: t("El {share} del gasto es fuera de horario", { share: fmt.pct(num(p.share)) }),
        body: t("{cost} antes de las 9 o desde las 19 h (hora local).", { cost: fmt.usd(num(p.cost)) }),
        cta: t("Ver Daily Activity"),
        section: "daily",
      };
    case "session_cost_up":
      return {
        title: t("Cada sesión cuesta un {change} más", { change: fmt.pct(num(p.change)) }),
        body: t("{now} de media frente a {before} en el periodo anterior.", { now: fmt.usd(num(p.now)), before: fmt.usd(num(p.before)) }),
        cta: t("Ver proyectos"),
        section: "projects",
      };
    case "unused_agents":
      return {
        title: num(p.n) === 1 ? t("{agents} sin uso", { agents: str(p.agents) }) : t("{n} agentes sin uso", { n: num(p.n) }),
        body: num(p.n) === 1 ? t("Está instalado pero no tiene llamadas en el periodo.") : t("{agents}: instalados pero sin llamadas en el periodo.", { agents: str(p.agents) }),
        cta: t("Ver By Agent"),
        section: "agent",
      };
    case "cache_savings":
      return {
        title: t("La caché te ahorró {saving}", { saving: fmt.usd(num(p.saving)) }),
        body: t("{times}× lo que gastaste ({cost}): el contexto reutilizado sale casi gratis.", { times: num(p.times).toFixed(1), cost: fmt.usd(num(p.cost)) }),
        cta: t("Ver By Model"),
        section: "model",
      };
    default:
      // Tipo nuevo del núcleo que esta interfaz aún no conoce: su texto en español.
      return { title: i.message, body: "", cta: t("Ver resumen"), section: "overview" };
  }
}

const MARK = { critical: "!", warn: "!", info: "i", good: "✓" } as const;
const SEVERITY = { critical: "Importante", warn: "Aviso", info: "Información", good: "Va bien" } as const;
/** Avisos visibles antes de «Ver todos». */
const FIRST = 4;

/** Tarjeta «Lo que deberías saber» de la portada. */
export function Insights({
  items,
  open,
  openSession,
  openProject,
}: {
  items: Insight[];
  open: (s: SectionId) => void;
  openSession: (id: string) => void;
  openProject: (key: string) => void;
}) {
  const [all, setAll] = useState(false);
  if (!items.length)
    return (
      <div className="insight insight-ok">
        <span className="insight-mark good" aria-hidden>
          ✓
        </span>
        <div className="insight-text">
          <b>{t("Todo en orden")}</b>
          <span>{t("Sin compactaciones repetidas, herramientas que fallen ni picos de gasto en este periodo.")}</span>
        </div>
      </div>
    );
  return (
    <>
    <ul className="insights">
      {(all ? items : items.slice(0, FIRST)).map((i, k) => {
        const d = describe(i);
        return (
          <li key={k} className="insight">
            <span className={`insight-mark ${i.severity}`} aria-label={t(SEVERITY[i.severity])} title={t(SEVERITY[i.severity])}>
              {MARK[i.severity]}
            </span>
            <div className="insight-text">
              <b>{d.title}</b>
              {d.body && <span>{d.body}</span>}
              <button className="link" onClick={() => (d.sessionId ? openSession(d.sessionId) : d.projectKey != null ? openProject(d.projectKey) : open(d.section))}>
                {d.cta} ›
              </button>
            </div>
          </li>
        );
      })}
    </ul>
    {items.length > FIRST && (
      <button className="link insights-more" onClick={() => setAll((v) => !v)} aria-expanded={all}>
        {all ? t("Ver menos ▴") : t("Ver los {n} avisos ▾", { n: items.length })}
      </button>
    )}
    </>
  );
}
