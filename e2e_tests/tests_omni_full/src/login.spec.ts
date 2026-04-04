import { expect, test } from "@playwright/test";
import { TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { NanoIdpLoginPage } from "./pages";

const BACKEND_URL = "http://localhost:8000";

test.describe("Login", () => {
    test("should redirect unauthenticated user to NanoIDP login page", async ({
        page,
    }) => {
        await page.goto("/");

        // The auth guard calls /api/auth/session → unauthenticated
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
        // Check /api/auth/session directly — should be unauthorized
        const response = await page.request.get(
            `${BACKEND_URL}/api/auth/session`,
        );
        expect(response.status()).toBe(401);
    });

    test("should be authenticated after login", async ({ page }) => {
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // Session endpoint should now return session payload (cookie is sent)
        const response = await page.request.get(
            `${BACKEND_URL}/api/auth/session`,
        );
        expect(response.ok()).toBe(true);
        const body = await response.json();
        expect(body.user_id).toBeTruthy();
    });

    test("should expose userinfo after login", async ({ page }) => {
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // /api/auth/userinfo includes JIT-provisioned user data
        const response = await page.request.get(
            `${BACKEND_URL}/api/auth/userinfo`,
        );
        expect(response.ok()).toBe(true);
        const body = await response.json();
        expect(body.email).toBe(TEST_USER_EMAIL);
        expect(body.id).toBeTruthy();
    });

    test.skip("should log out and clear session", async ({ page }) => {
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // Confirm we have a valid session
        const beforeLogout = await page.request.get(
            `${BACKEND_URL}/api/auth/session`,
        );
        expect(beforeLogout.ok()).toBe(true);
        expect((await beforeLogout.json()).user_id).toBeTruthy();

        // Fetch CSRF token (required for state-mutating requests)
        const csrfResponse = await page.request.get(
            `${BACKEND_URL}/api/auth/csrf`,
        );
        expect(csrfResponse.ok()).toBe(true);
        const { csrf_token } = await csrfResponse.json();

        // Call logout endpoint with CSRF token header
        await page.request.post(`${BACKEND_URL}/api/auth/logout`, {
            headers: { "X-CSRF-Token": csrf_token },
        });

        // Session should now be cleared (no cookie -> unauthorized)
        const afterLogout = await page.request.get(
            `${BACKEND_URL}/api/auth/session`,
        );
        expect(afterLogout.status()).toBe(401);
    });

    test.skip("should reject logout without CSRF token", async ({ page }) => {
        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        // Attempt logout without X-CSRF-Token header → must be rejected
        const response = await page.request.post(
            `${BACKEND_URL}/api/auth/logout`,
        );
        expect(response.status()).toBe(403);
    });
});
