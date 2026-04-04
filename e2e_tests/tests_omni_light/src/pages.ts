import { expect, type Page } from "@playwright/test";

const _exact = { exact: true };

export class General {
    constructor(private page: Page) {}

    async isMobile(): Promise<boolean> {
        const viewport = this.page.viewportSize();
        return viewport !== null && viewport.width < 768;
    }
}

export class ChatPage {
    constructor(private page: Page) {}

    async goto(): Promise<void> {
        await this.page.goto("/");
    }

    async navigateTo(): Promise<void> {
        const sidebar = new Sidebar(this.page);
        await sidebar.navigateTo("Chat");
        await expect(this.page).toHaveURL("/chat");
    }

    async selectFirstModel(): Promise<void> {
        // Open the model selector popover and click the first option
        const modelButton = this.page
            .locator("button")
            .filter({
                hasText: /Select model|gpt-/i,
            })
            .first();
        await expect(modelButton).toBeEnabled({ timeout: 10000 });
        await modelButton.click();
        // Click the first option in the popover/command list
        const firstOption = this.page.locator('[role="option"]').first();
        await firstOption.waitFor({ state: "visible", timeout: 5000 });
        await firstOption.click();
    }

    async sendMessage(message: string): Promise<void> {
        const input = this.page.getByRole("textbox", {
            name: "Type a message...",
        });
        await expect(input).toBeEnabled({ timeout: 5000 });
        await input.fill(message);
        await this.page.getByRole("button", { name: "Send" }).click();
    }

    async assertLastResponse(content: string): Promise<void> {
        await expect(
            this.page.locator(".bg-muted.rounded-2xl").last(),
        ).toContainText(content, { timeout: 5000 });
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
