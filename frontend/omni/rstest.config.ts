import { pluginSvelte } from "@rsbuild/plugin-svelte";
import { defineConfig } from "@rstest/core";

export default defineConfig({
	globals: true,
	plugins: [pluginSvelte()],
	resolve: {
		alias: {
			"@": "./src",
		},
	},
});
