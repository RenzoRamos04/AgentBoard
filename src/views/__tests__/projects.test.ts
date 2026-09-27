import { describe, expect, it } from "vitest";
import type { ProjectSummary } from "../../lib/api";
import { matchesProject, projectStats } from "../Projects";

const p = (name: string, costUsd: number, extra: Partial<ProjectSummary> = {}): ProjectSummary => ({
  key: `/${name}`, projectId: 1, name, path: `/${name}`, agents: [{ id: "claude-code", name: "Claude Code" }], branches: ["main"],
  model: "claude-opus-4-5", sessions: 1, activeMs: 60_000, turns: 1, compactions: 0, toolCalls: 0, toolErrors: 0, subagentCalls: 0,
  costUsd, calls: 1, cacheHit: 0.9, hasPrice: true, firstTs: 0, lastTs: 0, ...extra,
});

describe("projectStats", () => {
  it("media, más caro, tiempo activo y compactaciones", () => {
    const s = projectStats([p("a", 10, { compactions: 2 }), p("b", 30), p("c", 20)]);
    expect(s.avg).toBe(20);
    expect(s.top?.name).toBe("b");
    expect(s.activeMs).toBe(180_000);
    expect(s.withCompactions).toBe(1);
  });
});

describe("matchesProject", () => {
  it("busca por nombre, rama, modelo y agente", () => {
    const x = p("tuio-api", 1, { branches: ["feat/webhooks"], agents: [{ id: "opencode", name: "OpenCode" }] });
    expect(matchesProject(x, "webhooks")).toBe(true);
    expect(matchesProject(x, "opencode")).toBe(true);
    expect(matchesProject(x, "gemini")).toBe(false);
  });
});
