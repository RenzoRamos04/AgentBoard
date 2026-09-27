/** Variación de una cifra frente al periodo anterior, lista para pintar. */
export interface Delta {
  text: string;
  /** `good`/`bad` según si el cambio es favorable; `neutral` si no importa o no cambia. */
  tone: "good" | "bad" | "neutral";
}

const tone = (up: boolean, higherIsBetter: boolean | null): Delta["tone"] =>
  higherIsBetter == null ? "neutral" : up === higherIsBetter ? "good" : "bad";

/** Variación relativa: «▲ 18%», «▼ 3%», «= 0%» o «nuevo» si antes era 0. */
export function relDelta(cur: number, prev: number, higherIsBetter: boolean | null): Delta | null {
  if (prev === 0) return cur === 0 ? null : { text: "nuevo", tone: "neutral" };
  const change = (cur - prev) / Math.abs(prev);
  if (Math.abs(change) < 0.005) return { text: "= 0%", tone: "neutral" };
  const pct = Math.round(Math.abs(change) * 100).toLocaleString("en-US");
  return { text: `${change > 0 ? "▲" : "▼"} ${pct}%`, tone: tone(change > 0, higherIsBetter) };
}

/** Diferencia en puntos porcentuales de dos proporciones (0–1): «▼ 1.2 pp». */
export function ppDelta(cur: number, prev: number, higherIsBetter: boolean | null): Delta | null {
  const pp = (cur - prev) * 100;
  if (Math.abs(pp) < 0.05) return { text: "= 0 pp", tone: "neutral" };
  return { text: `${pp > 0 ? "▲" : "▼"} ${Math.abs(pp).toFixed(1)} pp`, tone: tone(pp > 0, higherIsBetter) };
}
