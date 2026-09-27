import { describe, expect, it } from "vitest";
import { heatGrid, weekday } from "../Heatmap";
import { afterCompaction } from "../SessionDetail";
import { parsePriceFile } from "../Pricing";
import { filterItems } from "../../components/CommandPalette";

describe("heatGrid", () => {
  it("suma por día de la semana y hora y encuentra la franja más cara", () => {
    const tue11 = new Date(2026, 8, 22, 11).getTime(); // martes
    const { grid, peak } = heatGrid([
      { ts: tue11, costUsd: 5, calls: 3, sessions: 1, inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheWrite: 0 },
      { ts: tue11 + 7 * 864e5, costUsd: 2, calls: 1, sessions: 1, inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheWrite: 0 },
    ]);
    expect(weekday(tue11)).toBe(1);
    expect(grid[1][11].cost).toBe(7);
    expect(peak).toEqual({ day: 1, hour: 11, cost: 7 });
  });
});

describe("afterCompaction", () => {
  it("compara el coste por turno antes y después de la 3.ª compactación", () => {
    const turns = [1, 1, 1, 3, 3].map((c, i) => ({ ts: i * 10, costUsd: c }));
    expect(afterCompaction(turns, [5, 15, 25])).toEqual({ k: 3, ratio: 3 });
    expect(afterCompaction(turns, [])).toBeNull();
  });
});

describe("parsePriceFile", () => {
  it("acepta lista u objeto", () => {
    expect(parsePriceFile('[{"model":"Kimi-K2","input":1,"output":4}]')).toEqual({ "kimi-k2": ["1", "4", "", "", ""] });
    expect(parsePriceFile('{"x":{"input":0.5,"output":2,"cacheRead":0.05}}')).toEqual({ x: ["0.5", "2", "0.05", "", ""] });
  });
  it("rechaza precios inválidos", () => {
    expect(() => parsePriceFile('[{"model":"x","input":-1}]')).toThrow();
  });
});

describe("filterItems", () => {
  it("todas las palabras deben aparecer", () => {
    const items = [
      { id: "1", group: "Proyectos", label: "tuio-api", run: () => {} },
      { id: "2", group: "Apartados", label: "Sesiones", hint: "¿Qué sesión se disparó?", run: () => {} },
    ];
    expect(filterItems(items, "tuio").map((i) => i.id)).toEqual(["1"]);
    expect(filterItems(items, "sesión disparó").map((i) => i.id)).toEqual(["2"]);
    expect(filterItems(items, "").length).toBe(2);
  });
});

import { niceStep } from "../../components/Charts";
describe("niceStep", () => {
  it("redondea el paso del eje", () => {
    expect(niceStep(11 / 3)).toBe(5);
    expect(niceStep(15)).toBe(20);
    expect(niceStep(0.3)).toBeCloseTo(0.5);
    expect(niceStep(0)).toBe(1);
  });
});

import { tickFormat } from "../../components/Charts";
import { fmt as f2 } from "../../lib/format";
describe("tickFormat", () => {
  it("marcas cortas para importes y cantidades grandes", () => {
    const usd = tickFormat(f2.usd);
    expect([0, 2.5, 250, 1500, 15000].map(usd)).toEqual(["$0", "$2.50", "$250", "$1.5K", "$15K"]);
    const n = tickFormat(f2.int);
    expect([500, 15000].map(n)).toEqual(["500", "15K"]);
  });
});

import { level } from "../Heatmap";
describe("level", () => {
  it("5 niveles de intensidad y 0 sin gasto", () => {
    expect([0, 0.5, 2, 5, 8, 10].map((v) => level(v, 10))).toEqual([0, 1, 1, 3, 4, 5]);
    expect(level(3, 0)).toBe(0);
  });
});
