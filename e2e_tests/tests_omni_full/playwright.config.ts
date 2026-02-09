import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: "*.spec.ts",
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
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
    ],
    webServer: [
        {
            command: "cd ../../frontend_omni && ln -sf modules_with_backend.json public/modules.json && pnpm build && pnpm preview",
            url: "http://localhost:4173",
            reuseExistingServer: !process.env.CI,
        },
        {
            command: "cd ../../backend && rm -f *.db && uv run uvicorn modai.main:app",
            url: "http://localhost:8000/api/v1/health",
            reuseExistingServer: !process.env.CI,
        },
        {
            command: "docker run --rm -p 3001:8000 ghcr.io/modai-systems/llmock:latest",
            url: "http://localhost:3001/health",
            reuseExistingServer: !process.env.CI,
        },
    ],
});
