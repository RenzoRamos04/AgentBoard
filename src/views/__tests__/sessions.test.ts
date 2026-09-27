import { describe, expect, it } from "vitest";
import type { SessionRow } from "../../lib/api";
import { matchesQuery, quantile, sessionStats } from "../Sessions";
import { markerIndex } from "../SessionDetail";

const row = (costUsd: number, extra: Partial<SessionRow> = {}): SessionRow => ({
  id: String(costUsd), agentId: "claude-code", agentName: "Claude Code", projectId: 1, project: "web", branch: "main",
  startedAt: 0, endedAt: 60_000, model: "claude-opus-4-5", costUsd, calls: 1, cacheHit: 0.9, inputTokens: 0, outputTokens: 0,
  hasPrice: true, turns: 1, compactions: 0, toolCalls: 0, toolErrors: 0, subagentCalls: 0, isSubagent: false, projectKey: "/w", ...extra,
});

describe("sessionStats", () => {
  it("mediana de 1, 2 y 10 es 2", () => {
    expect(sessionStats([row(1), row(10), row(2)]).median).toBe(2);
  });
  it("cuenta las sesiones con compactaciones", () => {
    expect(sessionStats([row(1, { compactions: 2 }), row(2)]).withCompactions).toBe(1);
  });
  it("quantile por rango más cercano", () => {
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
    expect(quantile([], 0.5)).toBe(0);
  });
});

describe("matchesQuery", () => {
  it("busca en proyecto, rama, modelo y agente", () => {
    expect(matchesQuery(row(1, { branch: "feat/webhooks" }), "webhooks")).toBe(true);
    expect(matchesQuery(row(1), "OPUS")).toBe(true);
    expect(matchesQuery(row(1), "gemini")).toBe(false);
  });
});

describe("markerIndex", () => {
  it("coloca la compactación en la primera llamada posterior", () => {
    const tl = [{ ts: 10 }, { ts: 20 }, { ts: 30 }];
    expect(markerIndex(tl, 15)).toBe(1);
    expect(markerIndex(tl, 99)).toBe(2);
  });
});
