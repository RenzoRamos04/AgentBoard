import type { Insight } from "../lib/api";
import { fmt, modelName } from "../lib/format";
import { t } from "../lib/i18n";
import type { SectionId } from "../lib/sections";

const num = (v: string | number | undefined) => Number(v ?? 0);
const str = (v: string | number | undefined) => String(v ?? "");

/** Título, texto y enlace de un aviso, en el idioma activo. */
export function describe(i: Insight): { title: string; body: string; cta: string; section: SectionId; sessionId?: string } {
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
  }
}

const MARK = { critical: "!", warn: "!", info: "i" } as const;

/** Tarjeta «Lo que deberías saber» de la portada. */
export function Insights({ items, open, openSession }: { items: Insight[]; open: (s: SectionId) => void; openSession: (id: string) => void }) {
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
    <ul className="insights">
      {items.map((i, k) => {
        const d = describe(i);
        return (
          <li key={k} className="insight">
            <span className={`insight-mark ${i.severity}`} aria-label={t(i.severity === "critical" ? "Importante" : i.severity === "warn" ? "Aviso" : "Información")}>
              {MARK[i.severity]}
            </span>
            <div className="insight-text">
              <b>{d.title}</b>
              <span>{d.body}</span>
              <button className="link" onClick={() => (d.sessionId ? openSession(d.sessionId) : open(d.section))}>
                {d.cta} ›
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
