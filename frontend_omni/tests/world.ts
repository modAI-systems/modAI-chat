import { setWorldConstructor } from "@cucumber/cucumber";
import * as playwright from "playwright";

const TEST_PORT = 4173;

export { TEST_PORT };

export class CustomWorld {
    browser!: playwright.Browser;
    context!: playwright.BrowserContext;
    page!: playwright.Page;

    async init() {
        this.browser = await playwright.chromium.launch({
            headless: process.env.HEADED !== "true",
        });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
    }

    async close() {
        try {
            await this.context.close();
        } catch (error) {
            console.warn("Failed to close context:", error);
        }

        try {
            await this.browser.close();
        } catch (error) {
            console.warn("Failed to close browser:", error);
        }
    }
}

setWorldConstructor(CustomWorld);
