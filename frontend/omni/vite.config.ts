import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { apiChatPlugin } from "./src/server/api-chat-plugin";

export default defineConfig({
	plugins: [tailwindcss(), svelte(), apiChatPlugin()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			$lib: path.resolve(__dirname, "./src/lib"),
		},
	},
	test: {
		globals: true,
		environment: "happy-dom",
	},
});
