import * as path from "node:path";
import { defineConfig } from "@rspress/core";

export default defineConfig({
	root: "docs",
	title: "modAI Docs",
	lang: "en",
	logo: "/img/modai.svg",
	logoText: "modAI Docs",
	locales: [
		{
			lang: "en",
			label: "English",
			title: "modAI",
			description: "User, Admin & Developer Documentation",
		},
		{
			lang: "de",
			label: "Deutsch",
			title: "modAI",
			description: "Benutzer-, Administrator- und Entwicklerdokumentation",
		},
	],
	themeConfig: {
		socialLinks: [
			{
				icon: "github",
				mode: "link",
				content: "https://github.com/modAI-systems/modAI-chat",
			},
		],
	},
	llms: true,
	builderConfig: {
		tools: {
			rspack: {
				resolve: {
					alias: {
						"@modai-backend": path.resolve(
							__dirname,
							"../backend/omni/src/modai",
						),
						"@modai-frontend": path.resolve(
							__dirname,
							"../frontend/omni/public",
						),
					},
				},
				module: {
					rules: [
						{
							test: /\.mermaid$/,
							type: "asset/source",
						},
					],
				},
			},
		},
	},
});
