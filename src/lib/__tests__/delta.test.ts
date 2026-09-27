import { describe, expect, it } from "vitest";
import { ppDelta, relDelta } from "../delta";

describe("relDelta", () => {
  it("coste al alza es desfavorable", () => {
    expect(relDelta(118, 100, false)).toEqual({ text: "▲ 18%", tone: "bad" });
  });
  it("ahorro a la baja es desfavorable", () => {
    expect(relDelta(90, 100, true)).toEqual({ text: "▼ 10%", tone: "bad" });
  });
  it("sin anterior es nuevo", () => {
    expect(relDelta(5, 0, false)).toEqual({ text: "nuevo", tone: "neutral" });
    expect(relDelta(0, 0, false)).toBeNull();
  });
  it("sin cambio", () => {
    expect(relDelta(100, 100.2, false)).toEqual({ text: "= 0%", tone: "neutral" });
  });
});

describe("ppDelta", () => {
  it("cache hit a la baja en puntos", () => {
    expect(ppDelta(0.964, 0.976, true)).toEqual({ text: "▼ 1.2 pp", tone: "bad" });
  });
});
