import { expect, test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { NanoIdpLoginPage } from "./pages";

const BACKEND_URL = "http://localhost:8000";

test.describe("Router", () => {
    test.beforeEach(async ({ page }) => {
        // Reset backend state before each test
        await page.request.post(`${BACKEND_URL}/api/reset/full`);

        // Login via NanoIDP (navigates to / which triggers backend OIDC flow)
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);
    });

    test("unknown routes fall back to chat for authenticated users", async ({
        page,
    }) => {
        await page.goto("/missing-route");

        // Redirected to fallback route
        await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 5000 });

        // Assert the chat component is rendered
        await expect(
            page.getByRole("textbox", { name: "Type a message..." }),
        ).toBeVisible();
    });
});
