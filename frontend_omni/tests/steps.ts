import { Given, When, Then, After } from "@cucumber/cucumber";
import { CustomWorld, TEST_PORT } from "./world.ts";

Given("the app is running", async function (this: CustomWorld) {
    await this.init();
});

When("I visit the homepage", async function (this: CustomWorld) {
    await this.page.goto(`http://localhost:${TEST_PORT}`);
});

Then(
    "I should see the page title contains {string}",
    async function (this: CustomWorld, expectedTitle: string) {
        const title = await this.page.title();
        if (!title.includes(expectedTitle)) {
            throw new Error(
                `Expected title to contain "${expectedTitle}", but got "${title}"`,
            );
        }
    },
);

After(async function (this: CustomWorld) {
    await this.close();
});
