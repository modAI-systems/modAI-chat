import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: [["babel-plugin-react-compiler"]],
            },
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: "jsdom",
        // Include only unit/integration test files from src directory
        include: ["src/**/*.test.{ts,tsx}"],
        // Explicitly exclude playwright test files
        exclude: ["tests/**", "playwright-report/**", "test-results/**"],
    },
});
