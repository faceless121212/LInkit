import { describe, expect, it } from "vitest";
import { selectDigest, selectDueReminders, shouldSendDigest } from "./select";

const NOW = new Date("2026-10-07T08:00:00.000Z"); // 10:00 Warsaw (CEST)

const post = (over: Partial<{ id: string; status: string; scheduled_at: string | null; reminded_at: string | null }>) => ({
  id: over.id ?? "p",
  status: over.status ?? "scheduled",
  scheduled_at: over.scheduled_at === undefined ? "2026-10-07T08:30:00.000Z" : over.scheduled_at,
  reminded_at: over.reminded_at ?? null,
});

describe("selectDueReminders", () => {
  it("selects scheduled posts due within the next 60 minutes that were not reminded", () => {
    const due = selectDueReminders(
      [
        post({ id: "in-30", scheduled_at: "2026-10-07T08:30:00.000Z" }),
        post({ id: "in-59", scheduled_at: "2026-10-07T08:59:00.000Z" }),
        post({ id: "in-60", scheduled_at: "2026-10-07T09:00:00.000Z" }), // boundary: excluded
        post({ id: "now", scheduled_at: "2026-10-07T08:00:00.000Z" }), // boundary: included
        post({ id: "past", scheduled_at: "2026-10-07T07:59:00.000Z" }),
      ],
      NOW,
      60,
    );
    expect(due.map((p) => p.id)).toEqual(["now", "in-30", "in-59"]);
  });

  it("skips posts already reminded (idempotent across repeated runs)", () => {
    const list = [post({ id: "a" }), post({ id: "b", reminded_at: "2026-10-07T07:05:00.000Z" })];
    expect(selectDueReminders(list, NOW).map((p) => p.id)).toEqual(["a"]);
    // Simulate run 2 after run 1 marked "a"
    const after = list.map((p) => (p.id === "a" ? { ...p, reminded_at: NOW.toISOString() } : p));
    expect(selectDueReminders(after, NOW)).toEqual([]);
  });

  it("ignores drafts, ideas, published and cancelled posts", () => {
    const list = ["idea", "draft", "published", "cancelled"].map((status, i) => post({ id: String(i), status }));
    expect(selectDueReminders(list, NOW)).toEqual([]);
  });

  it("ignores scheduled posts without a date", () => {
    expect(selectDueReminders([post({ scheduled_at: null })], NOW)).toEqual([]);
  });
});

describe("selectDigest", () => {
  it("splits today's posts (Warsaw day) from overdue ones", () => {
    const sel = selectDigest(
      [
        post({ id: "today-early", scheduled_at: "2026-10-06T22:30:00.000Z" }), // 00:30 Warsaw Oct 7 (already past, but today)
        post({ id: "today-later", scheduled_at: "2026-10-07T16:00:00.000Z" }),
        post({ id: "yesterday", scheduled_at: "2026-10-06T10:00:00.000Z" }),
        post({ id: "tomorrow", scheduled_at: "2026-10-08T10:00:00.000Z" }),
        post({ id: "draft", status: "draft", scheduled_at: "2026-10-07T12:00:00.000Z" }),
      ],
      NOW,
      "Europe/Warsaw",
    );
    expect(sel.today.map((p) => p.id)).toEqual(["today-early", "today-later"]);
    expect(sel.overdue.map((p) => p.id)).toEqual(["yesterday"]);
  });
});

describe("shouldSendDigest", () => {
  it("sends at or after the digest hour when not sent today", () => {
    expect(shouldSendDigest(new Date("2026-10-07T06:00:00.000Z"), false, 8)).toBe(true); // 08:00 CEST
    expect(shouldSendDigest(new Date("2026-10-07T05:59:00.000Z"), false, 8)).toBe(false); // 07:59 CEST
    expect(shouldSendDigest(new Date("2026-12-07T07:00:00.000Z"), false, 8)).toBe(true); // 08:00 CET
    expect(shouldSendDigest(new Date("2026-12-07T06:00:00.000Z"), false, 8)).toBe(false); // 07:00 CET
  });

  it("never sends twice in one day", () => {
    expect(shouldSendDigest(new Date("2026-10-07T10:00:00.000Z"), true, 8)).toBe(false);
  });
});
