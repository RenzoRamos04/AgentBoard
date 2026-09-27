import { describe, expect, it } from "vitest";
import type { SessionRow } from "../../lib/api";
import { ACTIVE_MS, lastUsedSession, todayRanges } from "../TodayLive";

describe("todayRanges", () => {
  it("hoy desde las 00:00 y ayer hasta la misma hora", () => {
    const now = new Date(2026, 8, 27, 14, 0, 0).getTime();
    const r = todayRanges(now);
    expect(new Date(r.today)).toEqual(new Date(2026, 8, 27));
    expect(new Date(r.yesterday)).toEqual(new Date(2026, 8, 26));
    expect(new Date(r.sameTimeYesterday)).toEqual(new Date(2026, 8, 26, 14, 0, 0));
  });
});

describe("lastUsedSession", () => {
  const s = (id: string, startedAt: number, endedAt: number) => ({ id, startedAt, endedAt }) as SessionRow;
  const now = 100 * ACTIVE_MS;
  it("la de datos más recientes, aunque se abriera hace horas", () => {
    const claude = s("claude", now - 28 * ACTIVE_MS, now - 1000);
    const codex = s("codex", now - 60_000, now - 30_000);
    expect(lastUsedSession([codex, claude], now)).toEqual({ session: claude, active: true });
  });
  it("marca si ya no está activa", () => {
    expect(lastUsedSession([s("a", 0, now - 5 * ACTIVE_MS), s("b", 0, now - 2 * ACTIVE_MS)], now)).toEqual({ session: s("b", 0, now - 2 * ACTIVE_MS), active: false });
    expect(lastUsedSession([], now)).toBeNull();
  });
});
