import { describe, expect, it } from "vitest";
import type { SessionRow } from "../../lib/api";
import { ACTIVE_MS, currentSessions, todayRanges } from "../TodayLive";

describe("todayRanges", () => {
  it("hoy desde las 00:00 y ayer hasta la misma hora", () => {
    const now = new Date(2026, 8, 27, 14, 0, 0).getTime();
    const r = todayRanges(now);
    expect(new Date(r.today)).toEqual(new Date(2026, 8, 27));
    expect(new Date(r.yesterday)).toEqual(new Date(2026, 8, 26));
    expect(new Date(r.sameTimeYesterday)).toEqual(new Date(2026, 8, 26, 14, 0, 0));
  });
});

describe("currentSessions", () => {
  const s = (id: string, startedAt: number, endedAt: number) => ({ id, startedAt, endedAt }) as SessionRow;
  const now = 100 * ACTIVE_MS;
  it("con varias activas, todas y la abierta más recientemente primero", () => {
    // Claude Code lleva horas escribiendo; Codex se acaba de abrir: Codex va primero.
    const claude = s("claude", now - 28 * ACTIVE_MS, now - 1000);
    const codex = s("codex", now - 60_000, now - 30_000);
    const old = s("old", now - 50 * ACTIVE_MS, now - 30 * ACTIVE_MS);
    const r = currentSessions([claude, old, codex], now);
    expect(r.active).toBe(true);
    expect(r.sessions.map((x) => x.id)).toEqual(["codex", "claude"]);
  });
  it("sin activas, la última usada", () => {
    const r = currentSessions([s("a", 0, now - 5 * ACTIVE_MS), s("b", 0, now - 2 * ACTIVE_MS)], now);
    expect(r).toEqual({ sessions: [s("b", 0, now - 2 * ACTIVE_MS)], active: false });
    expect(currentSessions([], now)).toEqual({ sessions: [], active: false });
  });
});
