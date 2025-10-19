import { execSync, spawn, ChildProcess } from "child_process";
import * as net from "net";

const TEST_PORT = 4173;

let previewProcess: ChildProcess | null = null;

async function waitForPort(
    port: number,
    host: string = "localhost",
    timeout: number = 10000,
): Promise<void> {
    console.log(`Waiting for port ${port} on ${host} to be available...`);
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

export async function buildApp() {
    console.log("Building the app...");
    execSync("pnpm build", { stdio: "inherit" });
}

export async function startContainer() {
    console.log(`Starting pnpm preview server...`);
    previewProcess = spawn("pnpm", ["preview"], {
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
    });

    // Log output for debugging
    if (previewProcess.stdout) {
        previewProcess.stdout.on("data", (data) => {
            console.log(`  > ${data.toString().trimEnd()}`);
        });
    }
    if (previewProcess.stderr) {
        previewProcess.stderr.on("data", (data) => {
            console.log(`  > ${data.toString().trimEnd()}`);
        });
    }

    await waitForPort(TEST_PORT);

    console.log(`webserver up and running on port ${TEST_PORT}`);
}

export async function stopContainer() {
    if (previewProcess) {
        try {
            console.log("Stopping webserver...");
            process.kill(-previewProcess.pid!, "SIGTERM");
            previewProcess = null;
        } catch (error) {
            console.warn("Failed to stop webserver:", error);
        }
    }
}
