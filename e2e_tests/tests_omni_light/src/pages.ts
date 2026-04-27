import { expect, type Page } from "@playwright/test";

const _exact = { exact: true };

export class General {
    constructor(private page: Page) {}

    async isMobile(): Promise<boolean> {
        const viewport = this.page.viewportSize();
        return viewport !== null && viewport.width < 768;
    }

    async setLanguage(lang: string): Promise<void> {
        await this.page.evaluate((l) => {
            localStorage.setItem("i18nextLng", l);
        }, lang);
    }

    async clearLanguage(): Promise<void> {
        await this.page.evaluate(() => {
            localStorage.removeItem("i18nextLng");
        });
    }
}

export class ChatPage {
    constructor(private page: Page) {}

    async goto(): Promise<void> {
        await this.page.goto("/");
    }

    async navigateTo(): Promise<void> {
        const sidebar = new Sidebar(this.page);
        await sidebar.navigateTo("New Chat");
        await expect(this.page).toHaveURL(/\/chat\/[\w-]+/);
    }

    async selectFirstModel(): Promise<void> {
        // Open the model selector popover and click the first option
        const modelButton = this.page
            .locator("button")
            .filter({
                hasText: /Select model|gpt-/i,
            })
            .first();
        await modelButton.waitFor({ state: "visible", timeout: 10000 });
        await modelButton.click();
        // Click the first option in the popover/command list
        const firstOption = this.page.locator('[role="option"]').first();
        await firstOption.waitFor({ state: "visible", timeout: 5000 });
        await firstOption.click();
    }

    async selectModel(modelName: string): Promise<void> {
        const modelButton = this.page
            .locator("button")
            .filter({ hasText: /Select model|gpt-/i })
            .first();
        await modelButton.waitFor({ state: "visible", timeout: 10000 });
        await modelButton.click();
        const option = this.page
            .locator('[role="option"]')
            .filter({ hasText: modelName })
            .first();
        await option.waitFor({ state: "visible", timeout: 5000 });
        await option.click();
    }

    async startNewChat(): Promise<void> {
        const sidebar = new Sidebar(this.page);
        await sidebar.navigateTo("New Chat");
    }

    async assertChatIsEmpty(): Promise<void> {
        await expect(this.page.locator(".prose-assistant")).toHaveCount(0);
    }

    async sendMessage(message: string): Promise<void> {
        const input = this.page.getByRole("textbox", {
            name: "Type a message...",
        });
        await input.fill(message);
        await this.page.getByRole("button", { name: "Send" }).click();
    }

    async waitForIdle(): Promise<void> {
        const input = this.page.getByRole("textbox", {
            name: "Type a message...",
        });
        await input
            .and(this.page.locator(":enabled"))
            .waitFor({ timeout: 10000 });
    }

    async assertLastResponse(content: string): Promise<void> {
        await expect(
            this.page.locator(".prose-assistant").last(),
        ).toContainText(content, { timeout: 5000 });
    }

    async assertLastResponseFitsInBubble(): Promise<void> {
        // The assistant prose container must not overflow its parent.
        const overflows = await this.page.evaluate(() => {
            const proseEls = document.querySelectorAll(".prose-assistant");
            const last = proseEls[proseEls.length - 1];
            if (!last) return false;
            const parent = last.parentElement;
            if (!parent) return false;
            const parentRight = parent.getBoundingClientRect().right;
            const elRight = last.getBoundingClientRect().right;
            return elRight > parentRight + 1;
        });
        expect(overflows).toBe(false);
    }

    async assertAssistantMessageModelName(
        index: number,
        modelName: string,
    ): Promise<void> {
        // Each assistant message is a flex-col container whose first <p> is the model-name label.
        await expect(
            this.page
                .locator(".prose-assistant")
                .nth(index)
                .locator("xpath=../preceding-sibling::p[1]"),
        ).toHaveText(modelName, { timeout: 5000 });
    }
}

export class Sidebar {
    constructor(private page: Page) {}

    async isOpen(): Promise<boolean> {
        const general = new General(this.page);
        if (await general.isMobile()) {
            // Mobile: sidebar renders as a Sheet — only present in DOM when open
            return (
                (await this.page.locator('[data-mobile="true"]').count()) > 0
            );
        }
        // Desktop: outer sidebar div carries data-state
        const state = await this.page
            .locator('[data-slot="sidebar"]')
            .getAttribute("data-state");
        return state === "expanded";
    }

    async open(): Promise<void> {
        if (!(await this.isOpen())) {
            await this.page
                .getByRole("button", { name: "Toggle navigation", exact: true })
                .first()
                .click();
        }
    }

    async close(): Promise<void> {
        if (await this.isOpen()) {
            await this.page
                .getByRole("button", { name: "Toggle navigation", exact: true })
                .last()
                .click();
        }
    }

    async navigateTo(sidebarItem: string): Promise<void> {
        const wasOpen = await this.isOpen();

        await this.open();
        await this.page
            .getByRole("button", { name: sidebarItem, exact: true })
            .click();

        if (!wasOpen) {
            await this.close();
        }
    }
}
