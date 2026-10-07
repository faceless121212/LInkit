import { describe, expect, it } from "vitest";
import { bucketByDay, monthGrid, weekDays } from "./calendar";
import { dayKeyInTz, moveToDay } from "./tz";

describe("timezone day bucketing", () => {
  it("puts a post scheduled for 23:30 Warsaw on the Warsaw day, not the UTC day", () => {
    // 2026-03-10 23:30 Europe/Warsaw (CET, UTC+1) == 2026-03-10T22:30:00Z
    const post = { status: "scheduled" as const, scheduled_at: "2026-03-10T22:30:00.000Z", published_at: null };
    const buckets = bucketByDay([post], "Europe/Warsaw");
    expect([...buckets.keys()]).toEqual(["2026-03-10"]);
  });

  it("handles summer time: 23:30 Warsaw (CEST, UTC+2) is 21:30Z the same day", () => {
    const post = { status: "scheduled" as const, scheduled_at: "2026-07-01T21:30:00.000Z", published_at: null };
    expect([...bucketByDay([post], "Europe/Warsaw").keys()]).toEqual(["2026-07-01"]);
    // In UTC it is still the same day; 00:30 Warsaw would be the previous UTC day:
    const late = { status: "scheduled" as const, scheduled_at: "2026-06-30T22:30:00.000Z", published_at: null };
    expect([...bucketByDay([late], "Europe/Warsaw").keys()]).toEqual(["2026-07-01"]);
    expect([...bucketByDay([late], "UTC").keys()]).toEqual(["2026-06-30"]);
  });

  it("uses published_at for published posts and skips posts with no date", () => {
    const published = {
      status: "published" as const,
      scheduled_at: "2026-03-01T10:00:00.000Z",
      published_at: "2026-03-02T10:00:00.000Z",
    };
    const idea = { status: "idea" as const, scheduled_at: null, published_at: null };
    const buckets = bucketByDay([published, idea], "Europe/Warsaw");
    expect([...buckets.keys()]).toEqual(["2026-03-02"]);
  });

  it("dayKeyInTz matches bucketByDay", () => {
    expect(dayKeyInTz("2026-03-10T22:30:00.000Z", "Europe/Warsaw")).toBe("2026-03-10");
    expect(dayKeyInTz("2026-03-10T23:30:00.000Z", "Europe/Warsaw")).toBe("2026-03-11");
  });
});

describe("moveToDay keeps wall-clock time", () => {
  it("moves 23:30 Warsaw to another day at 23:30 Warsaw", () => {
    const moved = moveToDay("2026-03-10T22:30:00.000Z", "2026-03-12", "Europe/Warsaw");
    expect(dayKeyInTz(moved, "Europe/Warsaw")).toBe("2026-03-12");
    expect(moved.toISOString()).toBe("2026-03-12T22:30:00.000Z");
  });

  it("keeps 09:00 local across a DST change", () => {
    // 2026-03-28 09:00 CET (UTC+1) -> 2026-03-30 09:00 CEST (UTC+2)
    const moved = moveToDay("2026-03-28T08:00:00.000Z", "2026-03-30", "Europe/Warsaw");
    expect(moved.toISOString()).toBe("2026-03-30T07:00:00.000Z");
  });
});

describe("grids", () => {
  it("month grid is 6x7 and starts on a Monday", () => {
    const grid = monthGrid("2026-10-15");
    expect(grid).toHaveLength(6);
    expect(grid.every((r) => r.length === 7)).toBe(true);
    expect(grid[0][0]).toBe("2026-09-28"); // Monday before 1 Oct 2026 (Thursday)
    expect(grid.flat()).toContain("2026-10-01");
    expect(grid.flat()).toContain("2026-10-31");
  });

  it("week days start on Monday", () => {
    expect(weekDays("2026-10-07")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
  });
});
