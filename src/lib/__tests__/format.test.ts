import { describe, expect, it } from "vitest";
import { fmt, modelName } from "../format";

describe("modelName", () => {
  it("acorta modelos de Claude", () => {
    expect(modelName("claude-opus-5-5")).toBe("Opus 5.5");
    expect(modelName("claude-sonnet-4-5")).toBe("Sonnet 4.5");
    expect(modelName("claude-fable-5-1")).toBe("Fable 5.1");
    expect(modelName("claude-haiku-4-5")).toBe("Haiku 4.5");
  });
  it("deja intactos los demás", () => {
    expect(modelName("gpt-5-codex")).toBe("gpt-5-codex");
    expect(modelName("gemini-2.5-pro")).toBe("gemini-2.5-pro");
    expect(modelName("big-pickle")).toBe("big-pickle");
  });
});

describe("duraciones", () => {
  it("formatea minutos y horas", () => {
    expect(fmt.duration(20_000)).toBe("< 1 min");
    expect(fmt.duration(42 * 60_000)).toBe("42 min");
    expect(fmt.duration(155 * 60_000)).toBe("2 h 35 min");
    expect(fmt.duration(120 * 60_000)).toBe("2 h");
  });
  it("formatea latencias", () => {
    expect(fmt.ms(180)).toBe("180 ms");
    expect(fmt.ms(2100)).toBe("2.1 s");
    expect(fmt.ms(38_000)).toBe("38 s");
    expect(fmt.ms(130_000)).toBe("2 m 10 s");
  });
});
