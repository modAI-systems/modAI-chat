import { expect, test } from "@playwright/test";

test.describe("Router", () => {
    test("unknown routes fall back to chat", async ({ page }) => {
        await page.goto("/missing-route");

        // Redirected to fallback route
        await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 5000 });

        // Assert the chat component is rendered
        await expect(
            page.getByRole("textbox", { name: "Type a message..." }),
        ).toBeVisible();
    });
});
