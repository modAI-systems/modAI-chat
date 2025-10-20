import {
    After,
    AfterAll,
    Before,
    BeforeAll,
    Then,
    When,
} from "@cucumber/cucumber";
import {
    buildApp,
    startContainer as startWebserver,
    stopContainer,
} from "./webserver.ts";
import { type CustomWorld, TEST_PORT } from "./world.ts";

// https://github.com/cucumber/cucumber-js/blob/main/docs/support_files/timeouts.md
BeforeAll({ timeout: 30_000 }, async () => {
    await buildApp();
    await startWebserver();
});

AfterAll(async () => {
    await stopContainer();
});

Before(async function (this: CustomWorld) {
    await this.init();
});

After(async function (this: CustomWorld) {
    await this.close();
});

When("I visit the homepage", async function (this: CustomWorld) {
    await this.page.goto(`http://localhost:${TEST_PORT}`);
});

When(
    "I visit the url path {string}",
    async function (this: CustomWorld, path: string) {
        await this.page.goto(`http://localhost:${TEST_PORT}${path}`);
    },
);

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

Then(
    "the url path should be {string}",
    async function (this: CustomWorld, expectedPath: string) {
        const expectedUrl = `http://localhost:${TEST_PORT}${expectedPath}`;
        await this.page.waitForURL(expectedUrl);
    },
);
