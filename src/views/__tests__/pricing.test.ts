import { describe, expect, it } from "vitest";
import { mergeOverrides, parsePrice } from "../Pricing";

describe("parsePrice", () => {
  it("acepta coma decimal y vacío como 0", () => {
    expect(parsePrice("1,25")).toBe(1.25);
    expect(parsePrice("")).toBe(0);
    expect(parsePrice(" 4 ")).toBe(4);
  });
  it("rechaza negativos y texto", () => {
    expect(parsePrice("-1")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
  });
});

describe("mergeOverrides", () => {
  const cur = [{ model: "a", input: 1, output: 2, cacheRead: 0, cacheWrite: 0, cacheWrite1h: 0 }];
  it("añade y sustituye modelos", () => {
    const out = mergeOverrides(cur, { a: ["3", "4", "", "", ""], "kimi-k2": ["1", "4", "0.1", "", ""] })!;
    expect(out).toEqual([
      { model: "a", input: 3, output: 4, cacheRead: 0, cacheWrite: 0, cacheWrite1h: 0 },
      { model: "kimi-k2", input: 1, output: 4, cacheRead: 0.1, cacheWrite: 0, cacheWrite1h: 0 },
    ]);
  });
  it("un valor inválido anula el guardado", () => {
    expect(mergeOverrides(cur, { a: ["-3", "", "", "", ""] })).toBeNull();
  });
});
