import { expect, test } from "@playwright/test";
import { ChatPage, LLMProvidersPage } from "./pages";

const exact = { exact: true };

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.evaluate(() => {
            localStorage.setItem(
                "llm_providers",
                JSON.stringify([
                    {
                        id: "llmmock",
                        name: "LLMMock",
                        type: "openai",
                        base_url: "http://localhost:3001",
                        api_key: "",
                    },
                ]),
            );
        });
    });

    test("Chat responds", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: "Providers" }).click();
        await page
            .getByRole("button", { name: "Check provider health" })
            .click();
        await expect(
            page.getByRole("button", { name: "Check provider health" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Chat" }).click();
        await expect(
            page.getByRole("button", { name: "gpt-4o" }),
        ).toBeVisible();
        await page
            .getByRole("textbox", { name: "Type a message..." })
            .fill("hello");
        await page.getByRole("button", { name: "Send" }).click();
        await expect(page.getByText("hello").nth(1)).toBeVisible();
    });
});
