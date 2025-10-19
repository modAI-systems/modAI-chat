import { setWorldConstructor } from "@cucumber/cucumber";
import * as playwright from "playwright";
import { execSync } from "child_process";
import * as net from "net";

const TEST_PORT = 8088;

export { TEST_PORT };

async function waitForPort(
    port: number,
    host: string = "localhost",
    timeout: number = 30000,
): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            await new Promise<void>((resolve, reject) => {
                const socket = net.createConnection({ port, host }, () => {
                    socket.destroy();
                    resolve();
                });
                socket.on("error", () => {
                    reject();
                });
            });
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
    throw new Error(`Port ${port} on ${host} not available after ${timeout}ms`);
}

export class CustomWorld {
    browser!: playwright.Browser;
    context!: playwright.BrowserContext;
    page!: playwright.Page;

    async init() {
        // Build the app
        console.log("Building the app...");
        execSync("pnpm build", { stdio: "inherit" });

        // Start Caddy container
        console.log("Starting Caddy container...");
        execSync(`docker container rm -f caddy-uitest || true`, {
            stdio: "ignore",
        });
        execSync(
            `docker run --rm -d --name caddy-uitest -p ${TEST_PORT}:80 -v ${process.cwd()}/dist:/usr/share/caddy caddy`,
            { stdio: "inherit" },
        );

        // Wait for container to start
        console.log("Waiting for Caddy to be ready...");
        await waitForPort(TEST_PORT);

        console.log("Launching browser...");
        this.browser = await playwright.chromium.launch({
            headless: process.env.HEADED !== "true",
        });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();

        console.log("Init done");
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

        try {
            console.log("Stopping Caddy container...");
            execSync("docker container rm -f caddy-uitest || true", {
                stdio: "ignore",
            });
        } catch (error) {
            console.warn("Failed to stop Caddy container:", error);
        }
    }
}

setWorldConstructor(CustomWorld);
