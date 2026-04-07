import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const frontendRoot = process.cwd();
const sourceManifestPath = path.join(
  frontendRoot,
  "public",
  "modules_browser_only.json",
);
const targetManifestPath = path.join(frontendRoot, "public", "modules.json");

const content = await readFile(sourceManifestPath, "utf8");
const manifest = JSON.parse(content);

if (!Array.isArray(manifest.modules)) {
  throw new Error(
    "Expected modules_browser_only.json to contain a modules array",
  );
}

const externalRouteEntry = {
  id: "external-test-hello-world-route",
  path: "@/modules/external-module-test/helloWorldRouteDefinition/create",
  dependencies: {},
};

const hasModuleId = (id) => manifest.modules.some((module) => module.id === id);

if (!hasModuleId(externalRouteEntry.id)) {
  manifest.modules.push(externalRouteEntry);
}

const routingMain = manifest.modules.find(
  (module) => module.id === "routing-main",
);
if (!routingMain) {
  throw new Error("routing-main module not found in modules_browser_only.json");
}

const routes = routingMain.dependencies?.["module:routes"];
if (!Array.isArray(routes)) {
  throw new Error("routing-main.module:routes must be an array");
}

if (!routes.includes(externalRouteEntry.id)) {
  routes.push(externalRouteEntry.id);
}

await writeFile(
  targetManifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
