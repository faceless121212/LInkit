import { describe, expect, it } from "vitest";
import { computeStreak, longestStreak } from "./streak";

const TZ = "Europe/Warsaw";
// "now" = 2026-10-07 12:00 Warsaw (CEST) == 10:00Z
const NOW = new Date("2026-10-07T10:00:00.000Z");

describe("computeStreak", () => {
  it("is 0 with no published posts", () => {
    expect(computeStreak([], NOW, TZ)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const posts = ["2026-10-05T08:00:00Z", "2026-10-06T08:00:00Z", "2026-10-07T07:00:00Z"];
    expect(computeStreak(posts, NOW, TZ)).toBe(3);
  });

  it("counts from yesterday when nothing is published yet today", () => {
    const posts = ["2026-10-04T08:00:00Z", "2026-10-05T08:00:00Z", "2026-10-06T08:00:00Z"];
    expect(computeStreak(posts, NOW, TZ)).toBe(3);
  });

  it("is 0 when the last publish was the day before yesterday", () => {
    expect(computeStreak(["2026-10-05T08:00:00Z"], NOW, TZ)).toBe(0);
  });

  it("breaks on a gap", () => {
    const posts = ["2026-10-03T08:00:00Z", "2026-10-05T08:00:00Z", "2026-10-06T08:00:00Z", "2026-10-07T08:00:00Z"];
    expect(computeStreak(posts, NOW, TZ)).toBe(3);
  });

  it("uses Warsaw days, not UTC days", () => {
    // 2026-10-06 23:30 Warsaw == 21:30Z on Oct 6 -> Warsaw day Oct 6
    // 2026-10-07 00:30 Warsaw == 22:30Z on Oct 6 -> Warsaw day Oct 7 (UTC says Oct 6)
    const posts = ["2026-10-05T08:00:00Z", "2026-10-06T21:30:00Z", "2026-10-06T22:30:00Z"];
    expect(computeStreak(posts, NOW, TZ)).toBe(3);
    // In UTC both late posts fall on Oct 6, so the run is only Oct 5–6.
    expect(computeStreak(posts, NOW, "UTC")).toBe(2);
  });

  it("multiple posts on one day count once", () => {
    const posts = ["2026-10-07T07:00:00Z", "2026-10-07T08:00:00Z", "2026-10-07T09:00:00Z"];
    expect(computeStreak(posts, NOW, TZ)).toBe(1);
  });
});

describe("longestStreak", () => {
  it("finds the longest run", () => {
    const posts = [
      "2026-09-01T08:00:00Z",
      "2026-09-02T08:00:00Z",
      "2026-09-10T08:00:00Z",
      "2026-09-11T08:00:00Z",
      "2026-09-12T08:00:00Z",
    ];
    expect(longestStreak(posts, TZ)).toBe(3);
  });
});
