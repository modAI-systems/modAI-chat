import { expect, test } from "@playwright/test";

test.describe("External module dependency", () => {
    test("loads external module package and renders output to the page", async ({
        page,
    }) => {
        await page.goto("/hello-world");

        await expect(page.getByTestId("hello-world-output")).toHaveText(
            "Hello World",
            { timeout: 10000 },
        );
    });
});
