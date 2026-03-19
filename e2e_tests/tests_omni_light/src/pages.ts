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
        await this.page
            .getByRole("textbox", { name: "Type a message..." })
            .fill(message);
        await this.page.getByRole("button", { name: "Send" }).click();
    }

    async assertModelButtonVisible(modelName: string): Promise<void> {
        await expect(
            this.page.getByRole("button", { name: modelName }),
        ).toBeVisible();
    }

    async assertMessageVisible(message: string): Promise<void> {
        await expect(this.page.getByText(message).nth(1)).toBeVisible();
    }
}
