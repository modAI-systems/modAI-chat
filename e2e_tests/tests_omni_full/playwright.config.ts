import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: "*.spec.ts",
    timeout: 10000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    workers: 1,
    reporter: [
        ["html", { open: "never" }], // Generate HTML report but don't auto-open
        ["list"], // Also show results in terminal
    ],
    use: {
        baseURL: "http://localhost:4173",
        trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
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
            command: "bash scripts/start-nanoidp.sh",
            url: "http://localhost:9000/api/health",
            reuseExistingServer: !process.env.CI,
            gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
            timeout: 60000,
        },
        {
            command: "bash scripts/run-backend.sh",
            url: "http://localhost:8000/api/health",
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
        },
        {
            command: "bash scripts/run-frontend.sh",
            url: "http://localhost:4173",
            reuseExistingServer: !process.env.CI,
        },
        {
            command: "docker container run --rm -p 3001:8000 ghcr.io/modai-systems/llmock:latest",
            url: "http://localhost:3001/health",
            reuseExistingServer: !process.env.CI,
            gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
        },
    ],
});
