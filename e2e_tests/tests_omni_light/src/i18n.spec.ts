import { expect, test } from "@playwright/test";
import { ChatPage, General } from "./pages";

test.describe("i18n", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/chat");
        await page.evaluate(() => localStorage.clear());
    });

    test("shows English translations by default", async ({ page }) => {
        const chatPage = new ChatPage(page);
        await chatPage.goto();

        await expect(
            page.getByRole("heading", {
                name: "How can I help you today?",
                exact: true,
            }),
        ).toBeVisible({ timeout: 10000 });
        await expect(
            page.getByRole("textbox", { name: "Type a message..." }),
        ).toBeVisible({ timeout: 5000 });
    });

    test("shows German translations when language is set to de", async ({
        page,
    }) => {
        const chatPage = new ChatPage(page);
        const general = new General(page);
        await general.setLanguage("de");
        await chatPage.goto();

        await expect(
            page.getByRole("heading", {
                name: "Wie kann ich Ihnen heute helfen?",
                exact: true,
            }),
        ).toBeVisible({ timeout: 10000 });
        await expect(
            page.getByRole("textbox", { name: "Nachricht eingeben..." }),
        ).toBeVisible({ timeout: 5000 });
    });
});
