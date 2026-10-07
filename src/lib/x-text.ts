import twitter from "twitter-text";

/** X's limit in weighted characters. */
export const X_MAX_WEIGHTED_LENGTH = 280;

export type XTextStats = {
  /** Weighted length per X rules: most chars = 1, emoji/CJK = 2, URLs = 23. */
  weightedLength: number;
  /** True when weightedLength <= 280 (and the text is otherwise valid). */
  valid: boolean;
  remaining: number;
};

/**
 * Counts text the way X does. Uses twitter-text's parseTweet so URLs are
 * weighted as 23 characters (t.co) and emoji / CJK are weighted as 2.
 */
export function countXText(text: string): XTextStats {
  if (!text) {
    return { weightedLength: 0, valid: true, remaining: X_MAX_WEIGHTED_LENGTH };
  }
  const parsed = twitter.parseTweet(text);
  return {
    weightedLength: parsed.weightedLength,
    valid: parsed.valid,
    remaining: X_MAX_WEIGHTED_LENGTH - parsed.weightedLength,
  };
}
