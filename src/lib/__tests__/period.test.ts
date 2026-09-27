import { describe, expect, it } from "vitest";
import { periodRange, previousRange, projectMonth, PERIODS } from "../period";

describe("periodRange", () => {
  const now = new Date(2026, 8, 25, 15, 0, 0); // 25 sep 2026, hora local

  it("cubre los últimos N días incluido hoy", () => {
    const r = periodRange({ kind: "7d" }, now);
    // desde el día 19 a las 00:00 locales
    expect(new Date(r.from!)).toEqual(new Date(2026, 8, 19, 0, 0, 0));
    expect(r.to).toBeUndefined();
  });

  it('"Todo" no pone límites', () => {
    expect(periodRange({ kind: "all" }, now)).toEqual({});
  });

  it("30 días arranca 29 días atrás a medianoche", () => {
    const r = periodRange({ kind: "30d" }, now);
    expect(new Date(r.from!)).toEqual(new Date(2026, 7, 27, 0, 0, 0));
  });

  it("ofrece hoy/7/30/60/90/todo", () => {
    expect(PERIODS.map((p) => p.kind)).toEqual(["today", "7d", "30d", "60d", "90d", "all"]);
  });

  it('"Hoy" empieza a las 00:00 locales de hoy', () => {
    const r = periodRange({ kind: "today" }, now);
    expect(new Date(r.from!)).toEqual(new Date(2026, 8, 25, 0, 0, 0));
  });
});

describe("projectMonth", () => {
  it("proyecta linealmente: 20 el día 10 de un mes de 30 → 60", () => {
    const day10 = new Date(2026, 8, 10, 12, 0, 0); // septiembre tiene 30 días
    expect(projectMonth(20, day10)).toBeCloseTo(60, 5);
  });
});

describe("previousRange", () => {
  it("30 días desde el 29 ago → del 30 jul al 28 ago incluidos", () => {
    const now = new Date(2026, 8, 27, 10, 0, 0); // 27 sep: el periodo empieza el 29 ago
    const r = previousRange({ kind: "30d" }, now)!;
    expect(new Date(r.from)).toEqual(new Date(2026, 6, 30, 0, 0, 0));
    expect(new Date(r.to)).toEqual(new Date(2026, 7, 29, 0, 0, 0)); // exclusivo
  });

  it('el anterior de "Hoy" es ayer entero', () => {
    const r = previousRange({ kind: "today" }, new Date(2026, 8, 27, 15, 0, 0))!;
    expect(new Date(r.from)).toEqual(new Date(2026, 8, 26, 0, 0, 0));
    expect(new Date(r.to)).toEqual(new Date(2026, 8, 27, 0, 0, 0));
  });

  it('"Todo" no tiene anterior', () => {
    expect(previousRange({ kind: "all" })).toBeNull();
  });
});
