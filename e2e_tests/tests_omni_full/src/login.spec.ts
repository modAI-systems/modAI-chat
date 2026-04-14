import { expect, test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { NanoIdpLoginPage, Sidebar } from "./pages";

const BACKEND_URL = "http://localhost:8000";

test.describe("Login", () => {
    test("should redirect unauthenticated user to NanoIDP login page", async ({
        page,
    }) => {
        await page.goto("/");

        // The auth guard calls /api/auth/userinfo → unauthenticated
        // → redirect to /api/auth/login → NanoIDP authorize endpoint on port 9000
        await page.waitForURL(/localhost:9000/, { timeout: 10000 });
        await expect(page).toHaveURL(/localhost:9000/);
    });

    test("should complete login and land on the app", async ({ page }) => {
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // After login the app must be visible (header rendered)
        await expect(page.locator("header")).toBeVisible();
        await expect(page).toHaveURL(/localhost:4173/);
    });

    test("should show app as unauthenticated before login", async ({
        page,
    }) => {
        // Check /api/auth/userinfo directly — should be unauthorized
        const response = await page.request.get(
            `${BACKEND_URL}/api/auth/userinfo`,
        );
        expect(response.status()).toBe(401);
    });

    test("should be authenticated after login", async ({ page }) => {
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // Userinfo endpoint should now return session payload (cookie is sent)
        const response = await page.request.get(
            `${BACKEND_URL}/api/auth/userinfo`,
        );
        expect(response.ok()).toBe(true);
        const body = await response.json();
        expect(body.user_id).toBeTruthy();
    });

    test("should expose userinfo after login", async ({ page }) => {
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // /api/auth/userinfo includes the user's name from the JWT claims
        const response = await page.request.get(
            `${BACKEND_URL}/api/auth/userinfo`,
        );
        expect(response.ok()).toBe(true);
        const body = await response.json();
        expect(body.user_id).toBeTruthy();
        expect(body.additional.email).toBeTruthy();
    });

    test("should log out and redirect to login page", async ({ page }) => {
        // 1. Login via NanoIDP
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // 2. Assert logged in — app header must be visible
        await expect(page.locator("header")).toBeVisible();
        await expect(page).toHaveURL(/localhost:4173/);

        // 3. Click the Logout button in the sidebar
        const sidebar = new Sidebar(page);
        await sidebar.logout();

        // 4. Assert the NanoIDP login page is displayed again
        await page.waitForURL(/localhost:9000/, { timeout: 15000 });
        await expect(page).toHaveURL(/localhost:9000/);
    });
});
