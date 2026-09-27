import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { api, type BreakdownRow } from "../lib/api";
import { fmt } from "../lib/format";
import { getLang, LangContext, resolveLang, setLang, t, type Lang } from "../lib/i18n";
import { InlineBar } from "../components/Charts";
import { TodayLive, todayRanges } from "./TodayLive";

/** Enseña la ventana principal (y el backend esconde este panel). */
const openMain = () => {
  void invoke("show_main").catch(() => {});
};

/** Panel emergente de la bandeja: lo de hoy en compacto, como un applet. */
export function TrayPanel() {
  const [lang, setLangState] = useState<Lang>(getLang());
  const [refresh, setRefresh] = useState(0);
  const [projects, setProjects] = useState<BreakdownRow[]>([]);

  // Mismo idioma que la app (el panel no pasa por `App`).
  useEffect(() => {
    api
      .settings()
      .then((s) => {
        const l = resolveLang(s.language);
        setLang(l);
        setLangState(l);
      })
      .catch(() => {});
  }, []);

  // La ventana vive oculta: se refresca sola cada 30 s para abrirse al día.
  useEffect(() => {
    const id = setInterval(() => setRefresh((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // En vivo, como los applets: cada relectura de logs (`ingest://done`) y cada
  // apertura del panel (`panel://shown`) refrescan al instante.
  useEffect(() => {
    const bump = () => setRefresh((n) => n + 1);
    const offs = [listen("ingest://done", bump), listen("panel://shown", bump)];
    return () => {
      for (const off of offs) off.then((f) => f());
    };
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .breakdown({ from: todayRanges(Date.now()).today }, "project")
      .then((rows) => alive && setProjects(rows.slice(0, 5)))
      .catch(() => alive && setProjects([]));
    return () => {
      alive = false;
    };
  }, [refresh]);

  const max = projects[0]?.costUsd ?? 0;
  return (
    <LangContext.Provider value={lang}>
      <div className="tray-panel">
        <TodayLive filter={{}} refresh={refresh} openSession={openMain} />
        {projects.length > 0 && (
          <section className="tray-panel-projects">
            <h2>{t("Proyectos de hoy")}</h2>
            {projects.map((p) => (
              <div key={p.key} className="tray-panel-project">
                <span className="tray-panel-name">{p.key ? p.label : t("(sin proyecto)")}</span>
                <InlineBar value={p.costUsd} max={max} />
                <span className="num">{fmt.usd(p.costUsd)}</span>
              </div>
            ))}
          </section>
        )}
        <footer className="tray-panel-foot">
          <button className="button" onClick={openMain}>
            {t("Abrir AgentBoard")}
          </button>
        </footer>
      </div>
    </LangContext.Provider>
  );
}
