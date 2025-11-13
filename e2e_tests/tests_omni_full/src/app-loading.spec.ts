import { expect, test } from "@playwright/test";

test.describe("App loading", () => {
    test("User opens the app", async ({ page }) => {
        await page.goto("/");

        // Check that the page title contains "modAI"
        await expect(page).toHaveTitle(/modAI/);
    });

    test.describe("User gets redirected to /login as fallback if not logged in", () => {
        const testPaths = ["/", "/login", "/foo"];

        for (const path of testPaths) {
            test(`should redirect ${path} to /login`, async ({ page }) => {
                await page.goto(path);

                // Wait for navigation to complete and check the URL
                await expect(page).toHaveURL("/login");
            });
        }
    });
});
