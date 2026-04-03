import { expect, type Page } from "@playwright/test";

const exact = { exact: true };

export class ChatPage {
    constructor(private page: Page) {}

    async goto(): Promise<void> {
        await this.page.goto("/");
    }

    async navigateTo(): Promise<void> {
        await this.page.getByText("Chat", exact).click();
        await expect(this.page).toHaveURL("/chat");
    }

    async sendMessage(message: string): Promise<void> {
        const input = this.page.getByRole("textbox", {
            name: "Type a message...",
        });
        await expect(input).toBeEnabled({ timeout: 15000 });
        await input.fill(message);
        await this.page.getByRole("button", { name: "Send" }).click();
    }

    async assertModelButtonVisible(modelName: string): Promise<void> {
        await expect(
            this.page.getByRole("button", { name: modelName }),
        ).toBeVisible();
    }

    async assertLastResponse(content: string): Promise<void> {
        await expect(
            this.page.locator(".bg-muted.rounded-2xl").last(),
        ).toContainText(content, { timeout: 15000 });
    }
}
