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

/** `compact`: etiqueta y valor en una sola línea (cifras de apoyo, como en Sesiones). */
export const Kpis = ({ items, columns, compact = false }: { items: Kpi[]; columns?: number; compact?: boolean }) => (
  <div className={`kpis ${compact ? "kpis-compact" : ""}`} style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
    {items.map((k) => (
      <div className="kpi" key={k.label} title={compact ? k.hint : undefined}>
        <span className="kpi-head">
          <span className="kpi-label">{k.label}</span>
          {k.delta && (
            <span className={`kpi-delta num ${k.delta.tone}`} title={t("frente al periodo anterior")}>
              {t(k.delta.text)}
            </span>
          )}
        </span>
        <strong className={`kpi-value ${k.tone ?? ""}`}>{k.value}</strong>
        {k.hint && !compact && <span className="kpi-hint">{k.hint}</span>}
      </div>
    ))}
  </div>
);
