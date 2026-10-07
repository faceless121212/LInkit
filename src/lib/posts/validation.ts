import { countXText } from "@/lib/x-text";
import { PUBLISHED_URL_PATTERN, type PostKind } from "@/lib/types";

export type ItemInput = { body: string };

export type ItemIssue = { index: number; reason: "empty" | "too_long" };

/**
 * Issues that block the `scheduled` status (and `published`).
 * Drafts and ideas are allowed to have these issues.
 */
export function itemIssues(items: ItemInput[], kind: PostKind): ItemIssue[] {
  const issues: ItemIssue[] = [];
  items.forEach((item, index) => {
    const trimmed = item.body.trim();
    if (trimmed.length === 0) {
      // Single posts and every thread item must have text.
      issues.push({ index, reason: "empty" });
      return;
    }
    if (!countXText(item.body).valid) {
      issues.push({ index, reason: "too_long" });
    }
  });
  if (kind === "thread" && items.length === 0) issues.push({ index: 0, reason: "empty" });
  return issues;
}

export function isValidPublishedUrl(url: string): boolean {
  return PUBLISHED_URL_PATTERN.test(url.trim());
}
