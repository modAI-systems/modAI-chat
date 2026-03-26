import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [tailwindcss(), svelte()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            $lib: path.resolve(__dirname, "./src/lib"),
        },
    },
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:8000",
            },
        },
    },
    test: {
        globals: true,
        environment: "happy-dom",
    },
});
