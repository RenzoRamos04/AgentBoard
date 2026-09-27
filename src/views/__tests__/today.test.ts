import { describe, expect, it } from "vitest";
import type { SessionRow } from "../../lib/api";
import { ACTIVE_MS, latestSession, todayRanges } from "../TodayLive";

describe("todayRanges", () => {
  it("hoy desde las 00:00 y ayer hasta la misma hora", () => {
    const now = new Date(2026, 8, 27, 14, 0, 0).getTime();
    const r = todayRanges(now);
    expect(new Date(r.today)).toEqual(new Date(2026, 8, 27));
    expect(new Date(r.yesterday)).toEqual(new Date(2026, 8, 26));
    expect(new Date(r.sameTimeYesterday)).toEqual(new Date(2026, 8, 26, 14, 0, 0));
  });
});

describe("latestSession", () => {
  const s = (id: string, endedAt: number) => ({ id, endedAt }) as SessionRow;
  it("elige la de actividad más reciente y dice si sigue activa", () => {
    const now = 10 * ACTIVE_MS;
    expect(latestSession([s("a", now - 5 * ACTIVE_MS), s("b", now - 60_000)], now)).toEqual({ session: s("b", now - 60_000), active: true });
    expect(latestSession([s("a", now - 2 * ACTIVE_MS)], now)?.active).toBe(false);
    expect(latestSession([], now)).toBeNull();
  });
});
