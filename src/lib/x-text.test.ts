import { describe, expect, it } from "vitest";
import { countXText, X_MAX_WEIGHTED_LENGTH } from "./x-text";

describe("countXText", () => {
  it("counts plain ASCII one per character", () => {
    expect(countXText("hello world").weightedLength).toBe(11);
    expect(countXText("").weightedLength).toBe(0);
  });

  it("counts any URL as 23 characters regardless of length", () => {
    const short = countXText("see https://x.com/a");
    const long = countXText(
      "see https://example.com/a/very/long/path/that/goes/on/and/on?with=query&params=true",
    );
    expect(short.weightedLength).toBe(4 + 23);
    expect(long.weightedLength).toBe(4 + 23);
  });

  it("counts emoji as 2", () => {
    expect(countXText("🚀").weightedLength).toBe(2);
    expect(countXText("hi 🚀").weightedLength).toBe(3 + 2);
    // Family emoji (ZWJ sequence) still counts as 2
    expect(countXText("👨‍👩‍👧").weightedLength).toBe(2);
  });

  it("counts CJK as 2 per character", () => {
    expect(countXText("日本語").weightedLength).toBe(6);
  });

  it("flags text over 280 as invalid", () => {
    const ok = countXText("a".repeat(X_MAX_WEIGHTED_LENGTH));
    const over = countXText("a".repeat(X_MAX_WEIGHTED_LENGTH + 1));
    expect(ok.valid).toBe(true);
    expect(ok.remaining).toBe(0);
    expect(over.valid).toBe(false);
    expect(over.remaining).toBe(-1);
  });
});
