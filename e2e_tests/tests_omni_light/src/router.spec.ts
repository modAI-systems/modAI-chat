import { expect, test } from "@playwright/test";

test.describe("Router", () => {
    test("unknown routes fall back to chat", async ({ page }) => {
        await page.goto("/missing-route");

        // Assert we're still on the unknown route (not redirected)
        expect(page.url()).toContain("/missing-route");

        // Assert the chat component is rendered
        await expect(
            page.getByRole("textbox", { name: "Type a message..." }),
        ).toBeVisible();
    });
});
