import type { Delta } from "../lib/delta";
import { t } from "../lib/i18n";

export interface Kpi {
  label: string;
  value: string;
  hint?: string;
  tone?: "accent" | "good" | "warn";
  /** Variación frente al periodo anterior. */
  delta?: Delta | null;
}

export const Kpis = ({ items, columns }: { items: Kpi[]; columns?: number }) => (
  <div className="kpis" style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
    {items.map((k) => (
      <div className="kpi" key={k.label}>
        <span className="kpi-head">
          <span className="kpi-label">{k.label}</span>
          {k.delta && (
            <span className={`kpi-delta num ${k.delta.tone}`} title={t("frente al periodo anterior")}>
              {t(k.delta.text)}
            </span>
          )}
        </span>
        <strong className={`kpi-value ${k.tone ?? ""}`}>{k.value}</strong>
        {k.hint && <span className="kpi-hint">{k.hint}</span>}
      </div>
    ))}
  </div>
);
