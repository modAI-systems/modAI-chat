import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    testMatch: "**/*.spec.ts",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ["html", { open: "never" }], // Generate HTML report but don't auto-open
        ["list"] // Also show results in terminal
    ],
    use: {
        baseURL: "http://localhost:4173",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            testIgnore: "**/mock-openai-server.spec.ts",
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: "**/mock-openai-server.spec.ts",
        },
        {
            name: "mock-tests",
            testMatch: "**/mock-openai-server.spec.ts",
            use: { ...devices["Desktop Chrome"] },
            workers: 1, // Run serially
        },
        // Support this later at some point
        // {
        //     name: "webkit",
        //     use: { ...devices["Desktop Safari"] },
        // },
    ],
    webServer: [
        {
            command: "pnpm build && pnpm preview",
            url: "http://localhost:4173",
            reuseExistingServer: !process.env.CI,
        },
        {
            command: "node mock-openai-server.js",
            url: "http://localhost:3001",
            reuseExistingServer: !process.env.CI,
        },
    ],
});
