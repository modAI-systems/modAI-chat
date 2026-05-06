import { expect, test } from "@playwright/test";
import { General, UserSettingsPage } from "./pages";

test.describe("User Settings - Localization", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/chat");
        await page.evaluate(() => localStorage.clear());
        await page.goto("/chat");
        await page
            .getByText("How can I help you today?")
            .waitFor({ state: "visible", timeout: 20000 });
    });

    test("navigates to language settings via sidebar", async ({ page }) => {
        const userSettingsPage = new UserSettingsPage(page);
        await userSettingsPage.navigateTo();
        await userSettingsPage.assertLanguageSelectorVisible();
    });

    test("shows English as default language", async ({ page }) => {
        const userSettingsPage = new UserSettingsPage(page);
        await userSettingsPage.goto();
        await userSettingsPage.assertSelectedLanguage("en");
    });

    test("changes language to German and persists it", async ({ page }) => {
        const userSettingsPage = new UserSettingsPage(page);
        await userSettingsPage.goto();
        await userSettingsPage.selectLanguage("de");

        // Navigate away and back to verify persistence via localStorage
        await page.goto("/chat");
        await page
            .getByRole("heading", {
                name: "Wie kann ich Ihnen heute helfen?",
                exact: true,
            })
            .waitFor({ state: "visible", timeout: 10000 });

        await userSettingsPage.goto();
        await userSettingsPage.assertSelectedLanguage("de");
    });

    test("language change reflects in the UI immediately", async ({ page }) => {
        const userSettingsPage = new UserSettingsPage(page);
        const general = new General(page);
        await general.setLanguage("en");
        await userSettingsPage.goto();

        await userSettingsPage.selectLanguage("de");

        // The page title should switch to German immediately without reloading
        await expect(
            page.getByRole("heading", {
                name: "Sprache & Lokalisierung",
                exact: true,
            }),
        ).toBeVisible({ timeout: 5000 });
    });
});
