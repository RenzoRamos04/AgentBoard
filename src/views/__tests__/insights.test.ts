import { describe as group, expect, it } from "vitest";
import { describe } from "../Insights";

group("describe", () => {
  it("compactaciones en singular y plural, con enlace a Sesiones", () => {
    const one = describe({ kind: "compactions", severity: "critical", params: { n: 1, project: "web", branch: "main", max: 4 }, message: "" });
    expect(one.title).toBe("1 sesión con 3+ compactaciones");
    expect(one.body).toContain("web · main");
    expect(one.section).toBe("sessions");
    expect(describe({ kind: "compactions", severity: "critical", params: { n: 2, project: "web", branch: "", max: 3 }, message: "" }).title).toBe("2 sesiones con 3+ compactaciones");
  });
  it("herramienta de shell enlaza a Shell Commands con su comando", () => {
    const d = describe({ kind: "tool_errors", severity: "warn", params: { tool: "Bash", rate: 0.14, errors: 14, calls: 100, command: "npm", commandErrors: 9 }, message: "" });
    expect(d.title).toBe("Bash falla un 14%");
    expect(d.body).toContain("npm concentra 9 errores");
    expect(d.section).toBe("shell");
  });
  it("modelo caro con el ahorro", () => {
    const d = describe({ kind: "expensive_model", severity: "warn", params: { model: "claude-opus-4-5", cost: 10, saving: 6, share: 0.5, cheaper: "claude-sonnet-5" }, message: "" });
    expect(d.title).toBe("Opus 4.5 haciendo exploración");
    expect(d.body).toContain("$6.00");
  });
});
