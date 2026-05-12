import { expect, test } from "@playwright/test";
import { TEST_USER_PASSWORD, TEST_USERNAME } from "./fixtures";
import { ChatPage, LLMProvidersPage, NanoIdpLoginPage } from "./pages";

const BACKEND_URL = "http://localhost:8000";
const AIMOCK_URL = "http://localhost:4010/v1";

/**
 * Voice mode E2E tests.
 *
 * These tests are scoped to the `chromium-voice` Playwright project defined in
 * playwright.config.ts. That project launches Chromium with:
 *   --use-fake-ui-for-media-stream   → auto-grants the mic permission prompt
 *   --use-fake-device-for-media-stream → injects a synthetic sine-wave audio
 *                                        stream in place of a real microphone
 *
 * The tests do NOT rely on the AIMock realtime endpoint (not yet implemented).
 * Instead, a minimal WebSocket fake server is set up via page.routeWebSocket()
 * to handle the realtime protocol locally within the test.
 *
 * NOTE: These tests will fail until the AIMock realtime endpoint is ready,
 * but the scaffolding is intentionally prepared in advance.
 */

test.describe("Voice Mode", () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post(`${BACKEND_URL}/api/reset/full`);

        const loginPage = new NanoIdpLoginPage(page);
        await loginPage.login(TEST_USERNAME, TEST_USER_PASSWORD);

        const providerPage = new LLMProvidersPage(page);
        await providerPage.addProvider("Mock Provider", AIMOCK_URL, "");
        await page
            .getByText("How can I help you today?")
            .waitFor({ state: "visible", timeout: 20000 });

        // Seed the realtime model into localStorage so the Voice button appears.
        // providerBaseUrl is relative ("/") so the frontend routes the WebSocket
        // through the backend proxy at /api/realtime — which we intercept below.
        await page.evaluate(() => {
            localStorage.setItem(
                "modai-audio-realtime-model",
                JSON.stringify({
                    providerId: "voice-mock",
                    providerName: "Mock Provider",
                    providerBaseUrl: "/",
                    providerApiKey: "",
                    modelId: "gpt-4o-realtime-preview",
                    modelName: "gpt-4o-realtime-preview",
                }),
            );
        });

        // Reload so the Svelte reactive store picks up the new localStorage value.
        await page.reload();
        await page.waitForSelector("header", { timeout: 10000 });
    });

    test("should activate voice mode and stream audio frames to the server", async ({
        page,
    }) => {
        const audioFrames: string[] = [];

        // Intercept the realtime WebSocket that the frontend opens when the
        // Voice button is clicked. Act as a minimal fake realtime server.
        await page.routeWebSocket(/\/api\/realtime/, (ws) => {
            ws.onOpen(() => {
                ws.send(
                    JSON.stringify({ type: "session.created", session: {} }),
                );
            });
            ws.onMessage((msg) => {
                try {
                    const data = JSON.parse(msg as string) as Record<
                        string,
                        unknown
                    >;
                    if (
                        data.type === "input_audio_buffer.append" &&
                        typeof data.audio === "string"
                    ) {
                        audioFrames.push(data.audio);
                    }
                } catch {
                    // ignore non-JSON control frames
                }
            });
        });

        const chatPage = new ChatPage(page);
        await chatPage.navigateTo();

        // Voice button is visible because a realtime model is configured.
        const voiceButton = page.getByRole("button", {
            name: "Voice",
            exact: true,
        });
        await expect(voiceButton).toBeVisible({ timeout: 5000 });
        await voiceButton.click();

        // Session transitions to "active" → button label changes to "Stop voice".
        await expect(
            page.getByRole("button", { name: "Stop voice", exact: true }),
        ).toBeVisible({ timeout: 8000 });

        // Chromium's fake sine-wave device produces PCM16 samples → the
        // AudioWorklet encodes them → input_audio_buffer.append frames arrive.
        await expect
            .poll(() => audioFrames.length, { timeout: 5000 })
            .toBeGreaterThan(0);

        // Stop the session — button should revert to idle state.
        await page
            .getByRole("button", { name: "Stop voice", exact: true })
            .click();
        await expect(
            page.getByRole("button", { name: "Voice", exact: true }),
        ).toBeVisible({ timeout: 3000 });
    });

    test("should show user transcript and AI response in the chat panel", async ({
        page,
    }) => {
        let transcriptionSent = false;

        await page.routeWebSocket(/\/api\/realtime/, (ws) => {
            ws.onOpen(() => {
                ws.send(
                    JSON.stringify({ type: "session.created", session: {} }),
                );
            });
            ws.onMessage((msg) => {
                try {
                    const data = JSON.parse(msg as string) as Record<
                        string,
                        unknown
                    >;
                    // Send fake transcription on the first audio frame so the
                    // test doesn't have to wait long.
                    if (
                        data.type === "input_audio_buffer.append" &&
                        !transcriptionSent
                    ) {
                        transcriptionSent = true;

                        // Simulate the server completing user speech transcription.
                        setTimeout(() => {
                            ws.send(
                                JSON.stringify({
                                    type: "conversation.item.input_audio_transcription.completed",
                                    transcript: "Hello there",
                                }),
                            );
                        }, 200);

                        // Simulate the assistant's response transcript arriving.
                        setTimeout(() => {
                            ws.send(
                                JSON.stringify({
                                    type: "response.audio_transcript.delta",
                                    delta: "Hi! How can I help?",
                                }),
                            );
                            ws.send(
                                JSON.stringify({
                                    type: "response.audio_transcript.done",
                                }),
                            );
                        }, 500);
                    }
                } catch {
                    // ignore non-JSON control frames
                }
            });
        });

        const chatPage = new ChatPage(page);
        await chatPage.navigateTo();

        const voiceButton = page.getByRole("button", {
            name: "Voice",
            exact: true,
        });
        await expect(voiceButton).toBeVisible({ timeout: 5000 });
        await voiceButton.click();

        await expect(
            page.getByRole("button", { name: "Stop voice", exact: true }),
        ).toBeVisible({ timeout: 8000 });

        // User transcript ("Hello there") should appear in the chat panel
        // as a user message (right-aligned secondary pill).
        await expect(page.locator(".bg-secondary .prose").last()).toContainText(
            "Hello there",
            { timeout: 8000 },
        );

        // Assistant response transcript should appear in the chat panel.
        await expect(page.locator(".prose-assistant").last()).toContainText(
            "Hi! How can I help?",
            { timeout: 8000 },
        );

        await page
            .getByRole("button", { name: "Stop voice", exact: true })
            .click();
    });
});
