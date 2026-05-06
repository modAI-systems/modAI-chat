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
        await sidebar.openChatSection();
        await this.page
            .locator('[data-sidebar="menu-sub-button"]', { hasText: "New" })
            .click();
        await expect(this.page).toHaveURL(/\/chat\/[\w-]+/);
    }

    async selectModel(modelName: string): Promise<void> {
        const modelButton = this.page.getByTestId("model-selector-button");
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
        await sidebar.openChatSection();
        await this.page
            .locator('[data-sidebar="menu-sub-button"]', { hasText: "New" })
            .click();
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

    async openChatSection(): Promise<void> {
        await this.open();
        // Expand the Chat collapsible if not already open.
        // chatNavigationItem uses a Svelte $state toggle (no data-state attribute),
        // so we detect the open state by checking if the "New" sub-button is visible.
        const newButton = this.page.locator(
            '[data-sidebar="menu-sub-button"]',
            {
                hasText: "New",
            },
        );
        const isAlreadyOpen = await newButton.isVisible();
        if (!isAlreadyOpen) {
            await this.page
                .getByRole("button", { name: "Chat", exact: true })
                .click();
        }
    }

    async openGlobalSettingsSection(): Promise<void> {
        await this.open();
        // Global Settings uses shadcn Collapsible.Root (bind:open), so the
        // Providers sub-button is only visible when the section is expanded.
        const providersButton = this.page.locator(
            '[data-sidebar="menu-sub-button"]',
            { hasText: "Providers" },
        );
        const isAlreadyOpen = await providersButton.isVisible();
        if (!isAlreadyOpen) {
            await this.page
                .getByRole("button", { name: "Global Settings", exact: true })
                .click();
        }
    }

    async openUserSettingsSection(): Promise<void> {
        await this.open();
        // User Settings uses shadcn Collapsible.Root (bind:open), so the
        // Language & Region sub-button is only visible when the section is expanded.
        const languageButton = this.page.locator(
            '[data-sidebar="menu-sub-button"]',
            { hasText: "Language & Region" },
        );
        const isAlreadyOpen = await languageButton.isVisible();
        if (!isAlreadyOpen) {
            await this.page
                .getByRole("button", { name: "User Settings", exact: true })
                .click();
        }
    }
}

export class UserSettingsPage {
    constructor(private page: Page) {}

    async goto(): Promise<void> {
        await this.page.goto("/user-settings/localization");
    }

    async navigateTo(): Promise<void> {
        const sidebar = new Sidebar(this.page);
        await sidebar.openUserSettingsSection();
        await this.page
            .locator('[data-sidebar="menu-sub-button"]', {
                hasText: "Language & Region",
            })
            .click();
        await expect(this.page).toHaveURL("/user-settings/localization");
    }

    async assertLanguageSelectorVisible(): Promise<void> {
        await expect(this.page.locator("#language-select")).toBeVisible();
    }

    async selectLanguage(langCode: string): Promise<void> {
        await this.page.locator("#language-select").selectOption(langCode);
    }

    async assertSelectedLanguage(langCode: string): Promise<void> {
        await expect(this.page.locator("#language-select")).toHaveValue(
            langCode,
        );
    }
}
