import { expect, test } from "@playwright/test";
import { addDays, format } from "date-fns";
import { deleteUserPosts, dragTo, E2E_EMAIL, loginAs } from "./helpers";

/**
 * Core loop: log in -> create a 3-item thread -> schedule for tomorrow ->
 * drag the card to Published on the board -> enter the URL -> the post
 * shows on the calendar on the correct day with a published badge.
 */
test.describe("core loop", () => {
  test.beforeEach(async () => {
    await deleteUserPosts(E2E_EMAIL);
  });

  test.afterAll(async () => {
    await deleteUserPosts(E2E_EMAIL);
  });

  test("create thread, schedule, publish via board, see on calendar", async ({ page, baseURL }) => {
    await loginAs(page, E2E_EMAIL, baseURL!);
    await expect(page).toHaveURL(/\/board/);

    // --- Create a thread with 3 items
    await page.goto("/posts/new");
    const title = `E2E thread ${Date.now()}`;
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Post 1 text").fill("First post of the thread 🚀");
    await page.getByRole("button", { name: "Add post below" }).first().click();
    await page.getByLabel("Post 2 text").fill("Second post with a link https://example.com/a/very/long/url/that/counts/as/23");
    await page.getByRole("button", { name: "Add post below" }).nth(1).click();
    await page.getByLabel("Post 3 text").fill("Third and final post.");

    await expect(page.getByTestId("preview-item")).toHaveCount(3);
    await expect(page.getByTestId("item-editor")).toHaveCount(3);

    // Autosave turns /posts/new into /posts/<id>
    await expect(page.getByTestId("save-indicator")).toHaveText(/Saved/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
    const postId = page.url().split("/").pop()!;

    // --- Schedule for tomorrow 10:00 (browser local = Europe/Warsaw in this config)
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00");
    await page.locator("#scheduled-at-input").fill(tomorrow);
    await page.getByTestId("schedule-button").click();
    await expect(page.getByText("Marked as scheduled")).toBeVisible();

    // --- Board: card is in Scheduled; drag to Published
    await page.goto("/board");
    const card = `[data-testid="column-scheduled"] [data-post-id="${postId}"]`;
    await expect(page.locator(card)).toBeVisible();
    await dragTo(page, card, '[data-testid="column-published"]');

    // Published-URL dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Mark as published")).toBeVisible();
    await dialog.getByLabel("Published URL").fill("https://x.com/someone/status/1234567890123456789");
    await dialog.getByRole("button", { name: "Mark published" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(`[data-testid="column-published"] [data-post-id="${postId}"]`)).toBeVisible();

    // --- Calendar: shows on today's cell (published_at defaults to now) with the badge
    const todayKey = format(new Date(), "yyyy-MM-dd");
    await page.goto(`/calendar?view=month&date=${todayKey}`);
    const event = page.locator(`[data-testid="day-${todayKey}"] [data-post-id="${postId}"]`);
    await expect(event).toBeVisible();
    await expect(event).toHaveAttribute("data-status", "published");
    await expect(event.getByTestId("published-badge")).toBeVisible();

    // And it is not on tomorrow's cell any more (published_at wins over scheduled_at)
    const tomorrowKey = format(addDays(new Date(), 1), "yyyy-MM-dd");
    await expect(page.locator(`[data-testid="day-${tomorrowKey}"] [data-post-id="${postId}"]`)).toHaveCount(0);
  });
});
