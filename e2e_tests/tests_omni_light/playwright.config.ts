import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: "*.spec.ts",
    timeout: 30000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    workers: 1,
    reporter: [
        ["html", { open: "never" }], // Generate HTML report but don't auto-open
        ["list"], // Also show results in terminal
    ],
    use: {
        baseURL: "http://localhost:4173",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
        {
            name: "mobile-chrome",
            use: { ...devices["Pixel 7"] },
        },
        {
            name: "mobile-safari",
            use: { ...devices["iPhone 14"] },
        },
    ],
    webServer: [
        {
            name: "Frontend",
            command: "./scripts/run-frontend.sh",
            url: "http://localhost:4173",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            name: "LLMock",
            command:
                "docker container run --rm --platform linux/amd64 -p 3001:8000 -e LLMOCK_CORS_ALLOW_ORIGINS='[\"http://localhost:4173\"]' ghcr.io/modai-systems/llmock:latest",
            url: "http://localhost:3001/health",
            reuseExistingServer: !process.env.CI,
            gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
            timeout: 30_000,
        },
    ],
});
