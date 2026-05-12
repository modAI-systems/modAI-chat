import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: "src/*.spec.ts",
    timeout: 60000,
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
            testIgnore: "src/voice.spec.ts",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            testIgnore: "src/voice.spec.ts",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            testIgnore: "src/voice.spec.ts",
            use: { ...devices["Desktop Safari"] },
        },
        {
            name: "mobile-chrome",
            testIgnore: "src/voice.spec.ts",
            use: { ...devices["Pixel 7"] },
        },
        {
            name: "mobile-safari",
            testIgnore: "src/voice.spec.ts",
            use: { ...devices["iPhone 14"] },
        },
        // Voice tests run only on Chromium because --use-fake-device-for-media-stream
        // and --use-fake-ui-for-media-stream are Chromium-exclusive flags.
        {
            name: "chromium-voice",
            testMatch: "src/voice.spec.ts",
            use: {
                ...devices["Desktop Chrome"],
                permissions: ["microphone"],
                launchOptions: {
                    args: [
                        // Auto-grant the microphone permission prompt.
                        "--use-fake-ui-for-media-stream",
                        // Inject a synthetic sine-wave stream as the microphone.
                        "--use-fake-device-for-media-stream",
                    ],
                },
            },
        },
    ],
    webServer: [
        {
            name: "NanoIDP",
            command: "bash scripts/run-nanoidp.sh",
            url: "http://localhost:9000/api/health",
            reuseExistingServer: !process.env.CI,
            gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
            timeout: 60_000,
        },
        {
            name: "Backend",
            command: "bash scripts/run-backend.sh",
            url: "http://localhost:8000/api/health",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            name: "Frontend",
            command: "bash scripts/run-frontend.sh",
            url: "http://localhost:4173",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            name: "AIMock",
            command: "bash scripts/run-aimock.sh",
            url: "http://localhost:4010/health",
            reuseExistingServer: !process.env.CI,
            gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
            timeout: 120_000,
        },
        {
            name: "Dice Roller",
            command: "bash scripts/run-dice-roller.sh",
            url: "http://localhost:8001/openapi.json",
            reuseExistingServer: !process.env.CI,
            gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
            timeout: 30_000,
        },
    ],
});
